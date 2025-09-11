// src/app/api/products/[id]/characteristics/route.ts - ПОЛНАЯ ВЕРСИЯ

import { NextRequest, NextResponse } from 'next/server';
import { prisma, safePrismaOperation } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';

// Функция для определения числовых характеристик
function isNumericCharacteristic(name: string, id: number): boolean {
  const numericKeywords = [
    'длина', 'ширина', 'высота', 'глубина', 'вес', 'мощность', 'количество',
    'размер', 'объем', 'скорость', 'температура', 'давление', 'напряжение',
    'частота', 'диаметр', 'толщина', 'емкость', 'габарит'
  ];
  
  const numericIds = new Set([
    // Размеры и габариты
    90607, 90608, 90652, 90653, 90654, 90655,
    // Мощность и технические характеристики
    89008, 90630, 11002,
    // Количественные характеристики
    // добавьте другие известные ID числовых характеристик
  ]);
  
  // Проверка по ID
  if (numericIds.has(id)) {
    return true;
  }
  
  // Проверка по названию
  const nameLower = name.toLowerCase();
  return numericKeywords.some(keyword => nameLower.includes(keyword));
}

// GET метод - получение характеристик товара с правильным парсингом AI данных
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 [API] Получение характеристик товара: ${params.id}`);

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получение товара с полной информацией
    const product = await safePrismaOperation(
      () => prisma.product.findFirst({
        where: {
          id: params.id,
          userId: user.id
        },
        include: {
          subcategory: {
            include: {
              parentCategory: true,
              characteristics: {
                include: {
                  values: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                  }
                },
                orderBy: [
                  { isRequired: 'desc' },
                  { sortOrder: 'asc' },
                  { name: 'asc' }
                ]
              }
            }
          }
        }
      }),
      'получение товара с характеристиками'
    );

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    console.log(`✅ Товар найден: ${product.name}, категория: ${product.subcategory?.name}`);

    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Правильный парсинг ИИ данных
    let aiCharacteristics: any[] = [];
    let aiData: any = null;
    
    if (product.aiCharacteristics) {
      try {
        aiData = typeof product.aiCharacteristics === 'string' 
          ? JSON.parse(product.aiCharacteristics) 
          : product.aiCharacteristics;
        
        console.log('🔍 [Characteristics API] Структура AI данных:', Object.keys(aiData));
        
        // Проверяем разные возможные структуры данных
        aiCharacteristics = aiData.characteristics || 
                           aiData.data?.characteristics || 
                           aiData.finalResult?.characteristics ||
                           aiData.agents?.agent2?.characteristics ||
                           [];
        
        console.log(`📊 [Characteristics API] Найдено ИИ характеристик: ${aiCharacteristics.length}`);
        
        if (aiCharacteristics.length > 0) {
          console.log('🔍 [Characteristics API] Образец характеристики:', JSON.stringify(aiCharacteristics[0], null, 2));
        }
        
      } catch (error) {
        console.warn('⚠️ [Characteristics API] Ошибка парсинга AI характеристик:', error);
        console.log('📄 [Characteristics API] Сырые данные:', product.aiCharacteristics?.toString().substring(0, 200));
      }
    } else {
      console.log('⚠️ [Characteristics API] aiCharacteristics пустые или отсутствуют');
    }

    // Получение характеристик категории
    const categoryCharacteristics = product.subcategory?.characteristics || [];
    console.log(`📋 [Characteristics API] Характеристик в категории: ${categoryCharacteristics.length}`);

    // Создание карты ИИ характеристик для быстрого поиска
    const aiCharMap = new Map();
    
    aiCharacteristics.forEach((aiChar: any, index: number) => {
      console.log(`🔍 [Characteristics API] Обрабатываем AI характеристику ${index}:`, {
        id: aiChar.id,
        characteristicId: aiChar.characteristicId,
        wbCharacteristicId: aiChar.wbCharacteristicId,
        name: aiChar.name,
        value: aiChar.value,
        hasValue: !!aiChar.value
      });
      
      // Множественные варианты ID для поиска
      const possibleIds = [
        aiChar.id,
        aiChar.characteristicId,
        aiChar.wbCharacteristicId
      ].filter(id => id !== undefined && id !== null);
      
      possibleIds.forEach(id => {
        aiCharMap.set(Number(id), aiChar);
      });
      
      // Поиск по имени как fallback
      if (aiChar.name) {
        const normalizedName = aiChar.name.toLowerCase().trim();
        aiCharMap.set(normalizedName, aiChar);
      }
    });

    console.log(`📊 [Characteristics API] Создана карта AI характеристик: ${aiCharMap.size} записей`);

    // ГЛАВНОЕ ИСПРАВЛЕНИЕ: Правильное объединение данных
    const processedCharacteristics = categoryCharacteristics.map((categoryChar: any) => {
      const charId = categoryChar.wbCharacteristicId || categoryChar.id;
      const charName = categoryChar.name?.toLowerCase().trim();
      
      console.log(`🔍 [Characteristics API] Обрабатываем категорийную характеристику: ${categoryChar.name} (ID: ${charId})`);
      
      // Поиск ИИ данных
      let aiChar = aiCharMap.get(Number(charId)) || aiCharMap.get(charName);
      
      // Дополнительный поиск по частичному совпадению имени
      if (!aiChar && charName) {
        for (let [key, value] of aiCharMap.entries()) {
          if (typeof key === 'string') {
            const keyNormalized = key.replace(/\s+/g, '').toLowerCase();
            const nameNormalized = charName.replace(/\s+/g, '').toLowerCase();
            
            if (keyNormalized.includes(nameNormalized) || 
                nameNormalized.includes(keyNormalized) ||
                key.includes(charName) || 
                charName.includes(key)) {
              aiChar = value;
              console.log(`✅ [Characteristics API] Найдено совпадение по имени: "${charName}" -> "${key}"`);
              break;
            }
          }
        }
      }

      // Определение категории и значений
      let category: 'ai_filled' | 'manual_required' | 'user_protected' | 'declaration' = 'ai_filled';
      let isFilled = false;
      let value = '';
      let confidence = 0;
      let reasoning = '';

      // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Правильная обработка значений с типизацией
      if (aiChar) {
        console.log(`🔍 [Characteristics API] Найдены AI данные для ${categoryChar.name}:`, {
          value: aiChar.value,
          confidence: aiChar.confidence,
          reasoning: aiChar.reasoning,
          type: categoryChar.type
        });
        
        const aiValue = aiChar.value;
        if (aiValue !== undefined && aiValue !== null && String(aiValue).trim() !== '' && String(aiValue) !== 'null') {
          isFilled = true;
          
          // Обработка типов данных
          if (categoryChar.type === 'number' || isNumericCharacteristic(categoryChar.name, charId)) {
            // Для числовых характеристик конвертируем в число
            const numValue = parseFloat(String(aiValue).replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(numValue)) {
              value = numValue;
              console.log(`🔢 [Characteristics API] Числовая характеристика: ${categoryChar.name} = ${value}`);
            } else {
              value = String(aiValue);
              console.warn(`⚠️ [Characteristics API] Не удалось конвертировать в число: ${categoryChar.name} = "${aiValue}"`);
            }
          } else {
            value = String(aiValue);
          }
          
          confidence = aiChar.confidence || 0.85;
          reasoning = aiChar.reasoning || 'Заполнено системой ИИ';
          category = 'ai_filled';
          
          console.log(`✅ [Characteristics API] Характеристика заполнена: ${categoryChar.name} = "${value}" (тип: ${typeof value})`);
        } else {
          console.log(`⚠️ [Characteristics API] AI характеристика найдена, но значение пустое: ${categoryChar.name}`);
        }
      } else {
        console.log(`❌ [Characteristics API] AI данные не найдены для: ${categoryChar.name} (ID: ${charId})`);
      }

      // Специальные категории
      const MANUAL_INPUT_IDS = new Set([89008, 90630, 90607, 90608, 90652, 90653, 11002, 90654, 90655]);
      const PROTECTED_USER_IDS = new Set([14177441, 378533, 14177449]);
      const DECLARATION_IDS = new Set([14177472, 14177473, 14177474, 74941, 15001135, 15001136]);

      if (DECLARATION_IDS.has(charId)) {
        category = 'declaration';
        reasoning = 'НДС/Декларационные данные';
      } else if (MANUAL_INPUT_IDS.has(charId)) {
        category = 'manual_required';
        reasoning = 'Требует ручного ввода';
      } else if (PROTECTED_USER_IDS.has(charId)) {
        category = 'user_protected';
        reasoning = 'Защищенные данные';
      }

      const result = {
        id: charId,
        name: categoryChar.name,
        value: value,
        confidence: confidence,
        reasoning: reasoning,
        type: categoryChar.type === 'number' ? 'number' : 'string',
        isRequired: categoryChar.isRequired || false,
        isFilled: isFilled,
        category: category,
        source: aiChar ? 'ai_analysis' : 'not_filled',
        
        // Дополнительные данные для UI
        possibleValues: (categoryChar.values || []).map((v: any) => ({
          id: v.wbValueId || v.id,
          value: v.value,
          displayName: v.displayName || v.value
        })),
        maxLength: categoryChar.maxLength,
        minValue: categoryChar.minValue,
        maxValue: categoryChar.maxValue,
        description: categoryChar.description,
        
        // Флаги для интерфейса
        showInUI: true,
        isEditable: category === 'ai_filled'
      };

      console.log(`📝 [Characteristics API] Результат обработки ${categoryChar.name}:`, {
        isFilled: result.isFilled,
        value: result.value,
        category: result.category
      });

      return result;
    });

    // Статистика
    const filledCount = processedCharacteristics.filter(c => c.isFilled).length;
    const fillRate = processedCharacteristics.length > 0 
      ? Math.round((filledCount / processedCharacteristics.length) * 100) 
      : 0;

    const stats = {
      total: processedCharacteristics.length,
      filled: filledCount,
      required: processedCharacteristics.filter(c => c.isRequired).length,
      aiFilled: processedCharacteristics.filter(c => c.category === 'ai_filled' && c.isFilled).length,
      manualRequired: processedCharacteristics.filter(c => c.category === 'manual_required').length,
      userProtected: processedCharacteristics.filter(c => c.category === 'user_protected').length,
      declaration: processedCharacteristics.filter(c => c.category === 'declaration').length,
      fillRate: fillRate
    };

    console.log(`📊 [Characteristics API] Финальная статистика:`, stats);

    // Формирование ответа
    return NextResponse.json({
      success: true,
      characteristics: processedCharacteristics,
      stats: stats,
      productInfo: {
        id: product.id,
        name: product.name,
        generatedName: product.generatedName,
        seoDescription: product.seoDescription,
        status: product.status,
        category: product.subcategory ? {
          id: product.subcategory.id,
          name: product.subcategory.name,
          parentName: product.subcategory.parentCategory?.name
        } : null
      },
      
      // Для обратной совместимости
      aiCharacteristics: processedCharacteristics,
      allCategoryCharacteristics: categoryCharacteristics,
      
      // Дополнительная информация
      meta: {
        originalAICharacteristics: aiCharacteristics.length,
        aiCharMapSize: aiCharMap.size,
        processingMethod: product.processingMethod || 'unknown',
        hasAiData: !!aiData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Characteristics API] Ошибка получения характеристик:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT метод - обновление характеристик товара
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`✏️ [Characteristics API] Обновление характеристики товара: ${params.id}`);

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { characteristicId, value, action } = body;

    console.log('📝 [Characteristics API] Данные запроса:', { characteristicId, value, action });

    if (action === 'update' && characteristicId !== undefined && value !== undefined) {
      // Получение товара
      const product = await safePrismaOperation(
        () => prisma.product.findFirst({
          where: {
            id: params.id,
            userId: user.id
          }
        }),
        'получение товара для обновления'
      );

      if (!product) {
        return NextResponse.json({
          success: false,
          error: 'Товар не найден'
        }, { status: 404 });
      }

      // Парсинг существующих AI характеристик
      let aiData: any = {};
      if (product.aiCharacteristics) {
        try {
          aiData = typeof product.aiCharacteristics === 'string'
            ? JSON.parse(product.aiCharacteristics)
            : product.aiCharacteristics;
        } catch (error) {
          console.warn('⚠️ [Characteristics API] Ошибка парсинга AI характеристик:', error);
          aiData = { characteristics: [] };
        }
      }

      // Получение массива характеристик
      const characteristics = aiData.characteristics || [];
      console.log(`📊 [Characteristics API] Найдено характеристик: ${characteristics.length}`);

      // Поиск характеристики для обновления
      const existingIndex = characteristics.findIndex((char: any) => 
        char.id === characteristicId || 
        char.id === parseInt(characteristicId) ||
        char.characteristicId === characteristicId ||
        char.characteristicId === parseInt(characteristicId)
      );

      if (existingIndex >= 0) {
        // Обновление существующей характеристики
        console.log(`✏️ [Characteristics API] Обновляем характеристику: ${characteristics[existingIndex].name}`);
        characteristics[existingIndex] = {
          ...characteristics[existingIndex],
          value: value,
          isFilled: !!value,
          updatedAt: new Date().toISOString(),
          updatedBy: 'user'
        };
      } else {
        // Добавление новой характеристики
        console.log(`➕ [Characteristics API] Добавляем новую характеристику с ID: ${characteristicId}`);
        characteristics.push({
          id: parseInt(characteristicId) || characteristicId,
          characteristicId: parseInt(characteristicId) || characteristicId,
          name: `Характеристика ${characteristicId}`,
          value: value,
          confidence: 1.0,
          reasoning: 'Добавлено пользователем',
          source: 'user_input',
          type: 'string',
          isFilled: !!value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'user'
        });
      }

      // Обновление данных с системной информацией
      const updatedAiData = {
        ...aiData,
        characteristics: characteristics,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.id,
        systemVersion: aiData.systemVersion || 'user_updated_v1',
        userModifications: (aiData.userModifications || 0) + 1
      };

      // Сохранение в базу данных
      await safePrismaOperation(
        () => prisma.product.update({
          where: { id: params.id },
          data: {
            aiCharacteristics: JSON.stringify(updatedAiData),
            updatedAt: new Date()
          }
        }),
        'обновление характеристик в БД'
      );

      console.log('✅ [Characteristics API] Характеристика обновлена успешно');

      // Подсчет статистики после обновления
      const filledCharacteristics = characteristics.filter((c: any) => c.isFilled);
      const fillRate = characteristics.length > 0 
        ? Math.round((filledCharacteristics.length / characteristics.length) * 100) 
        : 0;

      return NextResponse.json({
        success: true,
        message: 'Характеристика обновлена успешно',
        data: {
          characteristicId,
          value,
          totalCharacteristics: characteristics.length,
          filledCharacteristics: filledCharacteristics.length,
          fillRate: fillRate,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неверные параметры запроса. Ожидается: { action: "update", characteristicId: number, value: string }'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ [Characteristics API] Ошибка обновления характеристик:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE метод - удаление характеристики
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗑️ [Characteristics API] Удаление характеристики товара: ${params.id}`);

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characteristicId = searchParams.get('characteristicId');

    if (!characteristicId) {
      return NextResponse.json({
        success: false,
        error: 'Не указан ID характеристики для удаления'
      }, { status: 400 });
    }

    // Получение товара
    const product = await safePrismaOperation(
      () => prisma.product.findFirst({
        where: {
          id: params.id,
          userId: user.id
        }
      }),
      'получение товара для удаления характеристики'
    );

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Парсинг AI характеристик
    let aiData: any = {};
    if (product.aiCharacteristics) {
      try {
        aiData = typeof product.aiCharacteristics === 'string'
          ? JSON.parse(product.aiCharacteristics)
          : product.aiCharacteristics;
      } catch (error) {
        console.warn('⚠️ [Characteristics API] Ошибка парсинга AI характеристик:', error);
        return NextResponse.json({
          success: false,
          error: 'Ошибка обработки характеристик товара'
        }, { status: 500 });
      }
    }

    const characteristics = aiData.characteristics || [];
    const initialCount = characteristics.length;

    // Удаление характеристики
    const filteredCharacteristics = characteristics.filter((char: any) => 
      char.id !== parseInt(characteristicId) && 
      char.id !== characteristicId &&
      char.characteristicId !== parseInt(characteristicId) &&
      char.characteristicId !== characteristicId
    );

    if (filteredCharacteristics.length === initialCount) {
      return NextResponse.json({
        success: false,
        error: 'Характеристика не найдена'
      }, { status: 404 });
    }

    // Обновление данных
    const updatedAiData = {
      ...aiData,
      characteristics: filteredCharacteristics,
      lastUpdated: new Date().toISOString(),
      deletedBy: user.id,
      userDeletions: (aiData.userDeletions || 0) + 1
    };

    // Сохранение в базу данных
    await safePrismaOperation(
      () => prisma.product.update({
        where: { id: params.id },
        data: {
          aiCharacteristics: JSON.stringify(updatedAiData),
          updatedAt: new Date()
        }
      }),
      'удаление характеристики из БД'
    );

    console.log(`✅ [Characteristics API] Характеристика ${characteristicId} удалена`);

    return NextResponse.json({
      success: true,
      message: 'Характеристика успешно удалена',
      data: {
        deletedCharacteristicId: characteristicId,
        remainingCharacteristics: filteredCharacteristics.length,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Characteristics API] Ошибка удаления характеристики:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}