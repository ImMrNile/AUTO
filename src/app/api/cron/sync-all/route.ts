// src/app/api/cron/sync-all/route.ts
// Универсальный Cron Job для синхронизации аналитики и товаров
// Объединяет sync-analytics и sync-products в один endpoint

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { WbProductAnalyticsService } from '../../../../../lib/services/wbProductAnalyticsService';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


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
      console.warn('⚠️ [Sync All Cron] Неавторизованная попытка запуска');
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('🕐 [Sync All Cron] Запуск универсальной синхронизации');

    // Получаем все активные кабинеты с токенами
    const cabinets = await safePrismaOperation(
      () => prisma.cabinet.findMany({
        where: { 
          isActive: true,
          apiToken: { not: null }
        },
        include: {
          user: true
        }
      }),
      'получение активных кабинетов'
    );

    if (!cabinets || cabinets.length === 0) {
      console.log('ℹ️ [Sync All Cron] Нет активных кабинетов для синхронизации');
      return NextResponse.json({
        success: true,
        message: 'Нет активных кабинетов',
        analytics: { synced: 0 },
        products: { synced: 0 }
      });
    }

    console.log(`📊 [Sync All Cron] Найдено ${cabinets.length} активных кабинетов`);

    let totalAnalyticsSynced = 0;
    let totalAnalyticsFailed = 0;
    let totalProductsSynced = 0;
    let totalProductsFailed = 0;
    const results: any[] = [];

    // Синхронизируем каждый кабинет
    for (const cabinet of cabinets) {
      try {
        console.log(`🔄 [Sync All Cron] Синхронизация кабинета: ${cabinet.name || cabinet.id}`);

        const cabinetResult: any = {
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          analytics: { synced: 0, failed: 0 },
          products: { synced: 0, failed: 0 }
        };

        // ============================================
        // ЧАСТЬ 1: СИНХРОНИЗАЦИЯ АНАЛИТИКИ
        // ============================================
        try {
          console.log(`📊 [Sync All Cron] Синхронизация аналитики для ${cabinet.name}`);

          // Получаем товары для аналитики
          const productsForAnalytics = await safePrismaOperation(
            () => prisma.product.findMany({
              where: {
                userId: cabinet.userId,
                wbNmId: { not: null }
              },
              include: {
                analytics: true
              }
            }),
            'получение товаров для аналитики'
          );

          // Фильтруем товары, которые не синхронизировались больше 2 часов
          const productsToSyncAnalytics = productsForAnalytics.filter(p => {
            if (!p.analytics) return true;
            
            const lastSync = p.analytics.lastSyncAt;
            const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
            
            return hoursSinceSync >= 2;
          });

          if (productsToSyncAnalytics.length > 0) {
            console.log(`📦 [Sync All Cron] Синхронизация аналитики: ${productsToSyncAnalytics.length} товаров`);

            // Создаем сервис аналитики
            const analyticsService = new WbProductAnalyticsService(cabinet.apiToken!);

            // Получаем nmIds товаров
            const nmIds = productsToSyncAnalytics
              .map(p => p.wbNmId)
              .filter((nmId): nmId is string => nmId !== null)
              .map(nmId => parseInt(nmId));

            // Получаем аналитику (с задержкой между запросами)
            const analyticsData = await analyticsService.getBulkProductAnalytics(
              nmIds,
              30, // За последние 30 дней
              1500 // Задержка 1.5 секунды между запросами
            );

            // Сохраняем данные в БД
            for (let i = 0; i < productsToSyncAnalytics.length; i++) {
              const product = productsToSyncAnalytics[i];
              const analytics = analyticsData[i];

              if (!analytics) {
                cabinetResult.analytics.failed++;
                continue;
              }

              try {
                await safePrismaOperation(
                  () => prisma.productAnalytics.upsert({
                    where: { productId: product.id },
                    create: {
                      productId: product.id,
                      nmId: analytics.nmId,
                      views: analytics.views,
                      addToCart: analytics.addToCart,
                      orders: analytics.orders,
                      ctr: analytics.ctr,
                      conversionRate: analytics.conversionRate,
                      topSearchQueries: analytics.topSearchQueries as any,
                      totalQueries: analytics.totalQueries,
                      revenue: analytics.revenue,
                      units: analytics.units,
                      avgOrderValue: analytics.avgOrderValue,
                      lastSyncAt: new Date(),
                      syncStatus: analytics.syncStatus,
                      syncError: analytics.syncError,
                      dataSource: analytics.dataSource
                    },
                    update: {
                      views: analytics.views,
                      addToCart: analytics.addToCart,
                      orders: analytics.orders,
                      ctr: analytics.ctr,
                      conversionRate: analytics.conversionRate,
                      topSearchQueries: analytics.topSearchQueries as any,
                      totalQueries: analytics.totalQueries,
                      revenue: analytics.revenue,
                      units: analytics.units,
                      avgOrderValue: analytics.avgOrderValue,
                      lastSyncAt: new Date(),
                      syncStatus: analytics.syncStatus,
                      syncError: analytics.syncError,
                      dataSource: analytics.dataSource
                    }
                  }),
                  `сохранение аналитики товара ${product.id}`
                );

                cabinetResult.analytics.synced++;
                totalAnalyticsSynced++;

              } catch (error) {
                cabinetResult.analytics.failed++;
                totalAnalyticsFailed++;
                console.error(`❌ [Sync All Cron] Ошибка синхронизации аналитики товара ${product.id}:`, error);
              }
            }

            console.log(`✅ [Sync All Cron] Аналитика: синхронизировано ${cabinetResult.analytics.synced}, ошибок ${cabinetResult.analytics.failed}`);
          } else {
            console.log(`✅ [Sync All Cron] Аналитика: все данные актуальны`);
          }

        } catch (error) {
          console.error(`❌ [Sync All Cron] Ошибка синхронизации аналитики кабинета ${cabinet.id}:`, error);
          cabinetResult.analytics.error = error instanceof Error ? error.message : 'Неизвестная ошибка';
        }

        // ============================================
        // ЧАСТЬ 2: СИНХРОНИЗАЦИЯ ТОВАРОВ (ОСТАТКИ, ЦЕНЫ)
        // ============================================
        try {
          console.log(`📦 [Sync All Cron] Синхронизация товаров для ${cabinet.name}`);

          // Получаем опубликованные товары
          const productsForSync = await safePrismaOperation(
            () => prisma.product.findMany({
              where: {
                userId: cabinet.userId,
                wbNmId: { not: null },
                status: 'PUBLISHED'
              }
            }),
            'получение товаров для синхронизации'
          );

          if (productsForSync && productsForSync.length > 0) {
            console.log(`📦 [Sync All Cron] Синхронизация товаров: ${productsForSync.length} товаров`);

            // Синхронизируем каждый товар
            for (const product of productsForSync) {
              try {
                const nmId = parseInt(product.wbNmId!);

                // 1. Получаем текущую цену с WB
                const priceInfo = await wbApiService.getProductPrice(cabinet.apiToken!, nmId);
                
                // 2. Получаем текущие остатки с WB (если есть barcode)
                let stockInfo = null;
                if (product.barcode) {
                  stockInfo = await wbApiService.getProductStock(cabinet.apiToken!, nmId);
                }

                // Обновляем данные в БД
                const updateData: any = {};
                let hasChanges = false;

                // Обновляем цену если получили
                if (priceInfo.success && priceInfo.data) {
                  const wbPrice = priceInfo.data.price;
                  if (Math.abs(wbPrice - (product.discountPrice || 0)) > 0.01) {
                    updateData.discountPrice = wbPrice;
                    updateData.price = wbPrice;
                    hasChanges = true;
                    console.log(`💰 [Sync All Cron] Товар ${product.name}: цена обновлена ${product.discountPrice}₽ → ${wbPrice}₽`);
                  }
                }

                // Обновляем остатки если получили
                if (stockInfo && stockInfo.success && stockInfo.data && stockInfo.data.wbStocks) {
                  const totalStock = stockInfo.data.wbStocks.reduce((sum: number, s: any) => sum + s.amount, 0);
                  if (totalStock !== product.stock) {
                    updateData.stock = totalStock;
                    hasChanges = true;
                    console.log(`📦 [Sync All Cron] Товар ${product.name}: остаток обновлен ${product.stock} → ${totalStock}`);
                  }
                }

                // Сохраняем изменения если есть
                if (hasChanges) {
                  await safePrismaOperation(
                    () => prisma.product.update({
                      where: { id: product.id },
                      data: updateData
                    }),
                    `обновление товара ${product.id}`
                  );
                  cabinetResult.products.synced++;
                  totalProductsSynced++;
                }

                // Задержка между товарами
                await new Promise(resolve => setTimeout(resolve, 1500));

              } catch (error) {
                cabinetResult.products.failed++;
                totalProductsFailed++;
                console.error(`❌ [Sync All Cron] Ошибка синхронизации товара ${product.name}:`, error);
              }
            }

            console.log(`✅ [Sync All Cron] Товары: синхронизировано ${cabinetResult.products.synced}, ошибок ${cabinetResult.products.failed}`);
          } else {
            console.log(`✅ [Sync All Cron] Товары: нет опубликованных товаров`);
          }

        } catch (error) {
          console.error(`❌ [Sync All Cron] Ошибка синхронизации товаров кабинета ${cabinet.id}:`, error);
          cabinetResult.products.error = error instanceof Error ? error.message : 'Неизвестная ошибка';
        }

        results.push(cabinetResult);

        // Задержка между кабинетами
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ [Sync All Cron] Ошибка обработки кабинета ${cabinet.id}:`, error);
        results.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    console.log(`✅ [Sync All Cron] Синхронизация завершена:`);
    console.log(`   Аналитика: ${totalAnalyticsSynced} успешно, ${totalAnalyticsFailed} ошибок`);
    console.log(`   Товары: ${totalProductsSynced} успешно, ${totalProductsFailed} ошибок`);

    return NextResponse.json({
      success: true,
      analytics: {
        synced: totalAnalyticsSynced,
        failed: totalAnalyticsFailed
      },
      products: {
        synced: totalProductsSynced,
        failed: totalProductsFailed
      },
      cabinetsProcessed: cabinets.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Sync All Cron] Критическая ошибка:', error);
    return NextResponse.json({
      error: 'Ошибка выполнения cron job',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * POST endpoint для ручного запуска синхронизации
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
