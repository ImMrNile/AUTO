// src/app/api/products/[id]/publish/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМ API URL И ТАЙМАУТАМИ
import { NextRequest, NextResponse } from 'next/server';
import { prisma, safePrismaOperation } from '@/lib/prisma';
import { AuthService } from '@/lib/auth/auth-service';
import { WB_API_CONFIG } from '@/lib/config/wbApiConfig';

// POST метод для сохранения финальных данных и публикации товара
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🚀 [Publish] Сохранение и публикация товара с ID: ${params.id}`);

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

    // Получаем финальные данные от пользователя
    const requestBody = await request.json();
    const {
      characteristics = [],
      seoTitle = '',
      seoDescription = '',
      finalStatus = 'READY' // READY или PUBLISHED
    } = requestBody;

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
    if (!seoTitle || !seoDescription) {
      return NextResponse.json({ 
        error: 'Не указаны обязательные поля: SEO заголовок и описание' 
      }, { status: 400 });
    }

    if (characteristics.length === 0) {
      return NextResponse.json({ 
        error: 'Не указаны характеристики товара' 
      }, { status: 400 });
    }

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
    
    const finalAiCharacteristics = JSON.stringify({
      characteristics: characteristics,
      seoTitle: seoTitle,
      seoDescription: seoDescription,
      qualityMetrics: {
        characteristicsFillRate: Math.round((characteristics.filter((c: any) => {
          if (c.value == null || c.value === '') return false;
          if (typeof c.value === 'string') {
            return c.value.trim() !== '';
          }
          if (typeof c.value === 'number') {
            return !Number.isNaN(c.value);
          }
          return false;
        }).length / characteristics.length) * 100),
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

      // Извлекаем бренд из характеристик
      const brandChar = characteristics.find((char: any) => 
        char.name && (
          char.name.toLowerCase().includes('бренд') ||
          char.name.toLowerCase().includes('brand') ||
          char.name.toLowerCase().includes('производитель')
        )
      );
      const brand = brandChar?.value || 'Generic';

      // Подготавливаем данные для Wildberries API
      const wbProductData = {
        vendorCode: vendorCode,
        title: seoTitle,
        description: seoDescription, 
        brand: brand,
        subjectID: product.subcategoryId,
        characteristics: characteristics.map((char: any) => ({
          id: char.id,
          value: char.value
        })).filter((char: any) => {
          if (char.value == null || char.value === '') return false;
          // Handle both string and number values
          if (typeof char.value === 'string') {
            return char.value.trim() !== '';
          }
          if (typeof char.value === 'number') {
            return !Number.isNaN(char.value);
          }
          return false;
        }),
        sizes: [{
          skus: [barcode],
          price: Math.round(product.price * 100), // Цена в копейках
          discountedPrice: Math.round(product.price * 100), // Можно добавить скидку
          wbSize: "0"
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
            parsedError = JSON.parse(errorText);
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
            productSaved: true // Данные в БД сохранены
          }, { status: 400 });
        }
        
        const wbResponseData = await wbApiResponse.json();
        console.log('✅ [WB API] Ответ от Wildberries:', JSON.stringify(wbResponseData, null, 2));
        
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
                apiStatus: 'published'
              })
            }
          }),
          'обновление данных WB после успешной публикации'
        );
      
        console.log('✅ [WB API] Товар успешно опубликован на Wildberries');
      
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
          barcode: barcode
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
    
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера при сохранении товара',
      details: error.message || 'Неизвестная ошибка'
    }, { status: 500 });
  }
}