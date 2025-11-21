import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { WbProductAnalyticsService } from '@/lib/services/wbProductAnalyticsService';

/**
 * Фоновая синхронизация аналитики товаров
 * Работает часами, постепенно синхронизируя все товары
 */
export const syncAnalytics = inngest.createFunction(
  { 
    id: 'sync-analytics-background',
    name: 'Фоновая синхронизация аналитики'
  },
  { event: 'analytics/sync.background' },
  async ({ event, step }) => {
    const { userId, cabinetId, batchSize = 10 } = event.data;

    console.log(`🔄 [Analytics Sync] Начало фоновой синхронизации для пользователя ${userId}`);

    // Шаг 1: Получаем кабинет
    const cabinet = await step.run('get-cabinet', async () => {
      return await prisma.cabinet.findFirst({
        where: {
          userId,
          ...(cabinetId && { id: cabinetId })
        }
      });
    });

    if (!cabinet) {
      throw new Error('Кабинет не найден');
    }

    console.log(`✅ Кабинет найден: ${cabinet.name}`);

    // Шаг 2: Получаем все товары пользователя
    const products = await step.run('get-products', async () => {
      return await prisma.product.findMany({
        where: {
          userId,
          wbNmId: { not: null }
        },
        include: {
          analytics: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    console.log(`📦 Найдено товаров: ${products.length}`);

    if (products.length === 0) {
      return { success: true, message: 'Нет товаров для синхронизации' };
    }

    // Шаг 3: Разбиваем на батчи и синхронизируем постепенно
    const batches = [];
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }

    console.log(`📊 Разбито на ${batches.length} батчей по ${batchSize} товаров`);

    let totalSynced = 0;
    let totalFailed = 0;

    // Обрабатываем каждый батч с задержкой
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      await step.run(`sync-batch-${batchIndex}`, async () => {
        console.log(`🔄 Батч ${batchIndex + 1}/${batches.length}: синхронизация ${batch.length} товаров`);

        if (!cabinet.apiToken) {
          throw new Error('API токен кабинета не найден');
        }

        const analyticsService = new WbProductAnalyticsService(cabinet.apiToken);
        const nmIds = batch
          .map(p => p.wbNmId)
          .filter((nmId): nmId is string => nmId !== null)
          .map(nmId => parseInt(nmId));

        // Получаем аналитику для батча (с задержками внутри)
        const analyticsData = await analyticsService.getBulkProductAnalytics(
          nmIds,
          30, // 30 дней
          15000 // 15 секунд между товарами (очень консервативно)
        );

        // Сохраняем данные в БД
        for (let i = 0; i < batch.length; i++) {
          const product = batch[i];
          const analytics = analyticsData[i];

          try {
            // Обновляем или создаем запись аналитики
            await prisma.productAnalytics.upsert({
              where: { productId: product.id },
              create: {
                productId: product.id,
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
                dataSource: analytics.dataSource,
                syncStatus: analytics.syncStatus,
                syncError: analytics.syncError,
                lastSyncAt: new Date()
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
                dataSource: analytics.dataSource,
                syncStatus: analytics.syncStatus,
                syncError: analytics.syncError,
                lastSyncAt: new Date()
              }
            });

            totalSynced++;
            console.log(`✅ Товар ${product.wbNmId}: аналитика сохранена`);
          } catch (error) {
            totalFailed++;
            console.error(`❌ Товар ${product.wbNmId}: ошибка сохранения`, error);
          }
        }

        return { synced: batch.length };
      });

      // Задержка между батчами (2 минуты)
      if (batchIndex < batches.length - 1) {
        await step.sleep('wait-between-batches', '2m');
      }
    }

    console.log(`✅ Синхронизация завершена: ${totalSynced} успешно, ${totalFailed} ошибок`);

    return {
      success: true,
      totalProducts: products.length,
      synced: totalSynced,
      failed: totalFailed,
      batches: batches.length
    };
  }
);
