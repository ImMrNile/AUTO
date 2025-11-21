// src/app/api/products/[id]/update-discount/route.ts - Обновление скидки товара с синхронизацией на WB

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * PATCH - Обновление скидки товара (процент скидки)
 * Обновляет скидку в БД и синхронизирует с Wildberries
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

    const { discount, originalPrice } = await request.json();
    const productId = params.id;

    console.log(`📝 Обновление скидки товара ${productId}:`);
    console.log(`   - Скидка: ${discount}%`);
    console.log(`   - Оригинальная цена: ${originalPrice}₽`);

    // Валидация скидки
    if (discount === undefined || discount === null || discount < 0 || discount > 100) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный процент скидки (должен быть от 0 до 100)'
      }, { status: 400 });
    }

    if (!originalPrice || originalPrice <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная оригинальная цена (должна быть > 0)'
      }, { status: 400 });
    }

    // Находим товар с кабинетом
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
      return NextResponse.json({
        success: false,
        error: 'Товар не найден или у вас нет прав для его редактирования'
      }, { status: 404 });
    }

    // Рассчитываем цену со скидкой
    const discountPrice = Math.round(originalPrice * (1 - discount / 100));

    console.log(`💰 Расчет цены:`);
    console.log(`   - Оригинальная цена: ${originalPrice}₽`);
    console.log(`   - Скидка: ${discount}%`);
    console.log(`   - Цена со скидкой: ${discountPrice}₽`);

    // Обновляем цену и скидку в БД
    const wbData = (existingProduct.wbData as any) || {};
    const updatedWbData = {
      ...wbData,
      originalPrice: originalPrice,
      discountPrice: discountPrice,
      discount: discount
    };

    const product = await prisma.product.update({
      where: {
        id: existingProduct.id
      },
      data: {
        price: originalPrice, // Базовая цена остается неизменной
        discountPrice: discountPrice, // Обновляем цену со скидкой
        discount: discount, // Обновляем процент скидки
        wbData: updatedWbData
      }
    });

    console.log(`✅ Скидка обновлена в БД`);

    // Синхронизация с WB (если товар уже на WB)
    let wbSyncResult = null;
    if (existingProduct.wbNmId) {
      console.log(`🔄 Синхронизация скидки с Wildberries для товара ${existingProduct.wbNmId}...`);
      console.log(`📋 Доступно кабинетов: ${existingProduct.productCabinets.length}`);
      
      // Получаем кабинет
      let productCabinet = existingProduct.productCabinets.find(pc => pc.cabinet !== null && pc.cabinet !== undefined);
      
      // Если нет связи через productCabinets, пытаемся найти кабинет пользователя напрямую
      if (!productCabinet || !productCabinet.cabinet) {
        console.log(`⚠️ Кабинет не найден через productCabinets, ищем кабинет пользователя...`);
        
        const userCabinet = await prisma.cabinet.findFirst({
          where: {
            userId: user.id,
            isActive: true
          }
        });
        
        if (userCabinet) {
          console.log(`✅ Найден активный кабинет пользователя: ${userCabinet.name}`);
          productCabinet = {
            id: 'temp',
            productId: existingProduct.id,
            cabinetId: userCabinet.id,
            isSelected: true,
            createdAt: new Date(),
            cabinet: userCabinet
          } as any;
        } else {
          console.warn(`⚠️ Пропускаем синхронизацию с WB: не найден активный кабинет пользователя`);
        }
      }
      
      if (!productCabinet || !productCabinet.cabinet) {
        console.warn(`⚠️ Пропускаем синхронизацию с WB: кабинет не найден`);
        if (existingProduct.productCabinets.length > 0) {
          console.log(`   Доступные связи:`, existingProduct.productCabinets.map(pc => ({
            id: pc.id,
            cabinetId: pc.cabinetId,
            hasCabinet: !!pc.cabinet
          })));
        }
      } else {
        const cabinet = productCabinet.cabinet;
        const apiToken = cabinet.apiToken;
        const nmId = existingProduct.wbNmId;

        console.log(`✅ Найден кабинет: ${cabinet.name} (ID: ${cabinet.id})`);

        if (apiToken && nmId) {
          try {
            console.log(`📤 Отправка запроса на установку скидки ${discount}% (цена ${discountPrice}₽) для товара ${nmId}...`);
            
            wbSyncResult = await wbApiService.setProductPriceWithRetry(
              apiToken,
              parseInt(nmId),
              discountPrice,
              3,
              5000,
              existingProduct.vendorCode || undefined
            );

            if (wbSyncResult.success) {
              console.log(`✅ Скидка успешно синхронизирована с Wildberries`);
              
              // Обновляем информацию о синхронизации в БД
              await prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                  wbData: {
                    ...updatedWbData,
                    lastDiscountSync: new Date().toISOString(),
                    discountApplied: true
                  }
                }
              });
            } else {
              console.warn(`⚠️ Не удалось синхронизировать скидку с WB: ${wbSyncResult.error}`);
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
          console.log(`   API Token: ${apiToken ? 'есть' : 'нет'}, nmId: ${nmId || 'нет'}`);
        }
      }
    } else {
      console.log(`ℹ️ Пропускаем синхронизацию с WB: товар не имеет wbNmId (не опубликован на WB)`);
    }

    return NextResponse.json({
      success: true,
      message: 'Скидка обновлена',
      data: {
        originalPrice: originalPrice,
        discount: discount,
        discountPrice: discountPrice,
        productId: product.id,
        wbSync: wbSyncResult ? {
          success: wbSyncResult.success,
          error: wbSyncResult.error
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Ошибка обновления скидки:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
