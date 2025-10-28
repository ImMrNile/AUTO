// src/app/api/products/[id]/update-price/route.ts - Обновление цены товара с синхронизацией на WB

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

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

    const { price } = await request.json();
    const productId = params.id;

    console.log(`📝 Обновление цены товара ${productId}:`);
    console.log(`   - Новая цена: ${price}₽`);
    console.log(`   - User ID: ${user.id}`);

    // Валидация цены
    if (price === undefined || price === null || price <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная цена (должна быть > 0)'
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

    // Обновляем цену в БД
    const product = await prisma.product.update({
      where: {
        id: existingProduct.id
      },
      data: {
        price: price
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
        const userCabinet = await prisma.cabinet.findFirst({
          where: { userId: user.id }
        });
        
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
          try {
            console.log(`📤 Отправка запроса на установку цены ${price}₽ для товара ${nmId}...`);
            
            wbSyncResult = await wbApiService.setProductDiscountWithRetry(
              apiToken,
              parseInt(nmId),
              price,
              3, // maxRetries
              5000, // retryDelay
              existingProduct.vendorCode || undefined
            );

            if (wbSyncResult.success) {
              console.log(`✅ Цена успешно синхронизирована с Wildberries`);
            } else {
              console.warn(`⚠️ Не удалось синхронизировать цену с WB: ${wbSyncResult.error}`);
            }
          } catch (wbError) {
            console.error(`❌ Ошибка синхронизации с WB:`, wbError);
            wbSyncResult = {
              success: false,
              error: wbError instanceof Error ? wbError.message : 'Неизвестная ошибка'
            };
          }
        } else {
          console.warn(`⚠️ Пропускаем синхронизацию с WB: отсутствует API токен или nmId`);
          console.log(`   - API Token: ${apiToken ? 'есть' : 'нет'}`);
          console.log(`   - nmId: ${nmId || 'нет'}`);
        }
      } else {
        console.warn(`⚠️ Пропускаем синхронизацию с WB: кабинет не найден ни через productCabinets, ни у пользователя`);
      }
    } else {
      console.log(`ℹ️ Пропускаем синхронизацию с WB: товар не имеет wbNmId (не опубликован на WB)`);
    }

    return NextResponse.json({
      success: true,
      message: 'Цена обновлена',
      data: {
        price: price,
        productId: product.id,
        wbSync: wbSyncResult ? {
          success: wbSyncResult.success,
          error: wbSyncResult.error
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Ошибка обновления цены:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
