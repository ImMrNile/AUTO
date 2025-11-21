// src/app/api/products/[id]/update-price/route.ts - Обновление цены товара с синхронизацией на WB

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Кэш кабинетов пользователей (in-memory, живет пока работает сервер)
const cabinetCache = new Map<string, { cabinet: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function getUserCabinet(userId: string) {
  // Проверяем кэш
  const cached = cabinetCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 [Cache] Используем кэшированный кабинет для пользователя ${userId}`);
    return cached.cabinet;
  }

  // Загружаем из БД
  console.log(`🔍 [Cache] Загружаем кабинет из БД для пользователя ${userId}`);
  const cabinet = await prisma.cabinet.findFirst({
    where: { userId }
  });

  // Сохраняем в кэш
  if (cabinet) {
    cabinetCache.set(userId, { cabinet, timestamp: Date.now() });
  }

  return cabinet;
}

/**
 * PATCH - Обновление цены товара
 * Обновляет цену в БД и синхронизирует с Wildberries
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный JSON в теле запроса'
      }, { status: 400 });
    }

    const { originalPrice, discountPrice } = body;
    const productId = params.id;

    console.log(`📝 Обновление цены товара ${productId}:`);
    console.log(`   - Оригинальная цена: ${originalPrice}₽`);
    console.log(`   - Цена со скидкой: ${discountPrice}₽`);
    console.log(`   - User ID: ${user.id}`);

    // Валидация цен
    if (!originalPrice || originalPrice <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная оригинальная цена (должна быть > 0)'
      }, { status: 400 });
    }

    if (!discountPrice || discountPrice <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная цена со скидкой (должна быть > 0)'
      }, { status: 400 });
    }

    // Цена со скидкой может быть равна оригинальной (без скидки) или меньше
    if (discountPrice > originalPrice) {
      return NextResponse.json({
        success: false,
        error: 'Цена со скидкой не может быть больше оригинальной цены'
      }, { status: 400 });
    }

    // Находим товар с кабинетом
    console.log(`🔍 Поиск товара в БД: wbNmId="${productId}" или id="${productId}"`);
    
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { wbNmId: productId },
          { id: productId }
        ],
        userId: user.id
      },
      include: {
        productCabinets: {
          include: {
            cabinet: true
          }
        }
      }
    });

    if (!existingProduct) {
      console.error(`❌ Товар не найден для пользователя ${user.id}`);
      return NextResponse.json({
        success: false,
        error: 'Товар не найден или у вас нет прав для его редактирования'
      }, { status: 404 });
    }
    
    console.log(`✅ Найден товар: id=${existingProduct.id}, wbNmId=${existingProduct.wbNmId}`);

    // Обновляем цены в БД и wbData
    const wbData = existingProduct.wbData as any || {};
    const updatedWbData = {
      ...wbData,
      originalPrice: originalPrice,
      discountPrice: discountPrice
    };

    const product = await prisma.product.update({
      where: {
        id: existingProduct.id
      },
      data: {
        price: discountPrice, // Основная цена = цена со скидкой
        wbData: updatedWbData
      }
    });

    console.log(`✅ Цена обновлена в БД`);

    // Синхронизация с WB (если товар уже на WB)
    let wbSyncResult = null;
    if (existingProduct.wbNmId) {
      console.log(`🔄 Синхронизация цены с Wildberries для товара ${existingProduct.wbNmId}...`);

      // Получаем кабинет
      console.log(`🔍 Проверка связи товара с кабинетом:`);
      console.log(`   - Количество связей productCabinets: ${existingProduct.productCabinets.length}`);
      
      const productCabinet = existingProduct.productCabinets.find(pc => pc.cabinet !== null);
      
      // Если нет связи через productCabinets, пытаемся получить первый кабинет пользователя
      let cabinet = productCabinet?.cabinet;
      
      if (!cabinet) {
        console.log(`⚠️ Кабинет не найден через productCabinets, ищем кабинет пользователя...`);
        const userCabinet = await getUserCabinet(user.id);
        
        if (userCabinet) {
          console.log(`✅ Найден кабинет пользователя: ${userCabinet.name}`);
          cabinet = userCabinet;
        } else {
          console.warn(`❌ У пользователя нет ни одного кабинета`);
        }
      } else {
        console.log(`✅ Найден кабинет через productCabinets: ${cabinet.name}`);
      }
      
      if (cabinet) {
        const apiToken = cabinet.apiToken;
        const nmId = existingProduct.wbNmId;

        if (apiToken && nmId) {
          // ВСЕГДА отправляем на WB для защиты от автоснижения
          // Даже если цена в БД не изменилась, WB мог её снизить
          try {
            console.log(`📤 Отправка запроса на установку цены для товара ${nmId}...`);
            console.log(`   - Оригинальная цена: ${originalPrice}₽`);
            console.log(`   - Цена со скидкой: ${discountPrice}₽`);
            
            wbSyncResult = await wbApiService.setProductPriceWithRetry(
              apiToken,
              parseInt(nmId),
              discountPrice,
              3, // maxRetries
              5000, // retryDelay
              existingProduct.vendorCode || undefined
            );

            if (wbSyncResult.success) {
              console.log(`✅ Цена успешно синхронизирована с Wildberries`);
            } else {
              console.warn(`⚠️ Не удалось синхронизировать цену с WB: ${wbSyncResult.error}`);
            }
          } catch (wbError: any) {
            console.error(`❌ Ошибка синхронизации с WB:`, wbError);
            wbSyncResult = { 
              success: false, 
              error: wbError.message || 'Unknown error' 
            };
          }
        } else {
          console.warn(`⚠️ Отсутствует API токен или nmId для синхронизации с WB`);
          wbSyncResult = { 
            success: false, 
            error: 'Missing API token or nmId' 
          };
        }
      } else {
        console.warn(`⚠️ Кабинет не найден, синхронизация с WB невозможна`);
        wbSyncResult = { 
          success: false, 
          error: 'Cabinet not found' 
        };
      }
    }

    return NextResponse.json({
      success: true,
      product: existingProduct,
      wbSync: wbSyncResult
    });

  } catch (error: any) {
    console.error('❌ Ошибка обновления цены:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update price' 
      },
      { status: 500 }
    );
  }
}
