// src/app/api/products/[id]/publish/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМ API URL И ТАЙМАУТАМИ
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../../lib/config/wbApiConfig';
import { WB_COLORS } from '../../../../../../lib/config/wbColors';
import { wbApiService } from '../../../../../../lib/services/wbApiService';
import { UnifiedAISystem } from '../../../../../../lib/services/unifiedAISystem';

// POST метод для сохранения финальных данных и публикации товара
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🚀 [Publish] Начало обработки запроса публикации товара`);
    console.log(`🚀 [Publish] Product ID: ${params.id}`);
    console.log(`🚀 [Publish] Request method: ${request.method}`);
    console.log(`🚀 [Publish] Request headers:`, {
      'content-type': request.headers.get('content-type'),
      'content-length': request.headers.get('content-length')
    });

    // Авторизация пользователя
    let user = null;
    try {
      user = await AuthService.getCurrentUser();
    } catch (authError) {
      console.error('❌ Ошибка авторизации:', authError);
      return NextResponse.json({ 
        error: 'Ошибка авторизации',
        details: authError instanceof Error ? authError.message : 'Неизвестная ошибка'
      }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    // Получаем данные от пользователя
    let requestBody: any = {};
    try {
      // Безопасно получаем тело запроса
      let bodyText = '';
      try {
        bodyText = await request.text();
      } catch (textError) {
        console.warn('⚠️ [Publish] Не удалось получить текст тела запроса:', textError);
        bodyText = '';
      }
      
      // Парсим JSON только если есть текст
      if (bodyText && bodyText.trim()) {
        try {
          requestBody = JSON.parse(bodyText);
        } catch (jsonError) {
          console.error('❌ [Publish] Ошибка парсинга JSON:', jsonError);
          console.error('❌ [Publish] Текст тела:', bodyText.substring(0, 200));
          requestBody = {};
        }
      } else {
        console.warn('⚠️ [Publish] Получено пустое тело запроса');
        requestBody = {};
      }
    } catch (err) {
      console.error('❌ [Publish] Неожиданная ошибка при обработке тела запроса:', err);
      requestBody = {};
    }

    const {
      characteristics = [],
      seoTitle = '',
      seoDescription = '',
      finalStatus = 'READY', // READY или PUBLISHED
      action // Новый параметр для определения типа операции
    } = requestBody;

    // Если указан action - это последовательная операция с WB
    if (action) {
      // Получаем товар и кабинет для новых операций
      const operationProduct = await safePrismaOperation(
        () => prisma.product.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
            subcategoryId: true,
            dimensions: true,
            originalImage: true,
            userId: true,
            wbData: true,
            subcategory: {
              select: {
                id: true,
                name: true,
                wbSubjectId: true
              }
            },
            productCabinets: {
              where: { isSelected: true },
              select: {
                cabinetId: true,
                cabinet: {
                  select: {
                    id: true,
                    name: true,
                    apiToken: true,
                    isActive: true
                  }
                }
              }
            }
          }
        }),
        'получение товара для операции'
      );

      if (!operationProduct) {
        return NextResponse.json({
          error: 'Товар не найден'
        }, { status: 404 });
      }

      // Проверяем права доступа
      if (operationProduct.userId !== user.id) {
        return NextResponse.json({
          error: 'Нет прав для выполнения операции с этим товаром'
        }, { status: 403 });
      }

      // Проверяем наличие выбранного кабинета
      if (!operationProduct.productCabinets || operationProduct.productCabinets.length === 0) {
        return NextResponse.json({
          error: 'Не указан кабинет для операции'
        }, { status: 400 });
      }

      const operationCabinet = operationProduct.productCabinets[0];
      const cabinet = operationCabinet.cabinet;

      if (!cabinet || !cabinet.isActive) {
        return NextResponse.json({
          error: 'Кабинет не найден или неактивен'
        }, { status: 400 });
      }

      if (!cabinet.apiToken) {
        return NextResponse.json({
          error: 'У кабинета отсутствует API токен для Wildberries'
        }, { status: 400 });
      }

      switch (action) {
        case 'create-product':
          return await handleCreateProduct(requestBody.data, operationProduct, cabinet);
        case 'set-discount':
          return await handleSetDiscount(requestBody.data, operationProduct, cabinet);
        case 'set-stock':
          return await handleSetStock(requestBody.data, operationProduct, cabinet);
        case 'create-full-cycle':
          return await handleCreateFullCycle(requestBody.data, operationProduct, cabinet);
        default:
          return NextResponse.json({
            error: 'Неизвестная операция'
          }, { status: 400 });
      }
    }

    console.log(`📥 [Publish] Получены финальные данные пользователя:`);
    console.log(`   - Характеристик: ${characteristics.length}`);
    console.log(`   - SEO заголовок: "${seoTitle}"`);
    console.log(`   - SEO описание: ${seoDescription.substring(0, 100)}...`);
    console.log(`   - Статус: ${finalStatus}`);

    // Получаем товар из базы данных
    const product = await safePrismaOperation(
      () => prisma.product.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          subcategoryId: true,
          dimensions: true,
          originalImage: true,
          userId: true,
          wbData: true, // Добавляем wbData для получения originalPrice и discountPrice
          stock: true, // Добавляем stock для установки остатков
          subcategory: { // Добавляем информацию о подкатегории
            select: {
              id: true,
              name: true,
              wbSubjectId: true
            }
          },
          productCabinets: {
            where: { isSelected: true },
            select: {
              cabinetId: true,
              cabinet: {
                select: {
                  id: true,
                  name: true,
                  apiToken: true,
                  isActive: true
                }
              }
            }
          }
        }
      }),
      'получение товара для сохранения'
    );

    if (!product) {
      return NextResponse.json({ 
        error: 'Товар не найден' 
      }, { status: 404 });
    }

    // Проверяем права доступа
    if (product.userId !== user.id) {
      return NextResponse.json({ 
        error: 'Нет прав для публикации этого товара' 
      }, { status: 403 });
    }

    // Проверяем финальные данные пользователя
    console.log(`📋 [Publish] Проверка финальных данных:`);
    console.log(`   - seoTitle: "${seoTitle}" (${seoTitle ? 'OK' : 'ПУСТО'})`);
    console.log(`   - seoDescription: "${seoDescription?.substring(0, 50)}..." (${seoDescription ? 'OK' : 'ПУСТО'})`);
    console.log(`   - characteristics: ${characteristics.length} (${characteristics.length > 0 ? 'OK' : 'ПУСТО'})`);
    
    if (!seoTitle || seoTitle.trim() === '') {
      console.error(`❌ [Publish] Ошибка: SEO заголовок не указан`);
      return NextResponse.json({ 
        error: 'Не указан SEO заголовок товара',
        details: 'Пожалуйста, укажите название товара'
      }, { status: 400 });
    }

    if (!seoDescription || seoDescription.trim() === '') {
      console.error(`❌ [Publish] Ошибка: SEO описание не указано`);
      return NextResponse.json({ 
        error: 'Не указано SEO описание товара',
        details: 'Пожалуйста, укажите описание товара'
      }, { status: 400 });
    }

    // Проверяем что есть хотя бы одна заполненная характеристика
    const filledCharacteristics = characteristics.filter((char: any) => {
      const hasValue = char.value !== null && 
                      char.value !== undefined && 
                      char.value !== '' &&
                      (typeof char.value === 'string' ? char.value.trim() !== '' : true);
      return hasValue;
    });
    
    if (filledCharacteristics.length === 0) {
      console.error(`❌ [Publish] Ошибка: Нет заполненных характеристик`);
      return NextResponse.json({ 
        error: 'Не указаны характеристики товара',
        details: 'Пожалуйста, укажите хотя бы одну характеристику'
      }, { status: 400 });
    }
    
    console.log(`✅ [Publish] Найдено заполненных характеристик: ${filledCharacteristics.length} из ${characteristics.length}`);

    // Проверяем наличие выбранного кабинета
    if (!product.productCabinets || product.productCabinets.length === 0) {
      return NextResponse.json({ 
        error: 'Не указан кабинет для публикации' 
      }, { status: 400 });
    }

    const selectedCabinet = product.productCabinets[0];
    const cabinet = selectedCabinet.cabinet;

    if (!cabinet || !cabinet.isActive) {
      return NextResponse.json({ 
        error: 'Кабинет не найден или неактивен' 
      }, { status: 400 });
    }

    if (!cabinet.apiToken) {
      return NextResponse.json({ 
        error: 'У кабинета отсутствует API токен для Wildberries' 
      }, { status: 400 });
    }

    // ЭТАП 1: Сохраняем финальные данные пользователя в БД
    console.log('💾 [Publish] Сохранение финальных данных пользователя в БД...');
    
    // 🔥 Сохраняем ТОЛЬКО заполненные характеристики
    const finalAiCharacteristics = JSON.stringify({
      characteristics: filledCharacteristics,
      seoTitle: seoTitle,
      seoDescription: seoDescription,
      qualityMetrics: {
        characteristicsFillRate: Math.round((filledCharacteristics.length / characteristics.length) * 100),
        seoDescriptionLength: seoDescription.length,
        seoTitleLength: seoTitle.length,
        isQualityAcceptable: true,
        overallScore: 95
      },
      systemVersion: 'user_confirmed_v1',
      processedAt: new Date().toISOString(),
      userConfirmedAt: new Date().toISOString(),
      source: 'user_final_confirmation'
    });

    // Обновляем товар с финальными данными
    const updatedProduct = await safePrismaOperation(
      () => prisma.product.update({
        where: { id: params.id },
        data: {
          generatedName: seoTitle,
          seoDescription: seoDescription,
          aiCharacteristics: finalAiCharacteristics,
          status: finalStatus,
          updatedAt: new Date()
        }
      }),
      'сохранение финальных данных пользователя'
    );

    if (!updatedProduct) {
      return NextResponse.json({ 
        error: 'Ошибка сохранения данных в БД' 
      }, { status: 500 });
    }

    console.log('✅ [Publish] Финальные данные успешно сохранены в БД');

    // ЭТАП 2: Публикация на Wildberries (если статус PUBLISHED)
    if (finalStatus === 'PUBLISHED') {
      console.log('📋 [WB Publish] Подготовка данных для Wildberries...');

      // Генерируем vendorCode и barcode на основе ID товара
      const vendorCode = `PRD${product.id.slice(-8).toUpperCase()}`;
      const barcode = `2200000${product.id.slice(-6)}${Math.floor(Math.random() * 10)}`;

      // Получаем цены из wbData
      const wbData = product.wbData as any;
      const originalPrice = wbData?.originalPrice || product.price;
      const discountPrice = wbData?.discountPrice || product.price;
      
      console.log(`💰 [WB Publish] Цены товара:`);
      console.log(`   - Оригинальная цена: ${originalPrice}₽ (отправляем ${Math.round(originalPrice)} руб)`);
      console.log(`   - Цена со скидкой: ${discountPrice}₽ (отправляем ${Math.round(discountPrice)} руб)`);
      console.log(`   - product.price: ${product.price}₽ (для сравнения)`);

      // Получаем правильный wbSubjectId из подкатегории
      const wbSubjectId = product.subcategory?.wbSubjectId || product.subcategoryId;
      console.log(`🏷️ [WB Publish] Категория товара:`);
      console.log(`   - Подкатегория: ${product.subcategory?.name || 'Неизвестно'} (ID: ${product.subcategoryId})`);
      console.log(`   - WB Subject ID: ${wbSubjectId}`);

      // Извлекаем бренд из характеристик
      const brandChar = characteristics.find((char: any) => 
        char.name && (
          char.name.toLowerCase().includes('бренд') ||
          char.name.toLowerCase().includes('brand') ||
          char.name.toLowerCase().includes('производитель') ||
          char.name.toLowerCase().includes('торговая марка')
        )
      );
      // Исправляем проблему с брендом: допускаем только явный бренд, "Нет бренда" или пусто
      let brand = (brandChar?.value || wbData?.brand || '').toString().trim();
      const brandLower = brand.toLowerCase();
      // Нормализация запрещенных/служебных значений
      if (!brand || ['не указан','generic','noname','нет бренда','unknown','n/a','na'].includes(brandLower)) {
        // По бизнес-правилу принимаем или пустую строку, или фиксированное значение "Нет бренда"
        brand = wbData?.brand === 'Нет бренда' ? 'Нет бренда' : '';
      }
      console.log(`🏷️ [WB Publish] Бренд товара: "${brand || '(пусто)'}" ${brandChar ? '(из характеристик)' : '(нормализован/по умолчанию)'}`);

      // Получаем габариты из БД или используем значения по умолчанию
      const productDimensions = product.dimensions as any;
      const length = productDimensions?.length || 10;
      const width = productDimensions?.width || 10;
      const height = productDimensions?.height || 10;
      const weight = productDimensions?.weight || 0.5; // вес в кг
      
      console.log(`📦 [WB Publish] Габариты товара: ${length}x${width}x${height} см, вес: ${weight} кг`);

      // Подготавливаем данные для Wildberries API в правильном формате
      const wbProductData = {
        subjectID: wbSubjectId,
        variants: [{
          vendorCode: vendorCode,
          title: seoTitle,
          description: seoDescription, 
          brand: brand,
          dimensions: {
            length: length,
            width: width,
            height: height,
            weightBrutto: Math.round(weight * 1000) // переводим кг в граммы
          },
          // 🔥 Используем ТОЛЬКО заполненные характеристики
          characteristics: filledCharacteristics.map((char: any) => {
            let processedValue = char.value;
            
            // Обработка числовых характеристик - ИСПРАВЛЕНО
            if (char.type === 'number' || char.type === 'integer' || char.type === 'float') {
              if (typeof char.value === 'string') {
                // Убираем все нечисловые символы, кроме точки, запятой и минуса
                const cleanedValue = char.value.replace(/[^\d.,\-]/g, '').replace(',', '.');
                const numValue = parseFloat(cleanedValue);
                if (!isNaN(numValue) && isFinite(numValue)) {
                  processedValue = numValue;
                  console.log(`🔢 [WB Publish] Конвертация числовой характеристики ${char.name}: "${char.value}" → ${processedValue}`);
                } else {
                  console.warn(`⚠️ [WB Publish] Не удалось преобразовать в число: ${char.name} = "${char.value}"`);
                  processedValue = null; // Устанавливаем null для некорректных значений
                }
              } else if (typeof char.value === 'number') {
                processedValue = char.value;
              } else if (char.value === null || char.value === undefined) {
                processedValue = null;
              } else {
                // Пытаемся преобразовать другие типы
                const numValue = parseFloat(String(char.value));
                if (!isNaN(numValue) && isFinite(numValue)) {
                  processedValue = numValue;
                } else {
                  console.warn(`⚠️ [WB Publish] Не удалось преобразовать в число: ${char.name} = "${char.value}"`);
                  processedValue = null;
                }
              }
            }
            
            // Валидация цветов с использованием базы цветов WB
            if (char.name && char.name.toLowerCase().includes('цвет') && typeof processedValue === 'string') {
              const originalColor = processedValue;
              processedValue = processedValue.trim().toLowerCase();
              
              // Проверяем, есть ли цвет в базе WB (регистронезависимый поиск)
              const validColor = WB_COLORS.UTILS.findByName(processedValue) || 
                                WB_COLORS.UTILS.findByName(originalColor);
              
              if (validColor) {
                processedValue = validColor.value;
                console.log(`✅ [WB Publish] Найден валидный цвет: "${originalColor}" → "${processedValue}"`);
              } else {
                // Пытаемся найти похожий цвет
                const allColors = WB_COLORS.UTILS.getAllColors();
                const similarColor = allColors.find(color => 
                  color.value.toLowerCase().includes(processedValue) || 
                  processedValue.includes(color.value.toLowerCase())
                );
                
                if (similarColor) {
                  processedValue = similarColor.value;
                  console.log(`🔄 [WB Publish] Найден похожий цвет: "${originalColor}" → "${processedValue}"`);
                } else {
                  // Если не найден, оставляем как есть, но предупреждаем
                  processedValue = originalColor.trim();
                  console.warn(`⚠️ [WB Publish] Цвет не найден в базе WB: "${originalColor}". Оставляем как есть.`);
                }
              }
              
              // Проверяем длину
              if (processedValue.length > 50) {
                console.warn(`⚠️ [WB Publish] Цвет слишком длинный: ${processedValue}`);
                processedValue = processedValue.substring(0, 50);
              }
            }
            
            // Очищаем массив от null/undefined значений и правильно обрабатываем числа
            let finalValue;
            
            // Пропускаем характеристики с некорректными значениями
            if (processedValue === null || processedValue === undefined) {
              console.warn(`⚠️ [WB Publish] Пропускаем характеристику ${char.name} с некорректным значением`);
              return null; // Возвращаем null для фильтрации
            }
            
            // ✅ ВАЖНО: Согласно документации WB API:
            // - Для числовых характеристик: value должно быть ЧИСЛОМ (не в массиве)
            // - Для строковых характеристик: value должно быть МАССИВОМ строк
            if (char.type === 'number' || char.type === 'integer' || char.type === 'float') {
              // Для числовых характеристик: просто число
              const numValue = Array.isArray(processedValue) ? processedValue[0] : processedValue;
              finalValue = typeof numValue === 'number' ? numValue : Number(numValue);
              
              return {
                id: char.id,
                value: finalValue
              };
            } else {
              // Для строковых характеристик: массив строк
              finalValue = Array.isArray(processedValue) ? processedValue : [String(processedValue)];
              
              const filteredValue = finalValue.filter((v: any) => 
                v != null && 
                String(v).trim() !== '' && 
                String(v).toLowerCase() !== 'null' &&
                String(v).toLowerCase() !== 'undefined'
              );
              
              return {
                id: char.id,
                value: filteredValue.length > 0 ? filteredValue : [processedValue]
              };
            }
          }).filter((char: any) => {
            // Исключаем null значения (характеристики с некорректными данными)
            if (!char) return false;
            
            // Для числовых характеристик: проверяем что value - это число
            if (typeof char.value === 'number') {
              return !isNaN(char.value);
            }
            
            // Для строковых характеристик: проверяем что value - это массив с непустыми значениями
            if (!char.value || !Array.isArray(char.value) || char.value.length === 0) return false;
            return char.value.some((v: any) => 
              v != null && 
              String(v).trim() !== '' && 
              String(v).toLowerCase() !== 'null' &&
              String(v).toLowerCase() !== 'undefined'
            );
          }),
          sizes: [{
            price: Math.round(discountPrice), // Цена со скидкой в рублях
            skus: [barcode]
          }]
        }]
      };

      console.log('📤 [WB Publish] Отправка данных в Wildberries API...');
      console.log('🔍 [WB Publish] Данные товара:', JSON.stringify(wbProductData, null, 2));

      try {
        console.log('📤 [WB API] Отправка запроса к Wildberries API...');
        
        // ИСПРАВЛЕНО: Используем правильный URL и увеличенный таймаут
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Увеличен до 60 секунд
        
        const wbApiResponse = await fetch(`${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/cards/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': cabinet.apiToken,
            'User-Agent': 'WB-AI-Assistant/2.0',
            'Accept': 'application/json'
          },
          body: JSON.stringify([wbProductData]), // WB API ожидает массив карточек
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`📊 [WB API] Статус ответа: ${wbApiResponse.status}`);
        
        if (!wbApiResponse.ok) {
          const errorText = await wbApiResponse.text();
          console.error(`❌ [WB API] Ошибка ${wbApiResponse.status}:`, errorText);
          
          // Обработка специфических ошибок WB
          let errorMessage = 'Ошибка публикации на Wildberries';
          let parsedError = null;
          
          try {
            if (errorText && errorText.trim()) {
              parsedError = JSON.parse(errorText);
            }
          } catch (e) {
            console.warn('Не удалось распарсить ответ об ошибке');
          }
          
          if (wbApiResponse.status === 401) {
            errorMessage = 'Неверный API токен для Wildberries. Проверьте настройки кабинета.';
          } else if (wbApiResponse.status === 400) {
            if (parsedError?.errors) {
              errorMessage = `Неверные данные товара: ${JSON.stringify(parsedError.errors)}`;
            } else {
              errorMessage = 'Неверные данные товара для Wildberries. Проверьте характеристики.';
            }
          } else if (wbApiResponse.status === 403) {
            errorMessage = 'Нет прав для создания товаров на Wildberries.';
          } else if (wbApiResponse.status === 429) {
            errorMessage = 'Превышен лимит запросов к Wildberries. Попробуйте позже.';
          }

          // 🔧 Автоисправление ИИ: пробуем скорректировать данные и вернуть исправленную карточку
          let aiSuggestedCard: any = null;
          let aiFixInfo: any = null;
          try {
            const ai = new UnifiedAISystem();
            const aiResult = await ai.analyzeProductComplete({
              productName: seoTitle || product.name,
              price: product.price,
              categoryId: product.subcategoryId,
              images: Array.isArray(product.originalImage) ? product.originalImage : (product.originalImage ? [product.originalImage] : [])
            } as any);

            // Собираем исправленные характеристики
            const fixedCharacteristics = (aiResult.characteristics || []).map((char: any) => {
              // ✅ ВАЖНО: Числовые значения передаем как ЧИСЛО (не в массиве), строки как МАССИВ строк
              if (char.detectedType === 'number' && char.value !== null && char.value !== undefined && char.value !== '') {
                return { id: char.id, value: typeof char.value === 'number' ? char.value : Number(char.value) };
              }
              if (char.value === null || char.value === undefined || String(char.value).trim() === '') {
                return null;
              }
              // Для строковых значений - всегда массив
              const finalValue = Array.isArray(char.value) ? char.value : [char.value];
              const filteredValue = finalValue.filter((v: any) => 
                v != null && 
                String(v).trim() !== '' && 
                String(v).toLowerCase() !== 'null' &&
                String(v).toLowerCase() !== 'undefined'
              );
              return filteredValue.length > 0 ? { id: char.id, value: filteredValue } : null;
            }).filter((char: any) => char !== null);

            aiFixInfo = {
              quality: aiResult.qualityMetrics,
              recommendations: aiResult.recommendations,
              warnings: aiResult.warnings
            };
          } catch (aiError) {
            console.warn('⚠️ Не удалось автоматически исправить данные ИИ:', aiError);
          }
          
          // Сохраняем ошибку в БД
          await safePrismaOperation(
            () => prisma.product.update({
              where: { id: params.id },
              data: {
                errorMessage: errorMessage,
                wbData: JSON.stringify({
                  error: errorMessage,
                  errorDetails: parsedError || errorText,
                  errorAt: new Date().toISOString(),
                  cabinet: cabinet.name,
                  vendorCode: vendorCode,
                  barcode: barcode,
                  productData: wbProductData,
                  aiSuggestedCard,
                  aiFixInfo,
                  apiStatus: 'failed'
                })
              }
            }),
            'сохранение ошибки WB API'
          );
          
          return NextResponse.json({ 
            error: errorMessage,
            details: parsedError || errorText,
            wbStatus: wbApiResponse.status,
            productSaved: true,
            aiSuggestedCard,
            aiFixInfo
          }, { status: 400 });
        }
        
        let wbResponseData: any = {};
        const responseText = await wbApiResponse.text();
        
        // Парсим JSON только если ответ не пустой
        if (responseText && responseText.trim()) {
          try {
            wbResponseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ [WB API] Ошибка парсинга JSON ответа:', parseError);
            console.error('❌ [WB API] Текст ответа:', responseText);
            return NextResponse.json({ 
              error: 'Ошибка парсинга ответа от Wildberries',
              details: 'Сервер вернул некорректный JSON'
            }, { status: 500 });
          }
        } else {
          console.warn('⚠️ [WB API] Получен пустой ответ от Wildberries');
          wbResponseData = {};
        }
        
        console.log('✅ [WB API] Ответ от Wildberries:', JSON.stringify(wbResponseData, null, 2));
        console.log('🔍 [WB API] ПОЛНЫЙ ОТВЕТ для отладки:', JSON.stringify(wbResponseData, null, 4));
        
        // 🔍 ПРОВЕРКА НА СКРЫТЫЕ ОШИБКИ ВАЛИДАЦИИ
        // WB API может вернуть статус 200, но с ошибками в разных полях
        let hasValidationErrors = false;
        let validationErrors: string[] = [];
        let detailedErrors: Array<{ field: string; error: string; characteristicName?: string }> = [];
        
        // 🔍 ВАЖНО: Согласно документации WB, если товар не создан, нужно проверить ошибки через отдельный эндпоинт
        // https://dev.wildberries.ru/en/openapi/work-with-products#tag/Categories-Subjects-and-Characteristics
        
        // Проверяем additionalErrors
        if (wbResponseData.additionalErrors && Object.keys(wbResponseData.additionalErrors).length > 0) {
          hasValidationErrors = true;
          console.warn('⚠️ [WB API] Обнаружены ошибки в additionalErrors:', wbResponseData.additionalErrors);
          
          // Извлекаем ошибки из additionalErrors с сохранением структуры
          for (const [vendorCode, errors] of Object.entries(wbResponseData.additionalErrors)) {
            if (Array.isArray(errors)) {
              errors.forEach((error: any) => {
                if (typeof error === 'string') {
                  validationErrors.push(error);
                  detailedErrors.push({ field: 'unknown', error: error });
                } else if (error.field && error.error) {
                  // Сохраняем структурированную ошибку
                  const errorMessage = `${error.field}: ${error.error}`;
                  validationErrors.push(errorMessage);
                  detailedErrors.push({
                    field: error.field,
                    error: error.error,
                    characteristicName: error.characteristicName || error.field
                  });
                } else if (error.message) {
                  validationErrors.push(error.message);
                  detailedErrors.push({ field: 'unknown', error: error.message });
                }
              });
            }
          }
        }
        
        // Проверяем errorText
        if (wbResponseData.errorText && wbResponseData.errorText.trim()) {
          hasValidationErrors = true;
          validationErrors.push(wbResponseData.errorText);
          detailedErrors.push({ field: 'general', error: wbResponseData.errorText });
          console.warn('⚠️ [WB API] Обнаружена ошибка в errorText:', wbResponseData.errorText);
        }
        
        // Проверяем data.errors (может быть вложенный массив ошибок)
        if (wbResponseData.data?.errors && Array.isArray(wbResponseData.data.errors)) {
          hasValidationErrors = true;
          wbResponseData.data.errors.forEach((error: any) => {
            if (typeof error === 'string') {
              validationErrors.push(error);
              detailedErrors.push({ field: 'unknown', error: error });
            } else if (error.message) {
              validationErrors.push(error.message);
              detailedErrors.push({ field: error.field || 'unknown', error: error.message });
            }
          });
          console.warn('⚠️ [WB API] Обнаружены ошибки в data.errors:', wbResponseData.data.errors);
        }
        
        // Извлекаем ID созданного товара или taskId
        let wbProductId = null;
        let wbTaskId = null;
        
        if (wbResponseData) {
          // WB API может вернуть taskId для асинхронной обработки
          if (wbResponseData.taskId) {
            wbTaskId = wbResponseData.taskId;
            console.log(`📋 [WB API] Получен taskId: ${wbTaskId}`);
          }
          
          // Или сразу ID товара
          if (wbResponseData.data && Array.isArray(wbResponseData.data) && wbResponseData.data.length > 0) {
            const firstItem = wbResponseData.data[0];
            wbProductId = firstItem.nmID || firstItem.nmId || firstItem.id;
            console.log(`📦 [WB API] Получен ID товара: ${wbProductId}`);
          }
        }
        
        // 🔍 ВСЕГДА ЗАПРАШИВАЕМ ДЕТАЛЬНЫЕ ОШИБКИ ЕСЛИ ТОВАР НЕ СОЗДАН (независимо от additionalErrors)
        if (!wbProductId && !wbTaskId) {
          console.log('🔍 [WB API] Товар не создан, но additionalErrors пусто. Запрашиваем детальные ошибки...');
          
          try {
            const errorListResponse = await fetch(`${WB_API_CONFIG.BASE_URLS.CONTENT}${WB_API_CONFIG.ENDPOINTS.GET_ERRORS}?locale=ru`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': cabinet.apiToken,
                'User-Agent': 'WB-AI-Assistant/2.0',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                cursor: { limit: 1 },
                order: { ascending: false }
              })
            });
            
            if (errorListResponse.ok) {
              let errorListData: any = {};
              const errorListText = await errorListResponse.text();
              
              if (errorListText && errorListText.trim()) {
                try {
                  errorListData = JSON.parse(errorListText);
                } catch (parseError) {
                  console.error('❌ [WB API] Ошибка парсинга списка ошибок:', parseError);
                  errorListData = {};
                }
              }
              
              console.log('📋 [WB API] Получен список ошибок:', JSON.stringify(errorListData, null, 2));
              
              // Извлекаем ошибки для нашего vendorCode
              if (errorListData.data?.items && Array.isArray(errorListData.data.items)) {
                for (const batch of errorListData.data.items) {
                  if (batch.errors && batch.errors[vendorCode]) {
                    const errors = batch.errors[vendorCode];
                    if (Array.isArray(errors)) {
                      hasValidationErrors = true;
                      errors.forEach((errorText: string) => {
                        validationErrors.push(errorText);
                        
                        // Пытаемся извлечь название характеристики из текста ошибки
                        const characteristicMatch = errorText.match(/характеристики (.+?)(?:\s|$)/);
                        const characteristicName = characteristicMatch ? characteristicMatch[1] : 'unknown';
                        
                        detailedErrors.push({
                          field: characteristicName,
                          error: errorText,
                          characteristicName: characteristicName
                        });
                      });
                      
                      console.log(`✅ [WB API] Найдено ${errors.length} детальных ошибок для артикула ${vendorCode}`);
                    }
                  }
                }
              }
            } else {
              console.warn('⚠️ [WB API] Не удалось получить список ошибок:', errorListResponse.status);
            }
          } catch (errorListError) {
            console.error('❌ [WB API] Ошибка при запросе списка ошибок:', errorListError);
          }
        }
        
        // 🔧 ЕСЛИ ЕСТЬ ОШИБКИ ВАЛИДАЦИИ ИЛИ НЕ ПОЛУЧЕН ID - ВЫЗЫВАЕМ AGENT3
        if (hasValidationErrors || (!wbProductId && !wbTaskId)) {
          console.log('🔧 [Agent3] Обнаружены ошибки валидации или товар не создан, вызываем Agent3 для исправления...');
          
          if (!hasValidationErrors) {
            // Если additionalErrors пусто, но товар не создан - создаем общую ошибку
            validationErrors.push('Товар не создан на WB. Возможны проблемы с типами характеристик.');
            detailedErrors.push({ field: 'general', error: 'Товар не создан на WB. Возможны проблемы с типами характеристик.' });
          }
          
          console.log('📋 [Agent3] Ошибки для исправления:', validationErrors);
          console.log('📋 [Agent3] Детальные ошибки:', JSON.stringify(detailedErrors, null, 2));
          console.log('📋 [Agent3] Отправленные данные WB:', JSON.stringify(wbProductData, null, 2));
          
          try {
            // Загружаем характеристики категории для Agent3
            if (!product.subcategoryId) {
              throw new Error('Не указан subcategoryId для товара');
            }
            
            const categoryCharacteristics = await prisma.wbCategoryCharacteristic.findMany({
              where: { subcategoryId: product.subcategoryId },
              include: {
                values: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' }
                }
              },
              orderBy: [{ isRequired: 'desc' }, { sortOrder: 'asc' }]
            });
            
            const mappedCharacteristics = categoryCharacteristics.map((char: any): {
              id: number;
              wbCharacteristicId?: number;
              name: string;
              type: 'string' | 'number';
              isRequired: boolean;
              maxLength?: number;
              minValue?: number;
              maxValue?: number;
              description?: string;
              values?: Array<{
                id: number;
                value: string;
                displayName: string;
              }>;
            } => ({
              id: char.id,
              wbCharacteristicId: char.wbCharacteristicId,
              name: char.name,
              type: (char.type === 'number' ? 'number' : 'string') as 'string' | 'number',
              isRequired: !!char.isRequired,
              maxLength: char.maxLength,
              minValue: char.minValue,
              maxValue: char.maxValue,
              description: char.description,
              values: char.values?.map((v: any) => ({
                id: v.id,
                value: v.value,
                displayName: v.displayName || v.value
              })) || []
            }));
            
            // Вызываем Agent3 для исправления ошибок с детальной информацией
            const aiSystem = new UnifiedAISystem();
            const agent3Result = await aiSystem.fixWBErrors(
              validationErrors,
              {
                characteristics: characteristics,
                seoTitle: seoTitle,
                seoDescription: seoDescription,
                vendorCode: vendorCode,
                sentToWB: wbProductData // Передаем данные, которые были отправлены на WB для анализа
              },
              mappedCharacteristics,
              detailedErrors // Передаем детальные структурированные ошибки
            );
            
            if (agent3Result.success && agent3Result.data) {
              console.log('✅ [Agent3] Успешно исправлены данные товара');
              console.log('🔄 [Agent3] Исправленные характеристики:', agent3Result.data.characteristics?.length || 0);
              
              // Формируем новые данные товара с исправлениями от Agent3
              const fixedWbProductData = {
                subjectID: wbSubjectId,
                variants: [{
                  vendorCode: vendorCode,
                  title: agent3Result.data.seoTitle || seoTitle,
                  description: agent3Result.data.seoDescription || seoDescription,
                  brand: brand,
                  dimensions: {
                    length: length,
                    width: width,
                    height: height,
                    weightBrutto: Math.round(weight * 1000)
                  },
                  characteristics: agent3Result.data.characteristics.map((char: any) => {
                    // ✅ Agent 3 уже вернул правильный формат - НЕ МЕНЯЕМ ЕГО!
                    // Для чисел: value = число
                    // Для строк: value = строка или массив строк
                    return {
                      id: char.id,
                      value: char.value
                    };
                  }).filter((char: any) => {
                    // Проверяем что значение не пустое
                    if (char.value === null || char.value === undefined) return false;
                    
                    // Для чисел: проверяем что это валидное число
                    if (typeof char.value === 'number') {
                      return !isNaN(char.value);
                    }
                    
                    // Для строк: проверяем что не пустая
                    if (typeof char.value === 'string') {
                      return char.value.trim() !== '' && char.value.toLowerCase() !== 'null';
                    }
                    
                    // Для массивов: проверяем что есть непустые значения
                    if (Array.isArray(char.value)) {
                      return char.value.some((v: any) => 
                        v != null && 
                        String(v).trim() !== '' && 
                        String(v).toLowerCase() !== 'null'
                      );
                    }
                    
                    return true;
                  }),
                  sizes: [{
                    price: Math.round(discountPrice),
                    skus: [barcode]
                  }]
                }]
              };
              
              console.log('📤 [Agent3] Повторная отправка исправленных данных на WB...');
              console.log('🔍 [Agent3] Исправленные данные:', JSON.stringify(fixedWbProductData, null, 2));
              
              // Повторная отправка на WB с исправленными данными
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), 60000);
              
              const retryResponse = await fetch(`${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/cards/upload`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': cabinet.apiToken,
                  'User-Agent': 'WB-AI-Assistant/2.0',
                  'Accept': 'application/json'
                },
                body: JSON.stringify([fixedWbProductData]),
                signal: retryController.signal
              });
              
              clearTimeout(retryTimeoutId);
              console.log(`📊 [Agent3] Статус повторного ответа: ${retryResponse.status}`);
              
              if (!retryResponse.ok) {
                let retryErrorText = '';
                try {
                  retryErrorText = await retryResponse.text();
                } catch (e) {
                  retryErrorText = 'Не удалось получить текст ошибки';
                }
                console.error(`❌ [Agent3] Повторная попытка не удалась: ${retryResponse.status}`, retryErrorText);
                
                // Сохраняем ошибку
                await safePrismaOperation(
                  () => prisma.product.update({
                    where: { id: params.id },
                    data: {
                      errorMessage: `Agent3 не смог исправить ошибки: ${retryErrorText}`,
                      wbData: JSON.stringify({
                        error: 'Agent3 failed to fix errors',
                        originalErrors: validationErrors,
                        agent3Fixed: agent3Result.data,
                        retryError: retryErrorText,
                        apiStatus: 'failed_after_agent3'
                      })
                    }
                  }),
                  'сохранение ошибки после Agent3'
                );
                
                return NextResponse.json({ 
                  error: 'Agent3 не смог исправить ошибки валидации',
                  originalErrors: validationErrors,
                  agent3Attempted: true,
                  details: retryErrorText
                }, { status: 400 });
              }
              
              let retryResponseData: any = {};
              const retryResponseText = await retryResponse.text();
              
              if (retryResponseText && retryResponseText.trim()) {
                try {
                  retryResponseData = JSON.parse(retryResponseText);
                } catch (parseError) {
                  console.error('❌ [Agent3] Ошибка парсинга JSON ответа:', parseError);
                  console.error('❌ [Agent3] Текст ответа:', retryResponseText);
                  retryResponseData = {};
                }
              }
              
              console.log('✅ [Agent3] Повторный ответ от WB:', JSON.stringify(retryResponseData, null, 2));
              
              // Извлекаем ID из повторного ответа
              if (retryResponseData.data && Array.isArray(retryResponseData.data) && retryResponseData.data.length > 0) {
                const firstItem = retryResponseData.data[0];
                wbProductId = firstItem.nmID || firstItem.nmId || firstItem.id;
                console.log(`📦 [Agent3] Получен ID товара после исправления: ${wbProductId}`);
              }
              
              if (retryResponseData.taskId) {
                wbTaskId = retryResponseData.taskId;
                console.log(`📋 [Agent3] Получен taskId после исправления: ${wbTaskId}`);
              }
              
              // Обновляем wbResponseData для дальнейшей обработки
              wbResponseData.data = retryResponseData.data;
              wbResponseData.taskId = retryResponseData.taskId;
              wbResponseData.agent3Fixed = true;
              wbResponseData.originalErrors = validationErrors;
              
            } else {
              console.error('❌ [Agent3] Не удалось исправить данные:', agent3Result.error);
              
              // Сохраняем ошибку Agent3
              await safePrismaOperation(
                () => prisma.product.update({
                  where: { id: params.id },
                  data: {
                    errorMessage: `Ошибки валидации WB, Agent3 не смог исправить: ${validationErrors.join(', ')}`,
                    wbData: JSON.stringify({
                      error: 'Validation errors from WB',
                      validationErrors: validationErrors,
                      agent3Error: agent3Result.error,
                      apiStatus: 'validation_failed'
                    })
                  }
                }),
                'сохранение ошибки валидации'
              );
              
              return NextResponse.json({ 
                error: 'Ошибки валидации от WB',
                validationErrors: validationErrors,
                agent3Error: agent3Result.error
              }, { status: 400 });
            }
            
          } catch (agent3Error) {
            console.error('❌ [Agent3] Исключение при вызове Agent3:', agent3Error);
            
            // Сохраняем ошибку
            await safePrismaOperation(
              () => prisma.product.update({
                where: { id: params.id },
                data: {
                  errorMessage: `Ошибки валидации WB: ${validationErrors.join(', ')}`,
                  wbData: JSON.stringify({
                    error: 'Validation errors from WB',
                    validationErrors: validationErrors,
                    agent3Exception: agent3Error instanceof Error ? agent3Error.message : 'Unknown error',
                    apiStatus: 'validation_failed'
                  })
                }
              }),
              'сохранение ошибки валидации'
            );
            
            return NextResponse.json({ 
              error: 'Ошибки валидации от WB',
              validationErrors: validationErrors,
              agent3Exception: agent3Error instanceof Error ? agent3Error.message : 'Unknown error'
            }, { status: 400 });
          }
        }
        
        // Сохраняем успешный результат в БД
        await safePrismaOperation(
          () => prisma.product.update({
            where: { id: params.id },
            data: {
              publishedAt: new Date(),
              status: 'PUBLISHED',
              errorMessage: null,
              wbData: JSON.stringify({
                wbProductId: wbProductId,
                wbTaskId: wbTaskId,
                wbResponse: wbResponseData,
                publishedAt: new Date().toISOString(),
                cabinet: cabinet.name,
                vendorCode: vendorCode,
                barcode: barcode,
                productData: wbProductData,
                apiStatus: 'published',
                // 🔥 СОХРАНЯЕМ ЦЕНЫ для последующей установки скидки
                originalPrice: originalPrice,
                discountPrice: discountPrice
              })
            }
          }),
          'обновление данных WB после успешной публикации'
        );
      
        console.log('✅ [WB API] Товар успешно опубликован на Wildberries');
        console.log(`📊 [WB API] Статус после публикации:`);
        console.log(`   - wbProductId: ${wbProductId || 'не получен'}`);
        console.log(`   - vendorCode: ${vendorCode}`);
        console.log(`   - barcode: ${barcode}`);
        console.log(`   - originalPrice: ${originalPrice}`);
        console.log(`   - discountPrice: ${discountPrice}`);

        // 🔥 НОВАЯ ЛОГИКА: Автоматическая установка скидки после создания товара
        let discountResult: { success: boolean; data?: any; error?: string } | null = null;
        
        // Проверяем условия для установки скидки
        const shouldSetDiscount = originalPrice && discountPrice && originalPrice > discountPrice;
        
        if (shouldSetDiscount) {
          console.log(`💰 [WB Discount] Начинаем установку скидки для товара`);
          console.log(`   - Оригинальная цена: ${originalPrice}₽`);
          console.log(`   - Цена со скидкой: ${discountPrice}₽`);
          console.log(`   - Размер скидки: ${((originalPrice - discountPrice) / originalPrice * 100).toFixed(1)}%`);
          console.log(`   - VendorCode: ${vendorCode}`);
          console.log(`   - WB Product ID (из ответа): ${wbProductId || 'не получен'}`);
          
          try {
            let finalNmId = wbProductId;
            
            // Если nmId не получен из ответа, пытаемся получить его по vendorCode
            if (!finalNmId) {
              console.log(`🔍 [WB Discount] nmId не получен из ответа, пытаемся получить по vendorCode ${vendorCode}...`);
              console.log('⏳ [WB Discount] Ожидание 15 секунд для обработки товара на WB...');
              await new Promise(resolve => setTimeout(resolve, 15000));
              
              const nmIdResult = await wbApiService.getNmIdByVendorCode(
                cabinet.apiToken,
                vendorCode,
                5, // maxRetries
                3000 // retryDelay
              );
              
              if (nmIdResult.success && nmIdResult.data?.nmId) {
                finalNmId = nmIdResult.data.nmId;
                console.log(`✅ [WB Discount] Получен nmId: ${finalNmId} по vendorCode`);
              } else {
                console.error(`❌ [WB Discount] Не удалось получить nmId по vendorCode: ${nmIdResult.error}`);
                discountResult = {
                  success: false,
                  error: `Не удалось получить nmId товара: ${nmIdResult.error}`
                };
              }
            } else {
              // Если nmId получен сразу, все равно ждем немного для обработки
              console.log('⏳ [WB Discount] Ожидание 10 секунд для обработки товара на WB...');
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
            // Устанавливаем скидку, если получили nmId
            if (finalNmId && !discountResult) {
              console.log(`💰 [WB Discount] Вызываем setProductDiscountWithRetry с параметрами:`);
              console.log(`   - nmId: ${finalNmId}`);
              console.log(`   - discountPrice: ${discountPrice}`);
              console.log(`   - originalPrice: ${originalPrice}`);
              
              discountResult = await wbApiService.setProductDiscountWithRetry(
                cabinet.apiToken,
                finalNmId,
                discountPrice,
                3, // maxRetries
                5000 // retryDelay
              );
              
              if (discountResult.success) {
                console.log(`✅ [WB Discount] Скидка успешно установлена для товара ${finalNmId}`);
                
                // Обновляем данные в БД с информацией о скидке
                await safePrismaOperation(
                  () => prisma.product.update({
                    where: { id: params.id },
                    data: {
                      wbData: JSON.stringify({
                        wbProductId: finalNmId,
                        wbTaskId: wbTaskId,
                        wbResponse: wbResponseData,
                        publishedAt: new Date().toISOString(),
                        cabinet: cabinet.name,
                        vendorCode: vendorCode,
                        barcode: barcode,
                        productData: wbProductData,
                        apiStatus: 'published',
                        discountApplied: true,
                        discountResult: discountResult?.data,
                        originalPrice: originalPrice,
                        discountPrice: discountPrice,
                        discountAmount: originalPrice - discountPrice,
                        discountPercent: Math.round((originalPrice - discountPrice) / originalPrice * 100)
                      })
                    }
                  }),
                  'обновление данных WB с информацией о скидке'
                );
              } else {
                console.warn(`⚠️ [WB Discount] Не удалось установить скидку для товара ${finalNmId}: ${discountResult?.error}`);
              }
            }
          } catch (discountError) {
            console.error(`❌ [WB Discount] Ошибка при установке скидки:`, discountError);
            discountResult = {
              success: false,
              error: discountError instanceof Error ? discountError.message : 'Неизвестная ошибка'
            };
          }
        } else if (!originalPrice || !discountPrice) {
          console.log('⚠️ [WB Discount] Пропускаем установку скидки: цены не указаны');
        } else if (originalPrice <= discountPrice) {
          console.log('⚠️ [WB Discount] Пропускаем установку скидки: скидка не требуется (оригинальная цена <= цена со скидкой)');
        }

        // 🆕 УСТАНОВКА ОСТАТКОВ FBS (если указаны)
        let stockResult: any = null;
        const stockAmount = product.stock;
        
        if (stockAmount && stockAmount > 0 && barcode) {
          console.log(`📦 [WB Stocks] Начинаем установку остатка для товара`);
          console.log(`   - Остаток: ${stockAmount} шт`);
          console.log(`   - Barcode: ${barcode}`);
          
          try {
            // Получаем список складов продавца
            console.log('📦 [WB Stocks] Получение списка складов...');
            const warehousesResult = await wbApiService.getWarehouses(cabinet.apiToken);
            
            if (warehousesResult.success && warehousesResult.data && Array.isArray(warehousesResult.data)) {
              const warehouses = warehousesResult.data;
              console.log(`📦 [WB Stocks] Найдено складов: ${warehouses.length}`);
              
              // Ищем первый FBS склад (обычно это склад продавца)
              const fbsWarehouse = warehouses.find((w: any) => 
                w.name && (w.name.toLowerCase().includes('fbs') || w.officeId)
              ) || warehouses[0]; // Если не нашли FBS, берем первый
              
              if (fbsWarehouse && fbsWarehouse.id) {
                console.log(`📦 [WB Stocks] Выбран склад: ${fbsWarehouse.name || 'Без названия'} (ID: ${fbsWarehouse.id})`);
                console.log('⏳ [WB Stocks] Ожидание 5 секунд для обработки товара на WB...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Устанавливаем остаток
                stockResult = await wbApiService.setProductStockWithRetry(
                  cabinet.apiToken,
                  fbsWarehouse.id,
                  barcode,
                  stockAmount,
                  3, // maxRetries
                  3000 // retryDelay
                );
                
                if (stockResult.success) {
                  console.log(`✅ [WB Stocks] Остаток успешно установлен: ${stockAmount} шт на складе ${fbsWarehouse.name}`);
                } else {
                  console.warn(`⚠️ [WB Stocks] Не удалось установить остаток: ${stockResult?.error}`);
                }
              } else {
                console.warn('⚠️ [WB Stocks] Не найден подходящий склад для установки остатка');
                stockResult = {
                  success: false,
                  error: 'Не найден подходящий склад'
                };
              }
            } else {
              console.warn('⚠️ [WB Stocks] Не удалось получить список складов:', warehousesResult.error);
              stockResult = {
                success: false,
                error: warehousesResult.error || 'Не удалось получить список складов'
              };
            }
          } catch (stockError) {
            console.error(`❌ [WB Stocks] Ошибка при установке остатка:`, stockError);
            stockResult = {
              success: false,
              error: stockError instanceof Error ? stockError.message : 'Неизвестная ошибка'
            };
          }
        } else if (!stockAmount || stockAmount <= 0) {
          console.log('⚠️ [WB Stocks] Пропускаем установку остатка: количество не указано или равно 0');
        } else if (!barcode) {
          console.log('⚠️ [WB Stocks] Пропускаем установку остатка: отсутствует barcode');
        }
      
        return NextResponse.json({
          success: true,
          message: 'Товар сохранен и успешно опубликован на Wildberries',
          productId: params.id,
          status: 'PUBLISHED',
          wbPublished: true,
          wbProductId: wbProductId,
          wbTaskId: wbTaskId,
          publishedAt: new Date().toISOString(),
          cabinet: cabinet.name,
          vendorCode: vendorCode,
          barcode: barcode,
          discountInfo: discountResult ? {
            applied: discountResult.success,
            originalPrice: originalPrice,
            discountPrice: discountPrice,
            discountAmount: originalPrice - discountPrice,
            discountPercent: Math.round((originalPrice - discountPrice) / originalPrice * 100),
            error: discountResult.error
          } : null,
          stockInfo: stockResult ? {
            applied: stockResult.success,
            amount: stockAmount,
            error: stockResult.error
          } : null
        });
      
      } catch (wbError) {
        console.error('❌ [WB API] Исключение при обращении к Wildberries:', wbError);
        
        // Определяем тип ошибки для лучшей обработки
        let errorMessage = 'Неизвестная ошибка подключения к Wildberries API';
        let isNetworkError = false;
        let isTimeoutError = false;
        let shouldRetry = false;
        
        if (wbError instanceof Error) {
          if (wbError.name === 'AbortError') {
            errorMessage = 'Превышено время ожидания ответа от Wildberries API (60 секунд). Попробуйте позже.';
            isTimeoutError = true;
            shouldRetry = true;
          } else if (wbError.message.includes('fetch failed')) {
            errorMessage = 'Ошибка сетевого подключения к Wildberries API. Проверьте интернет-соединение.';
            isNetworkError = true;
            shouldRetry = true;
          } else if (wbError.message.includes('ENOTFOUND')) {
            errorMessage = 'Не удается найти сервер Wildberries API. Возможны проблемы с DNS или интернет-соединением.';
            isNetworkError = true;
            shouldRetry = true;
          } else if (wbError.message.includes('ECONNREFUSED')) {
            errorMessage = 'Сервер Wildberries API отклонил соединение. Возможно сервис временно недоступен.';
            isNetworkError = true;
            shouldRetry = true;
          } else if (wbError.message.includes('TIMEOUT') || wbError.message.includes('timeout')) {
            errorMessage = 'Таймаут подключения к Wildberries API. Попробуйте позже.';
            isTimeoutError = true;
            shouldRetry = true;
          } else {
            errorMessage = wbError.message;
          }
        }
        
        // Сохраняем ошибку в БД с дополнительной информацией
        await safePrismaOperation(
          () => prisma.product.update({
            where: { id: params.id },
            data: {
              errorMessage: errorMessage,
              wbData: JSON.stringify({
                error: errorMessage,
                errorType: isTimeoutError ? 'timeout' : isNetworkError ? 'network' : 'api',
                shouldRetry: shouldRetry,
                errorAt: new Date().toISOString(),
                cabinet: cabinet.name,
                vendorCode: vendorCode,
                barcode: barcode,
                productData: wbProductData,
                apiStatus: 'failed',
                apiUrl: `${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/cards/upload`
              })
            }
          }),
          'сохранение ошибки WB API'
        );
        
        return NextResponse.json({ 
          error: errorMessage,
          errorType: isTimeoutError ? 'timeout' : isNetworkError ? 'network' : 'api',
          shouldRetry: shouldRetry,
          details: wbError instanceof Error ? wbError.message : 'Неизвестная ошибка',
          productSaved: true, // Данные сохранены, только WB не удалось
          message: shouldRetry 
            ? 'Данные товара сохранены. Попробуйте повторить публикацию через некоторое время.'
            : 'Данные товара сохранены, но публикация на WB не удалась. Проверьте настройки кабинета.'
        }, { status: 500 });
      }
    } else {
      // Только сохранили данные без публикации на WB
      return NextResponse.json({
        success: true,
        message: 'Данные товара успешно сохранены. Товар готов к публикации.',
        productId: params.id,
        status: finalStatus,
        wbPublished: false,
        savedAt: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('❌ [Publish] Критическая ошибка сохранения/публикации товара:', error);
    console.error('❌ [Publish] Тип ошибки:', error?.name);
    console.error('❌ [Publish] Сообщение ошибки:', error?.message);
    console.error('❌ [Publish] Stack trace:', error?.stack);

    // Определяем тип ошибки
    let errorMessage = 'Внутренняя ошибка сервера при сохранении товара';
    let errorDetails = error?.message || 'Неизвестная ошибка';
    
    if (error?.message?.includes('JSON')) {
      errorMessage = 'Ошибка парсинга данных запроса';
      errorDetails = 'Проверьте формат отправляемых данных';
    } else if (error?.name === 'SyntaxError') {
      errorMessage = 'Ошибка синтаксиса при обработке запроса';
      errorDetails = 'Возможно, тело запроса содержит некорректный JSON';
    }

    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// ========== НОВЫЕ ФУНКЦИИ ДЛЯ ПОСЛЕДОВАТЕЛЬНЫХ ОПЕРАЦИЙ С WB ==========

// Создание товара на WB
async function handleCreateProduct(data: any, product: any, cabinet: any) {
  console.log('🏗️ Создание товара на WB:', data.name);

  // Генерируем vendorCode и barcode
  const vendorCode = `PRD${product.id.slice(-8).toUpperCase()}`;
  const barcode = `2200000${product.id.slice(-6)}${Math.floor(Math.random() * 10)}`;

  // Получаем цены из wbData
  const wbData = product.wbData as any;
  const originalPrice = wbData?.originalPrice || product.price;
  const discountPrice = wbData?.discountPrice || product.price;

  // Получаем правильный wbSubjectId из подкатегории
  const wbSubjectId = product.subcategory?.wbSubjectId || product.subcategoryId;

  // Извлекаем бренд из характеристик
  const brandChar = data.characteristics?.find((char: any) =>
    char.name && (
      char.name.toLowerCase().includes('бренд') ||
      char.name.toLowerCase().includes('brand') ||
      char.name.toLowerCase().includes('производитель') ||
      char.name.toLowerCase().includes('торговая марка')
    )
  );
  let brand = (brandChar?.value || wbData?.brand || '').toString().trim();
  const brandLower = brand.toLowerCase();
  if (!brand || ['не указан','generic','noname','нет бренда','unknown','n/a','na'].includes(brandLower)) {
    brand = wbData?.brand === 'Нет бренда' ? 'Нет бренда' : '';
  }

  // Подготавливаем данные для Wildberries API
  const wbProductData = {
    subjectID: wbSubjectId,
    variants: [{
      vendorCode: vendorCode,
      title: data.name || product.name,
      description: data.description || `Товар ${product.name}. Качественный продукт по выгодной цене.`,
      brand: brand,
      dimensions: {
        length: data.dimensions?.length || 10,
        width: data.dimensions?.width || 10,
        height: data.dimensions?.height || 5,
        weightBrutto: data.dimensions?.weight ? data.dimensions.weight * 1000 : 500
      },
      characteristics: data.characteristics?.map((char: any) => {
        let processedValue = char.value;

        // Обработка числовых характеристик
        if (char.type === 'number' || char.type === 'integer' || char.type === 'float') {
          if (typeof char.value === 'string') {
            const cleanedValue = char.value.replace(/[^\d.,\-]/g, '').replace(',', '.');
            const numValue = parseFloat(cleanedValue);
            if (!isNaN(numValue) && isFinite(numValue)) {
              processedValue = numValue;
            } else {
              processedValue = null;
            }
          } else if (typeof char.value === 'number') {
            processedValue = char.value;
          } else {
            processedValue = null;
          }
        }

        if (processedValue === null || processedValue === undefined) {
          return null;
        }

        if (char.type === 'number' || char.type === 'integer' || char.type === 'float') {
          return { id: char.id, value: [processedValue] };
        } else {
          return { id: char.id, value: [String(processedValue)] };
        }
      }).filter(Boolean) || [],
      sizes: [{
        price: Math.round(discountPrice),
        skus: [barcode]
      }]
    }]
  };

  console.log('📤 Отправка данных в WB API...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/cards/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cabinet.apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify([wbProductData]),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка создания товара: ${response.status}`, errorText);

      let errorMessage = 'Ошибка создания товара на WB';
      if (response.status === 400) {
        errorMessage = 'Неверные данные товара для Wildberries';
      } else if (response.status === 401) {
        errorMessage = 'Неверный API токен';
      } else if (response.status === 403) {
        errorMessage = 'Нет прав для создания товаров';
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов';
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText,
        status: response.status
      }, { status: 400 });
    }

    const result = await response.json();
    console.log('✅ Товар создан на WB:', result);

    // Извлекаем ID созданного товара
    let wbProductId = null;
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      wbProductId = result.data[0].nmID || result.data[0].nmId || result.data[0].id;
    }

    // Сохраняем результат в БД
    await safePrismaOperation(
      () => prisma.product.update({
        where: { id: product.id },
        data: {
          wbData: JSON.stringify({
            wbProductId: wbProductId,
            wbResponse: result,
            vendorCode: vendorCode,
            barcode: barcode,
            productData: wbProductData,
            apiStatus: 'created'
          })
        }
      }),
      'сохранение данных WB'
    );

    return NextResponse.json({
      success: true,
      message: 'Товар успешно создан на WB',
      productId: wbProductId,
      vendorCode: vendorCode,
      barcode: barcode,
      data: result,
      nextStep: 'set-discount'
    });

  } catch (error) {
    console.error('❌ Исключение при создании товара:', error);

    let errorMessage = 'Ошибка подключения к WB API';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания ответа от WB API';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Установка скидки на товар
async function handleSetDiscount(data: any, product: any, cabinet: any) {
  console.log('💰 Установка скидки для товара:', data.productId);

  // Валидация скидки
  if (data.discount < 0 || data.discount > 99) {
    return NextResponse.json({
      error: 'Скидка должна быть в диапазоне от 0 до 99%'
    }, { status: 400 });
  }

  const discountData: any = {
    discount: Math.round(data.discount)
  };

  if (data.startDate) discountData.startDate = data.startDate;
  if (data.endDate) discountData.endDate = data.endDate;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Use SET_PRICES endpoint with correct base URL
    const endpoint = WB_API_CONFIG.ENDPOINTS.SET_PRICES;
    const response = await fetch(`${WB_API_CONFIG.BASE_URLS.PRICES}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cabinet.apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ nmId: parseInt(data.productId), price: data.price }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка установки скидки: ${response.status}`, errorText);

      let errorMessage = 'Ошибка установки скидки на WB';
      if (response.status === 404) {
        errorMessage = 'Товар не найден на WB';
      } else if (response.status === 403) {
        errorMessage = 'Нет прав для установки скидки';
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText,
        status: response.status
      }, { status: 400 });
    }

    const result = await response.json();
    console.log('✅ Скидка установлена на WB:', result);

    return NextResponse.json({
      success: true,
      message: 'Скидка успешно установлена',
      productId: data.productId,
      discount: data.discount,
      data: result,
      nextStep: 'set-stock'
    });

  } catch (error) {
    console.error('❌ Исключение при установке скидки:', error);

    let errorMessage = 'Ошибка подключения к WB API';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания ответа от WB API';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Установка остатков товара
async function handleSetStock(data: any, product: any, cabinet: any) {
  console.log('📦 Установка остатков для товара:', data.productId);

  if (data.stock < 0) {
    return NextResponse.json({
      error: 'Количество остатков не может быть отрицательным'
    }, { status: 400 });
  }

  const stockData = {
    stocks: [{
      sku: generateSkuFromProductId(data.productId),
      amount: Math.round(data.stock),
      warehouseId: data.warehouseId || 0
    }]
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const endpoint = WB_API_CONFIG.ENDPOINTS.SET_STOCK.replace('{nmID}', data.productId);
    const response = await fetch(`${WB_API_CONFIG.BASE_URLS.MARKETPLACE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cabinet.apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(stockData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка установки остатков: ${response.status}`, errorText);

      let errorMessage = 'Ошибка установки остатков на WB';
      if (response.status === 404) {
        errorMessage = 'Товар не найден на WB';
      } else if (response.status === 403) {
        errorMessage = 'Нет прав для установки остатков';
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText,
        status: response.status
      }, { status: 400 });
    }

    const result = await response.json();
    console.log('✅ Остатки установлены на WB:', result);

    return NextResponse.json({
      success: true,
      message: 'Остатки товара успешно установлены',
      productId: data.productId,
      stock: data.stock,
      data: result,
      nextStep: 'completed'
    });

  } catch (error) {
    console.error('❌ Исключение при установке остатков:', error);

    let errorMessage = 'Ошибка подключения к WB API';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания ответа от WB API';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Полный цикл: создание товара + скидка + остатки
async function handleCreateFullCycle(data: any, product: any, cabinet: any) {
  console.log('🔄 Полный цикл создания товара со скидкой и остатками...');

  // Шаг 1: Создание товара
  const createResult = await handleCreateProduct(data, product, cabinet);
  if (createResult.status !== 200) {
    return createResult;
  }

  const createData = await createResult.json();
  if (!createData.success || !createData.productId) {
    return NextResponse.json({
      error: 'Не удалось получить ID созданного товара',
      details: createData
    }, { status: 500 });
  }

  // Шаг 2: Установка скидки
  const discountResult = await handleSetDiscount({
    productId: createData.productId,
    discount: data.discount || 0,
    startDate: data.startDate,
    endDate: data.endDate
  }, product, cabinet);

  if (discountResult.status !== 200) {
    return NextResponse.json({
      error: 'Товар создан, но не удалось установить скидку',
      productId: createData.productId,
      createResult: createData,
      discountResult: await discountResult.json()
    }, { status: 207 });
  }

  const discountData = await discountResult.json();

  // Шаг 3: Установка остатков
  const stockResult = await handleSetStock({
    productId: createData.productId,
    stock: data.stock || 0,
    warehouseId: data.warehouseId
  }, product, cabinet);

  if (stockResult.status !== 200) {
    return NextResponse.json({
      error: 'Товар создан, скидка установлена, но не удалось установить остатки',
      productId: createData.productId,
      createResult: createData,
      discountResult: discountData,
      stockResult: await stockResult.json()
    }, { status: 207 });
  }

  const stockData = await stockResult.json();

  return NextResponse.json({
    success: true,
    message: 'Товар создан, скидка и остатки установлены',
    data: {
      create: createData,
      discount: discountData,
      stock: stockData
    },
    nextStep: 'completed'
  });
}

// Вспомогательные функции
function generateSkuFromProductId(productId: string): string {
  return `SKU${productId.padStart(8, '0')}`;
}