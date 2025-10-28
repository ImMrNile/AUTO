// src/app/api/analytics/sync/route.ts - API для синхронизации аналитики товаров с WB

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WbProductAnalyticsService } from '../../../../../lib/services/wbProductAnalyticsService';

/**
 * POST - Синхронизация аналитики для товаров пользователя
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Запуск синхронизации аналитики товаров');

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      productIds, // Опционально: синхронизировать только определенные товары
      daysBack = 30, // За сколько дней получать данные
      forceSync = false // Принудительная синхронизация даже если данные свежие
    } = body;

    // Получаем активный кабинет пользователя
    const cabinets = await safePrismaOperation(
      () => prisma.cabinet.findMany({
        where: { userId: user.id, isActive: true }
      }),
      'получение кабинетов'
    );

    if (cabinets.length === 0) {
      return NextResponse.json({
        error: 'У пользователя нет активных кабинетов'
      }, { status: 400 });
    }

    const cabinet = cabinets[0];
    if (!cabinet.apiToken) {
      return NextResponse.json({
        error: 'У кабинета отсутствует API токен'
      }, { status: 400 });
    }

    // Получаем товары для синхронизации
    const whereClause: any = { 
      userId: user.id,
      wbNmId: { not: null } // Только товары с nmId
    };

    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const products = await safePrismaOperation(
      () => prisma.product.findMany({
        where: whereClause,
        include: {
          analytics: true
        }
      }),
      'получение товаров'
    );

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Нет товаров для синхронизации',
        synced: 0,
        failed: 0
      });
    }

    console.log(`📦 Найдено ${products.length} товаров для синхронизации`);

    // Фильтруем товары, которые нужно синхронизировать
    const productsToSync = forceSync 
      ? products 
      : products.filter(p => {
          if (!p.analytics) return true; // Нет аналитики - синхронизируем
          
          const lastSync = p.analytics.lastSyncAt;
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
          
          return hoursSinceSync >= 1; // Синхронизируем если прошло больше часа
        });

    if (productsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Все данные актуальны, синхронизация не требуется',
        synced: 0,
        failed: 0,
        total: products.length
      });
    }

    console.log(`🔄 Синхронизация ${productsToSync.length} товаров`);

    // Создаем сервис аналитики
    const analyticsService = new WbProductAnalyticsService(cabinet.apiToken);

    // Получаем nmIds товаров
    const nmIds = productsToSync
      .map(p => p.wbNmId)
      .filter((nmId): nmId is string => nmId !== null)
      .map(nmId => parseInt(nmId));

    // Получаем аналитику для всех товаров
    const analyticsData = await analyticsService.getBulkProductAnalytics(
      nmIds,
      daysBack,
      1000 // Задержка 1 секунда между запросами
    );

    // Сохраняем данные в БД
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < productsToSync.length; i++) {
      const product = productsToSync[i];
      const analytics = analyticsData[i];

      if (!analytics) {
        failed++;
        errors.push(`Товар ${product.id}: нет данных аналитики`);
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
        console.log(`✅ Синхронизирован товар ${product.id} (${product.name})`);

      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
        errors.push(`Товар ${product.id}: ${errorMsg}`);
        console.error(`❌ Ошибка синхронизации товара ${product.id}:`, error);
      }
    }

    console.log(`✅ Синхронизация завершена: успешно ${synced}, ошибок ${failed}`);

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: productsToSync.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка синхронизации аналитики:', error);
    return NextResponse.json({
      error: 'Ошибка синхронизации',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * GET - Получение статуса последней синхронизации
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получаем статистику по аналитике товаров пользователя
    const products = await safePrismaOperation(
      () => prisma.product.findMany({
        where: { userId: user.id },
        include: {
          analytics: true
        }
      }),
      'получение товаров'
    );

    const totalProducts = products.length;
    const productsWithAnalytics = products.filter(p => p.analytics).length;
    const productsWithoutAnalytics = totalProducts - productsWithAnalytics;

    // Находим последнюю синхронизацию
    const lastSync = products
      .map(p => p.analytics?.lastSyncAt)
      .filter((date): date is Date => date !== undefined)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    // Считаем статусы
    const statusCounts = products.reduce((acc, p) => {
      const status = p.analytics?.syncStatus || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      totalProducts,
      productsWithAnalytics,
      productsWithoutAnalytics,
      lastSync: lastSync?.toISOString(),
      statusCounts,
      needsSync: productsWithoutAnalytics > 0 || (lastSync && (Date.now() - lastSync.getTime()) > 60 * 60 * 1000)
    });

  } catch (error) {
    console.error('❌ Ошибка получения статуса синхронизации:', error);
    return NextResponse.json({
      error: 'Ошибка получения статуса',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
