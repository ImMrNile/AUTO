// src/app/api/cron/check-prices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Cron job для проверки и восстановления закрепленных цен
 * Запускается каждые 30 минут
 * Проверяет все товары с активным закреплением цены
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Price Check Cron] Начало проверки закрепленных цен...');

    // Проверка авторизации cron запроса
    // Vercel Cron отправляет заголовок x-vercel-cron: 1
    // Оркестратор отправляет заголовок x-orchestrator: true
    // Task scheduler отправляет заголовок x-task-scheduler: true
    // Keep-alive отправляет заголовок x-keep-alive: true
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isOrchestrator = request.headers.get('x-orchestrator') === 'true';
    const isTaskScheduler = request.headers.get('x-task-scheduler') === 'true';
    const isKeepAlive = request.headers.get('x-keep-alive') === 'true';
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Разрешаем запросы от Vercel Cron, оркестратора, task scheduler, keep-alive или с правильным CRON_SECRET
    const isAuthorized = isVercelCron || isOrchestrator || isTaskScheduler || isKeepAlive || (cronSecret && authHeader === `Bearer ${cronSecret}`);
    
    if (!isAuthorized) {
      console.warn('⚠️ [Price Check Cron] Неавторизованный запрос');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все товары с активным закреплением цены
    const lockedProducts = await prisma.product.findMany({
      where: {
        priceLocked: true,
        wbNmId: { not: null },
        status: 'PUBLISHED'
      },
      include: {
        productCabinets: {
          where: { isSelected: true },
          include: {
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
    });

    console.log(`📊 [Price Check Cron] Найдено товаров с закрепленной ценой: ${lockedProducts.length}`);

    if (lockedProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет товаров с закрепленной ценой',
        checked: 0,
        restored: 0
      });
    }

    let checkedCount = 0;
    let restoredCount = 0;
    let errorCount = 0;
    let rateLimitErrors = 0;
    const results: any[] = [];

    // Проверяем каждый товар
    for (const product of lockedProducts) {
      try {
        // Если уже много ошибок с лимитами - пропускаем оставшиеся товары
        if (rateLimitErrors >= 2) {
          console.log(`⚠️ [Price Check Cron] Превышено количество ошибок с лимитами (${rateLimitErrors}), пропускаем оставшиеся товары`);
          break;
        }

        // Пропускаем если нет кабинета или API токена
        if (!product.productCabinets || product.productCabinets.length === 0) {
          console.warn(`⚠️ [Price Check Cron] Товар ${product.name} (${product.id}): нет кабинета`);
          continue;
        }

        const cabinet = product.productCabinets[0].cabinet;
        if (!cabinet || !cabinet.isActive || !cabinet.apiToken) {
          console.warn(`⚠️ [Price Check Cron] Товар ${product.name} (${product.id}): кабинет неактивен`);
          continue;
        }

        if (!product.lockedPrice) {
          console.warn(`⚠️ [Price Check Cron] Товар ${product.name} (${product.id}): не указана закрепленная цена`);
          continue;
        }

        checkedCount++;

        // Получаем текущую цену с WB
        const priceInfo = await wbApiService.getProductPrice(cabinet.apiToken, parseInt(product.wbNmId!));
        
        // Проверяем на ошибки с лимитами
        const isRateLimitError = priceInfo.error?.includes('Превышен лимит');
        if (isRateLimitError) {
          rateLimitErrors++;
          console.log(`⚠️ [Price Check Cron] Лимит WB API превышен для товара ${product.name}, пропускаем`);
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'rate_limit',
            error: priceInfo.error
          });
          continue;
        }
        
        // Если товар не найден в WB - пропускаем без ошибки
        if (priceInfo.error === 'Товар не найден в Wildberries') {
          console.log(`ℹ️ [Price Check Cron] Товар ${product.name} (${product.wbNmId}) не найден в WB - пропускаем`);
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'skipped',
            reason: 'not_found_in_wb'
          });
          continue;
        }
        
        if (!priceInfo.success || !priceInfo.data) {
          console.warn(`⚠️ [Price Check Cron] Товар ${product.name}: не удалось получить цену с WB`);
          errorCount++;
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'error',
            error: priceInfo.error
          });
          continue;
        }

        const currentWbPrice = priceInfo.data.price;
        const lockedPrice = product.lockedPrice;

        console.log(`💰 [Price Check Cron] Товар ${product.name}: WB=${currentWbPrice}₽, закреплено=${lockedPrice}₽`);

        // Если цена изменилась - восстанавливаем
        if (Math.abs(currentWbPrice - lockedPrice) > 0.01) {
          console.log(`🔄 [Price Check Cron] Восстанавливаем цену для ${product.name}: ${currentWbPrice}₽ → ${lockedPrice}₽`);
          
          const restoreResult = await wbApiService.setProductPriceWithRetry(
            cabinet.apiToken,
            parseInt(product.wbNmId!),
            lockedPrice,
            3,
            5000
          );

          if (restoreResult.success) {
            restoredCount++;
            
            // Обновляем цену в БД
            await prisma.product.update({
              where: { id: product.id },
              data: {
                discountPrice: lockedPrice,
                price: lockedPrice
              }
            });

            console.log(`✅ [Price Check Cron] Цена восстановлена для ${product.name}`);
            
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'restored',
              previousPrice: currentWbPrice,
              restoredPrice: lockedPrice
            });
          } else {
            errorCount++;
            console.error(`❌ [Price Check Cron] Не удалось восстановить цену для ${product.name}: ${restoreResult.error}`);
            
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: restoreResult.error
            });
          }
        } else {
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'ok',
            currentPrice: currentWbPrice
          });
        }

        // Задержка между проверками товаров (чтобы не перегружать WB API)
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        // Проверяем на ошибки с лимитами
        const isRateLimitError = error instanceof Error && error.message.includes('Превышен лимит');
        if (isRateLimitError) {
          rateLimitErrors++;
          console.log(`⚠️ [Price Check Cron] Лимит WB API превышен для товара ${product.name}`);
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'rate_limit',
            error: error.message
          });
        } else {
          errorCount++;
          console.error(`❌ [Price Check Cron] Ошибка проверки товара ${product.name}:`, error);
          
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    console.log(`✅ [Price Check Cron] Завершено. Проверено: ${checkedCount}, восстановлено: ${restoredCount}, ошибок: ${errorCount}, лимитов: ${rateLimitErrors}`);

    return NextResponse.json({
      success: true,
      message: `Проверка завершена. Проверено: ${checkedCount}, восстановлено: ${restoredCount}`,
      checked: checkedCount,
      restored: restoredCount,
      errors: errorCount,
      rateLimitErrors: rateLimitErrors,
      results: results
    });

  } catch (error) {
    console.error('❌ [Price Check Cron] Критическая ошибка:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка выполнения cron job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
