// src/app/api/products/[id]/characteristics/route.ts - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * УЛУЧШЕННАЯ функция обработки значений характеристик
 */
function processCharacteristicValue(
  value: any,
  characteristicName: string,
  characteristicId: number,
  dbType: 'string' | 'number'
): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nameLower = characteristicName.toLowerCase();
  console.log(`🔧 Обработка: "${characteristicName}" (ID: ${characteristicId}, тип: ${dbType}) = "${value}"`);

  // ПРЕДВАРИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ РАСПРОСТРАНЕННЫХ ПРОБЛЕМ
  let correctedValue = fixCommonIssues(characteristicName, value);

  if (dbType === 'number') {
    // Для числовых характеристик - извлекаем чистое число
    return extractPureNumber(correctedValue, characteristicName);
  } else {
    // Для строковых характеристик - добавляем единицы если нужно
    return processStringWithUnits(correctedValue, nameLower, characteristicId);
  }
}

/**
 * Исправление распространенных проблем
 */
function fixCommonIssues(characteristicName: string, value: any): any {
  const nameLower = characteristicName.toLowerCase();
  
  console.log(`🔧 Проверка проблем для "${characteristicName}": "${value}"`);
  
  // ИСПРАВЛЕНИЕ: "2 минуты" для времени зарядки -> "120 минут"
  if (nameLower.includes('время зарядки')) {
    if (value === '2 минуты' || value === '2' || value === 2) {
      console.log(`🔧 ИСПРАВЛЕНО время зарядки: "${value}" → "120 минут"`);
      return '120 минут';
    }
    if (value === '1' || value === 1) {
      console.log(`🔧 ИСПРАВЛЕНО время зарядки: "${value}" → "60 минут"`);
      return '60 минут';
    }
  }

  // ИСПРАВЛЕНИЕ: Радиус действия "10" -> "10 м"
  if (nameLower.includes('радиус') || nameLower.includes('дальность') || 
      nameLower.includes('расстояние')) {
    if (value === '10' || value === 10) {
      console.log(`🔧 ИСПРАВЛЕНО радиус: "${value}" → "10 м"`);
      return '10 м';
    }
    if (typeof value === 'number' && value < 100) {
      console.log(`🔧 ИСПРАВЛЕНО радиус: "${value}" → "${value} м"`);
      return `${value} м`;
    }
  }

  // ИСПРАВЛЕНИЕ: Длина кабеля "0.3 см" -> "30 см" 
  if (nameLower.includes('длина') && nameLower.includes('кабел')) {
    if (value === '0.3 см' || value === '0.3') {
      console.log(`🔧 ИСПРАВЛЕНА длина кабеля: "${value}" → "30 см"`);
      return '30 см';
    }
  }

  return value;
}

/**
 * Извлечение чистого числа для числовых характеристик
 */
function extractPureNumber(value: any, charName: string): number | null {
  if (typeof value === 'number') {
    console.log(`🔢 Число как есть: ${value}`);
    return value;
  }

  if (typeof value === 'string') {
    // Удаляем все пробелы и заменяем запятые на точки
    const cleaned = value.replace(/\s+/g, '').replace(/,/g, '.');
    
    // Ищем первое число в строке
    const match = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      console.log(`🔢 Извлечено число из "${value}": ${num}`);
      return isNaN(num) ? null : num;
    }
  }

  console.warn(`⚠️ Не удалось извлечь число из "${value}" для ${charName}`);
  return null;
}

/**
 * Обработка строковых характеристик с добавлением единиц
 */
function processStringWithUnits(
  value: any,
  nameLower: string,
  characteristicId: number
): string {
  let stringValue = String(value).trim();

  // Проверяем, нужны ли единицы для этой характеристики
  if (!needsUnits(nameLower)) {
    console.log(`📝 Обычная строка: "${stringValue}"`);
    return stringValue;
  }

  // Проверяем, есть ли уже единицы
  if (hasUnitsAlready(stringValue)) {
    console.log(`✅ Единицы уже есть: "${stringValue}"`);
    return stringValue;
  }

  // Извлекаем число для добавления правильных единиц
  const numMatch = stringValue.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) {
    console.log(`📝 Текст без числа: "${stringValue}"`);
    return stringValue;
  }

  const number = parseFloat(numMatch[1]);
  const processedValue = addAppropriateUnits(number, nameLower, stringValue);
  
  console.log(`🔧 Добавлены единицы: "${stringValue}" → "${processedValue}"`);
  return processedValue;
}

/**
 * Проверка нужны ли единицы измерения
 */
function needsUnits(nameLower: string): boolean {
  const unitsKeywords = [
    'время', 'срок', 'период', 'длительность',
    'емкость', 'гарантия',
    'радиус', 'дальность', 'расстояние', 'дистанция'
  ];

  return unitsKeywords.some(keyword => nameLower.includes(keyword));
}

/**
 * Проверка наличия единиц измерения в строке
 */
function hasUnitsAlready(value: string): boolean {
  const unitsPatterns = [
    // Время
    /\d+\s*(час|часов|мин|минут|сек|секунд|ч|м|с)\b/i,
    /\d+\s*(год|года|лет|месяц|месяцев|недель|дней)\b/i,
    
    // Размеры
    /\d+\s*(см|мм|м|дм|км|mm|cm)\b/i,
    /\d+\s*(дюйм|"|inch|инч)\b/i,
    
    // Емкость и прочее
    /\d+\s*(мач|mah|мa·ч|ma·h|ач|ah)\b/i,
    /\d+\s*(вт|ватт|w|квт)\b/i,
    /\d+\s*(в|вольт|v|кв)\b/i,
    /\d+\s*(гц|герц|hz|мгц|кгц|ghz|khz)\b/i,
    /\d+\s*(дб|db|децибел)\b/i,
  ];

  return unitsPatterns.some(pattern => pattern.test(value));
}

/**
 * Добавление подходящих единиц измерения
 */
function addAppropriateUnits(
  number: number,
  nameLower: string,
  originalValue: string
): string {
  console.log(`🔧 Добавляем единицы для "${originalValue}" (число: ${number})`);

  // ВРЕМЯ ЗАРЯДКИ - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
  if (nameLower.includes('время зарядки') || nameLower.includes('зарядк')) {
    if (number <= 10) {
      // 1-10 скорее всего часы
      return `${number} ${getHoursForm(number)}`;
    } else if (number <= 600) {
      // 10-600 скорее всего минуты
      return `${number} ${getMinutesForm(number)}`;
    } else {
      // Больше 600 - возможно секунды, переводим в минуты
      const minutes = Math.round(number / 60);
      return `${minutes} ${getMinutesForm(minutes)}`;
    }
  }

  // ВРЕМЯ РАБОТЫ ОТ АККУМУЛЯТОРА
  if (nameLower.includes('время работы') || nameLower.includes('автономность')) {
    if (number <= 48) {
      // До 48 - оставляем в часах
      return `${number} ${getHoursForm(number)}`;
    } else if (number <= 2880) {
      // До 2880 минут (48 часов) - переводим в часы
      const hours = Math.round(number / 60);
      return `${hours} ${getHoursForm(hours)}`;
    } else {
      // Больше - возможно секунды, переводим в часы
      const hours = Math.round(number / 3600);
      return `${hours} ${getHoursForm(hours)}`;
    }
  }

  // РАДИУС ДЕЙСТВИЯ / ДАЛЬНОСТЬ - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
  if (nameLower.includes('радиус') || nameLower.includes('дальность') || 
      nameLower.includes('расстояние') || nameLower.includes('дистанция')) {
    if (number <= 100) {
      // До 100 - скорее всего метры
      return `${number} м`;
    } else if (number <= 10000) {
      // До 10000 - скорее всего сантиметры, переводим в метры
      const meters = Math.round(number / 100);
      return `${meters} м`;
    } else {
      // Больше 10000 - возможно миллиметры, переводим в метры
      const meters = Math.round(number / 1000);
      return `${meters} м`;
    }
  }

  // ЕМКОСТЬ АККУМУЛЯТОРА
  if (nameLower.includes('емкость')) {
    if (originalValue.toLowerCase().includes('не указано') || 
        originalValue.toLowerCase().includes('нет')) {
      return "не указано";
    }
    if (number >= 100) {
      return `${number} мАч`;
    } else {
      // Возможно в Ач, переводим в мАч
      return `${number * 1000} мАч`;
    }
  }

  // ГАРАНТИЙНЫЙ СРОК
  if (nameLower.includes('гарантия') || nameLower.includes('срок')) {
    if (number >= 12) {
      const years = Math.round(number / 12);
      return `${years} ${getYearsForm(years)}`;
    } else {
      return `${number} ${getMonthsForm(number)}`;
    }
  }

  // ПО УМОЛЧАНИЮ - возвращаем исходное значение
  console.log(`⚠️ Неизвестный тип характеристики: "${nameLower}"`);
  return originalValue;
}

/**
 * Склонения для времени
 */
function getHoursForm(hours: number): string {
  const lastDigit = hours % 10;
  const lastTwoDigits = hours % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'часов';
  if (lastDigit === 1) return 'час';
  if (lastDigit >= 2 && lastDigit <= 4) return 'часа';
  return 'часов';
}

function getMinutesForm(minutes: number): string {
  const lastDigit = minutes % 10;
  const lastTwoDigits = minutes % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'минут';
  if (lastDigit === 1) return 'минуту';
  if (lastDigit >= 2 && lastDigit <= 4) return 'минуты';
  return 'минут';
}

function getYearsForm(years: number): string {
  const lastDigit = years % 10;
  const lastTwoDigits = years % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}

function getMonthsForm(months: number): string {
  const lastDigit = months % 10;
  const lastTwoDigits = months % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'месяцев';
  if (lastDigit === 1) return 'месяц';
  if (lastDigit >= 2 && lastDigit <= 4) return 'месяца';
  return 'месяцев';
}

// PUT - обновление/добавление характеристики товара
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const { characteristicId, value, action = 'update' } = await request.json();

    console.log(`🔧 ${action === 'add' ? 'Добавление' : 'Обновление'} характеристики ${characteristicId} для товара ${productId}`);

    // Находим продукт
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        subcategory: true
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Получаем характеристики категории для валидации
    let categoryCharacteristics = [];
    if (product.subcategory) {
      try {
        const categoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categories/${product.subcategory.id}/characteristics`);
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json();
          categoryCharacteristics = categoryData.characteristics || [];
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить характеристики категории:', error);
      }
    }

    // Находим информацию о характеристике в категории
    const categoryChar = categoryCharacteristics.find((c: any) => c.id === characteristicId);
    
    // Парсим существующие характеристики
    let aiData: any = { characteristics: [] };
    if (product.aiCharacteristics) {
      try {
        // ИСПРАВЛЕНИЕ: правильная обработка JSON из Prisma
        const aiCharacteristicsValue = product.aiCharacteristics;
        if (typeof aiCharacteristicsValue === 'string') {
          aiData = JSON.parse(aiCharacteristicsValue);
        } else if (aiCharacteristicsValue && typeof aiCharacteristicsValue === 'object') {
          aiData = aiCharacteristicsValue;
        }
        
        if (!aiData.characteristics) {
          aiData.characteristics = [];
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга aiCharacteristics:', error);
        aiData = { characteristics: [] };
      }
    }

    // ОБРАБОТКА С УЛУЧШЕННОЙ ЛОГИКОЙ
    let characteristicType = 'string';
    if (categoryChar) {
      characteristicType = categoryChar.type;
    }

    // Используем улучшенную функцию обработки
    const processedValue = processCharacteristicValue(
      value,
      categoryChar?.name || `Характеристика ${characteristicId}`,
      characteristicId,
      characteristicType as 'string' | 'number'
    );

    if (processedValue === null || processedValue === undefined) {
      return NextResponse.json({
        success: false,
        error: `Не удалось обработать значение "${value}" для характеристики`
      }, { status: 400 });
    }

    // Обновляем или добавляем характеристику
    const characteristicIndex = aiData.characteristics.findIndex(
      (char: any) => char.id === characteristicId
    );

    const characteristicData = {
      id: characteristicId,
      name: categoryChar?.name || `Характеристика ${characteristicId}`,
      value: processedValue,
      type: characteristicType,
      confidence: 1.0, // Пользователь уверен на 100%
      reasoning: action === 'add' ? 'Добавлено пользователем' : 'Отредактировано пользователем'
    };

    if (characteristicIndex !== -1) {
      // Обновляем существующую характеристику
      aiData.characteristics[characteristicIndex] = characteristicData;
      console.log(`✅ Обновлена характеристика ${characteristicId}: "${processedValue}"`);
    } else {
      // Добавляем новую характеристику
      aiData.characteristics.push(characteristicData);
      console.log(`➕ Добавлена характеристика ${characteristicId}: "${processedValue}"`);
    }

    // Сохраняем обновленные данные
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiCharacteristics: JSON.stringify(aiData),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Характеристика ${characteristicId} успешно ${action === 'add' ? 'добавлена' : 'обновлена'}`);

    return NextResponse.json({
      success: true,
      message: `Характеристика ${action === 'add' ? 'добавлена' : 'обновлена'}`,
      characteristic: characteristicData
    });

  } catch (error) {
    console.error('❌ Ошибка обновления характеристики:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// DELETE - удаление характеристики (РАЗРЕШЕНО для пользовательского редактирования)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const { searchParams } = new URL(request.url);
    const characteristicId = parseInt(searchParams.get('characteristicId') || '0');

    console.log(`🗑️ Удаление характеристики ${characteristicId} для товара ${productId}`);

    // Находим продукт
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Парсим существующие характеристики
    let aiData: any = { characteristics: [] };
    if (product.aiCharacteristics) {
      try {
        // ИСПРАВЛЕНИЕ: правильная обработка JSON из Prisma
        const aiCharacteristicsValue = product.aiCharacteristics;
        if (typeof aiCharacteristicsValue === 'string') {
          aiData = JSON.parse(aiCharacteristicsValue);
        } else if (aiCharacteristicsValue && typeof aiCharacteristicsValue === 'object') {
          aiData = aiCharacteristicsValue;
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга aiCharacteristics:', error);
        return NextResponse.json({
          success: false,
          error: 'Ошибка данных товара'
        }, { status: 400 });
      }
    }

    // Удаляем характеристику (пользователь может удалять любые характеристики)
    if (aiData.characteristics && Array.isArray(aiData.characteristics)) {
      const initialLength = aiData.characteristics.length;
      aiData.characteristics = aiData.characteristics.filter(
        (char: any) => char.id !== characteristicId
      );

      if (aiData.characteristics.length === initialLength) {
        return NextResponse.json({
          success: false,
          error: 'Характеристика не найдена'
        }, { status: 404 });
      }
    }

    // Сохраняем обновленные данные
    await prisma.product.update({
      where: { id: productId },
      data: {
        aiCharacteristics: JSON.stringify(aiData),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Характеристика ${characteristicId} успешно удалена пользователем`);

    return NextResponse.json({
      success: true,
      message: 'Характеристика удалена'
    });

  } catch (error) {
    console.error('❌ Ошибка удаления характеристики:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

// GET - получение ВСЕХ характеристик товара (заполненных + незаполненных)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    console.log(`📋 Получение полных характеристик товара: ${productId}`);

    const product = await prisma.product.findUnique({
      where: { id: productId },
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
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Парсим данные ИИ
    let aiData: any = { characteristics: [] };
    if (product.aiCharacteristics) {
      try {
        // ИСПРАВЛЕНИЕ: правильная обработка JSON из Prisma
        const aiCharacteristicsValue = product.aiCharacteristics;
        if (typeof aiCharacteristicsValue === 'string') {
          aiData = JSON.parse(aiCharacteristicsValue);
        } else if (aiCharacteristicsValue && typeof aiCharacteristicsValue === 'object') {
          aiData = aiCharacteristicsValue;
        }
        
        if (!aiData.characteristics) {
          aiData.characteristics = [];
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга aiCharacteristics:', error);
      }
    }

    // Парсим данные WB
    let wbData: any = {};
    if (product.wbData) {
      try {
        // ИСПРАВЛЕНИЕ: правильная обработка JSON из Prisma
        const wbDataValue = product.wbData;
        if (typeof wbDataValue === 'string') {
          wbData = JSON.parse(wbDataValue);
        } else if (wbDataValue && typeof wbDataValue === 'object') {
          wbData = wbDataValue;
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга wbData:', error);
      }
    }

    // Получаем ВСЕ характеристики категории
    const allCategoryCharacteristics = product.subcategory?.characteristics || [];
    
    // Создаем карту заполненных характеристик
    const filledCharacteristicsMap = new Map();
    aiData.characteristics.forEach((char: any) => {
      filledCharacteristicsMap.set(char.id, char);
    });

    // Фильтруем габариты для отображения в интерфейсе
    const gabaritIds = new Set([
      89008, 90630, 90607, 90608, 90652, 90653,
      11001, 11002, 72739, 90654, 90655
    ]);

    // Объединяем заполненные и незаполненные характеристики
    const allCharacteristics = allCategoryCharacteristics.map((categoryChar: any) => {
      const filledChar = filledCharacteristicsMap.get(categoryChar.wbCharacteristicId || categoryChar.id);
      
      const isGabarit = gabaritIds.has(categoryChar.wbCharacteristicId || categoryChar.id);
      
      if (filledChar) {
        // Заполненная характеристика
        return {
          id: categoryChar.wbCharacteristicId || categoryChar.id,
          name: categoryChar.name,
          value: filledChar.value,
          type: categoryChar.type,
          confidence: filledChar.confidence || 0.7,
          reasoning: filledChar.reasoning || 'Определено ИИ',
          isRequired: categoryChar.isRequired,
          isFilled: true,
          isGabarit: isGabarit,
          needsManualInput: isGabarit,
          // Дополнительная информация для редактирования
          possibleValues: categoryChar.values?.map((v: any) => ({
            id: v.wbValueId || v.id,
            value: v.value,
            displayName: v.displayName || v.value
          })) || [],
          maxLength: categoryChar.maxLength,
          minValue: categoryChar.minValue,
          maxValue: categoryChar.maxValue,
          description: categoryChar.description
        };
      } else {
        // Незаполненная характеристика
        return {
          id: categoryChar.wbCharacteristicId || categoryChar.id,
          name: categoryChar.name,
          value: null,
          type: categoryChar.type,
          confidence: 0,
          reasoning: isGabarit ? 'Требует ручного измерения' : 'Не заполнено',
          isRequired: categoryChar.isRequired,
          isFilled: false,
          isGabarit: isGabarit,
          needsManualInput: isGabarit,
          // Дополнительная информация для заполнения
          possibleValues: categoryChar.values?.map((v: any) => ({
            id: v.wbValueId || v.id,
            value: v.value,
            displayName: v.displayName || v.value
          })) || [],
          maxLength: categoryChar.maxLength,
          minValue: categoryChar.minValue,
          maxValue: categoryChar.maxValue,
          description: categoryChar.description
        };
      }
    });

    // Сортируем: сначала обязательные, потом габариты, потом заполненные, потом незаполненные
    allCharacteristics.sort((a, b) => {
      if (a.isRequired !== b.isRequired) {
        return b.isRequired ? 1 : -1; // Обязательные первыми
      }
      if (a.isGabarit !== b.isGabarit) {
        return b.isGabarit ? 1 : -1; // Габариты вторыми (для ручного заполнения)
      }
      if (a.isFilled !== b.isFilled) {
        return b.isFilled ? 1 : -1; // Заполненные третьими
      }
      return a.name.localeCompare(b.name); // Алфавитный порядок
    });

    // Статистика с учетом габаритов
    const stats = {
      total: allCharacteristics.length,
      filled: allCharacteristics.filter(c => c.isFilled).length,
      required: allCharacteristics.filter(c => c.isRequired).length,
      requiredFilled: allCharacteristics.filter(c => c.isRequired && c.isFilled).length,
      optional: allCharacteristics.filter(c => !c.isRequired).length,
      optionalFilled: allCharacteristics.filter(c => !c.isRequired && c.isFilled).length,
      gabarit: allCharacteristics.filter(c => c.isGabarit).length,
      gabaritFilled: allCharacteristics.filter(c => c.isGabarit && c.isFilled).length,
      needsManualInput: allCharacteristics.filter(c => c.needsManualInput && !c.isFilled).length
    };

    console.log(`📊 Статистика характеристик:`, stats);

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        generatedName: product.generatedName,
        seoDescription: product.seoDescription,
        status: product.status,
        price: product.price,
        category: product.subcategory ? {
          id: product.subcategory.id,
          name: product.subcategory.name,
          parentName: product.subcategory.parentCategory?.name || 'Неизвестно',
          displayName: `${product.subcategory.parentCategory?.name || 'Неизвестно'} / ${product.subcategory.name}`
        } : null,
        // ОСНОВНЫЕ ДАННЫЕ: все характеристики (заполненные + незаполненные + габариты)
        characteristics: allCharacteristics,
        // ДОПОЛНИТЕЛЬНЫЕ ДАННЫЕ
        stats,
        wbCardData: aiData.wbCardData,
        vendorCode: wbData.userVendorCode,
        barcode: wbData.barcode,
        originalPrice: wbData.originalPrice,
        discountPrice: wbData.discountPrice,
        finalPrice: wbData.finalPrice,
        hasVariantSizes: wbData.hasVariantSizes,
        variantSizes: wbData.variantSizes,
        comments: wbData.comments,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        
        // НОВАЯ ИНФОРМАЦИЯ О ГАБАРИТАХ
        gabaritInfo: {
          needsManualInput: stats.needsManualInput,
          totalGabarits: stats.gabarit,
          filledGabarits: stats.gabaritFilled,
          message: stats.needsManualInput > 0 ? 
            `Необходимо заполнить ${stats.needsManualInput} габаритных характеристик вручную` : 
            'Все габариты заполнены'
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения характеристик:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}