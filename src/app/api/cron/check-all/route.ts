// src/app/api/cron/check-all/route.ts
// Универсальный Cron Job для проверки цен и кампаний
// Объединяет check-prices и check-campaigns в один endpoint

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Универсальный Cron endpoint для проверок
 * Вызывается каждые 30 минут через Vercel Cron
 * 
 * Выполняет:
 * 1. Проверку и восстановление закрепленных цен
 * 2. Проверку и оптимизацию рекламных кампаний (каждый 6-й запуск = каждые 3 часа)
 * 
 * Для настройки в vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-all",
 *     "schedule": "0,30 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации cron запроса
    // Vercel Cron отправляет заголовок x-vercel-cron: 1
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Разрешаем запросы от Vercel Cron или с правильным CRON_SECRET
    const isAuthorized = isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);
    
    if (!isAuthorized) {
      console.warn('⚠️ [Check All Cron] Неавторизованный запрос');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 [Check All Cron] Запуск универсальной проверки');

    const results: any = {
      prices: { checked: 0, restored: 0, errors: 0, results: [] },
      campaigns: { checked: 0, optimized: 0, errors: 0, results: [] }
    };

    // ============================================
    // ЧАСТЬ 1: ПРОВЕРКА ЗАКРЕПЛЕННЫХ ЦЕН
    // ============================================
    try {
      console.log('💰 [Check All Cron] Начало проверки закрепленных цен...');

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

      console.log(`📊 [Check All Cron] Найдено товаров с закрепленной ценой: ${lockedProducts.length}`);

      // Проверяем каждый товар
      for (const product of lockedProducts) {
        try {
          // Пропускаем если нет кабинета или API токена
          if (!product.productCabinets || product.productCabinets.length === 0) {
            console.warn(`⚠️ [Check All Cron] Товар ${product.name} (${product.id}): нет кабинета`);
            continue;
          }

          const cabinet = product.productCabinets[0].cabinet;
          if (!cabinet || !cabinet.isActive || !cabinet.apiToken) {
            console.warn(`⚠️ [Check All Cron] Товар ${product.name} (${product.id}): кабинет неактивен`);
            continue;
          }

          if (!product.lockedPrice) {
            console.warn(`⚠️ [Check All Cron] Товар ${product.name} (${product.id}): не указана закрепленная цена`);
            continue;
          }

          results.prices.checked++;

          // Получаем текущую цену с WB
          const priceInfo = await wbApiService.getProductPrice(cabinet.apiToken, parseInt(product.wbNmId!));
          
          if (!priceInfo.success || !priceInfo.data) {
            console.warn(`⚠️ [Check All Cron] Товар ${product.name}: не удалось получить цену с WB`);
            results.prices.errors++;
            results.prices.results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: priceInfo.error
            });
            continue;
          }

          const currentWbPrice = priceInfo.data.price;
          const lockedPrice = product.lockedPrice;

          console.log(`💰 [Check All Cron] Товар ${product.name}: WB=${currentWbPrice}₽, закреплено=${lockedPrice}₽`);

          // Если цена изменилась - восстанавливаем
          if (Math.abs(currentWbPrice - lockedPrice) > 0.01) {
            console.log(`🔄 [Check All Cron] Восстанавливаем цену для ${product.name}: ${currentWbPrice}₽ → ${lockedPrice}₽`);
            
            const restoreResult = await wbApiService.setProductPriceWithRetry(
              cabinet.apiToken,
              parseInt(product.wbNmId!),
              lockedPrice,
              3,
              5000
            );

            if (restoreResult.success) {
              results.prices.restored++;
              
              // Обновляем цену в БД
              await prisma.product.update({
                where: { id: product.id },
                data: {
                  discountPrice: lockedPrice,
                  price: lockedPrice
                }
              });

              console.log(`✅ [Check All Cron] Цена восстановлена для ${product.name}`);
              
              results.prices.results.push({
                productId: product.id,
                productName: product.name,
                status: 'restored',
                previousPrice: currentWbPrice,
                restoredPrice: lockedPrice
              });
            } else {
              results.prices.errors++;
              console.error(`❌ [Check All Cron] Не удалось восстановить цену для ${product.name}: ${restoreResult.error}`);
              
              results.prices.results.push({
                productId: product.id,
                productName: product.name,
                status: 'error',
                error: restoreResult.error
              });
            }
          } else {
            results.prices.results.push({
              productId: product.id,
              productName: product.name,
              status: 'ok',
              currentPrice: currentWbPrice
            });
          }

          // Задержка между проверками товаров
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          results.prices.errors++;
          console.error(`❌ [Check All Cron] Ошибка проверки товара ${product.name}:`, error);
          
          results.prices.results.push({
            productId: product.id,
            productName: product.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`✅ [Check All Cron] Проверка цен завершена: проверено ${results.prices.checked}, восстановлено ${results.prices.restored}, ошибок ${results.prices.errors}`);

    } catch (error) {
      console.error('❌ [Check All Cron] Критическая ошибка проверки цен:', error);
      results.prices.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // ============================================
    // ЧАСТЬ 2: ПРОВЕРКА РЕКЛАМНЫХ КАМПАНИЙ
    // ВРЕМЕННО ОТКЛЮЧЕНО - используйте /api/cron/check-campaigns
    // ============================================
    
    console.log(`⏭️ [Check All Cron] Проверка кампаний отключена - используйте /api/cron/check-campaigns`);
    results.campaigns.skipped = true;
    results.campaigns.nextCheck = 'Используйте /api/cron/check-campaigns';

    // ============================================
    // ИТОГОВЫЙ РЕЗУЛЬТАТ
    // ============================================
    console.log(`✅ [Check All Cron] Универсальная проверка завершена`);

    return NextResponse.json({
      success: true,
      prices: {
        checked: results.prices.checked,
        restored: results.prices.restored,
        errors: results.prices.errors,
        results: results.prices.results
      },
      campaigns: {
        checked: results.campaigns.checked,
        optimized: results.campaigns.optimized,
        errors: results.campaigns.errors,
        skipped: results.campaigns.skipped,
        nextCheck: results.campaigns.nextCheck,
        results: results.campaigns.results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Check All Cron] Критическая ошибка:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка выполнения cron job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint для ручного запуска проверки
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
