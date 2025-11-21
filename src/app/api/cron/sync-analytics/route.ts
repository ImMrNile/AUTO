// src/app/api/cron/sync-analytics/route.ts - Cron job для автоматической синхронизации аналитики

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { WbProductAnalyticsService } from '../../../../../lib/services/wbProductAnalyticsService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Cron endpoint для автоматической синхронизации аналитики
 * Вызывается каждый час через внешний cron сервис (например, Vercel Cron)
 * 
 * Для настройки в vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-analytics",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
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
      console.warn('⚠️ Неавторизованная попытка запуска cron job');
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('🕐 Запуск автоматической синхронизации аналитики');

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

    if (cabinets.length === 0) {
      console.log('ℹ️ Нет активных кабинетов для синхронизации');
      return NextResponse.json({
        success: true,
        message: 'Нет активных кабинетов',
        synced: 0
      });
    }

    console.log(`📊 Найдено ${cabinets.length} активных кабинетов`);

    let totalSynced = 0;
    let totalFailed = 0;
    const results: any[] = [];

    // Синхронизируем товары для каждого кабинета
    for (const cabinet of cabinets) {
      try {
        console.log(`🔄 Синхронизация кабинета: ${cabinet.name || cabinet.id}`);

        // Получаем товары кабинета, которые нужно синхронизировать
        const products = await safePrismaOperation(
          () => prisma.product.findMany({
            where: {
              userId: cabinet.userId,
              wbNmId: { not: null }
            },
            include: {
              analytics: true
            }
          }),
          'получение товаров кабинета'
        );

        // Фильтруем товары, которые не синхронизировались больше часа
        const productsToSync = products.filter(p => {
          if (!p.analytics) return true;
          
          const lastSync = p.analytics.lastSyncAt;
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
          
          return hoursSinceSync >= 1;
        });

        if (productsToSync.length === 0) {
          console.log(`✅ Кабинет ${cabinet.name}: все данные актуальны`);
          results.push({
            cabinetId: cabinet.id,
            cabinetName: cabinet.name,
            synced: 0,
            failed: 0,
            message: 'Все данные актуальны'
          });
          continue;
        }

        console.log(`📦 Кабинет ${cabinet.name}: синхронизация ${productsToSync.length} товаров`);
        console.log(`⏱️ Задержка между запросами: 3000мс (увеличена для избежания 429 ошибок)`);

        // Создаем сервис аналитики
        const analyticsService = new WbProductAnalyticsService(cabinet.apiToken!);

        // Получаем nmIds товаров
        const nmIds = productsToSync
          .map(p => p.wbNmId)
          .filter((nmId): nmId is string => nmId !== null)
          .map(nmId => parseInt(nmId));

        // Получаем аналитику (с увеличенной задержкой между запросами)
        const analyticsData = await analyticsService.getBulkProductAnalytics(
          nmIds,
          30, // За последние 30 дней
          3000 // Задержка 3 секунды между запросами для избежания 429
        );

        // Сохраняем данные в БД
        let synced = 0;
        let failed = 0;

        for (let i = 0; i < productsToSync.length; i++) {
          const product = productsToSync[i];
          const analytics = analyticsData[i];

          if (!analytics) {
            failed++;
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

            synced++;

          } catch (error) {
            failed++;
            console.error(`❌ Ошибка синхронизации товара ${product.id}:`, error);
          }
        }

        totalSynced += synced;
        totalFailed += failed;

        results.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          synced,
          failed,
          total: productsToSync.length
        });

        console.log(`✅ Кабинет ${cabinet.name}: синхронизировано ${synced}, ошибок ${failed}`);

        // Задержка между кабинетами
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Ошибка синхронизации кабинета ${cabinet.id}:`, error);
        results.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    console.log(`✅ Автоматическая синхронизация завершена: ${totalSynced} успешно, ${totalFailed} ошибок`);

    return NextResponse.json({
      success: true,
      totalSynced,
      totalFailed,
      cabinetsProcessed: cabinets.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Критическая ошибка cron job:', error);
    return NextResponse.json({
      error: 'Ошибка выполнения cron job',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * Альтернативный POST endpoint для ручного запуска синхронизации
 */
export async function POST(request: NextRequest) {
  // Используем тот же код, что и GET
  return GET(request);
}
