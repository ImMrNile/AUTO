// src/app/api/cron/sync-products/route.ts - Cron job для синхронизации товаров (остатки, цены, продажи)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { wbApiService } from '../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Cron endpoint для автоматической синхронизации товаров
 * Вызывается каждые 2 часа через Vercel Cron
 * 
 * Синхронизирует:
 * - Остатки товаров (stock)
 * - Цены (price, discountPrice)
 * - Статус публикации
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
      console.warn('⚠️ [Sync Products Cron] Неавторизованная попытка запуска');
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('🕐 [Sync Products Cron] Запуск автоматической синхронизации товаров');

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
      console.log('ℹ️ [Sync Products Cron] Нет активных кабинетов для синхронизации');
      return NextResponse.json({
        success: true,
        message: 'Нет активных кабинетов',
        synced: 0
      });
    }

    console.log(`📊 [Sync Products Cron] Найдено ${cabinets.length} активных кабинетов`);

    let totalSynced = 0;
    let totalFailed = 0;
    const results: any[] = [];

    // Синхронизируем товары для каждого кабинета
    for (const cabinet of cabinets) {
      try {
        console.log(`🔄 [Sync Products Cron] Синхронизация кабинета: ${cabinet.name || cabinet.id}`);

        // Получаем опубликованные товары кабинета
        const products = await safePrismaOperation(
          () => prisma.product.findMany({
            where: {
              userId: cabinet.userId,
              wbNmId: { not: null },
              status: 'PUBLISHED'
            }
          }),
          'получение товаров кабинета'
        );

        if (!products || products.length === 0) {
          console.log(`✅ [Sync Products Cron] Кабинет ${cabinet.name}: нет опубликованных товаров`);
          results.push({
            cabinetId: cabinet.id,
            cabinetName: cabinet.name,
            synced: 0,
            failed: 0,
            message: 'Нет опубликованных товаров'
          });
          continue;
        }

        console.log(`📦 [Sync Products Cron] Кабинет ${cabinet.name}: синхронизация ${products.length} товаров`);

        let synced = 0;
        let failed = 0;
        let rateLimitErrors = 0;

        try {
          // 1. БАТЧ-ЗАПРОС: Получаем ВСЕ цены одним запросом
          const nmIds = products.map(p => parseInt(p.wbNmId!));
          const pricesMap = await wbApiService.getBatchPrices(cabinet.apiToken!, nmIds);

          // 2. БАТЧ-ЗАПРОС: Получаем ВСЕ остатки одним запросом
          let stocksMap = new Map<number, number>();
          try {
            stocksMap = await wbApiService.getBatchStocks(cabinet.apiToken!);
          } catch (stockError: any) {
            if (stockError.message?.includes('Превышен лимит')) {
              rateLimitErrors++;
              console.log(`⚠️ [Sync Products Cron] Лимит WB API при получении остатков, пропускаем`);
            } else {
              console.error(`⚠️ [Sync Products Cron] Ошибка получения остатков:`, stockError);
            }
          }

          // 3. Обновляем данные в БД для каждого товара
          for (const product of products) {
            try {
              const nmId = parseInt(product.wbNmId!);
              const updateData: any = {};
              let hasChanges = false;

              // Обновляем цену если получили
              const wbPrice = pricesMap.get(nmId);
              if (wbPrice && Math.abs(wbPrice - (product.discountPrice || 0)) > 0.01) {
                updateData.discountPrice = wbPrice;
                updateData.price = wbPrice;
                hasChanges = true;
                console.log(`💰 [Sync Products Cron] ${product.name}: ${product.discountPrice}₽ → ${wbPrice}₽`);
              }

              // Обновляем остатки если получили
              if (stocksMap.has(nmId)) {
                const totalStock = stocksMap.get(nmId);
                if (totalStock !== product.stock) {
                  updateData.stock = totalStock;
                  hasChanges = true;
                  console.log(`📦 [Sync Products Cron] ${product.name}: ${product.stock} → ${totalStock} шт`);
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
                synced++;
              }
            } catch (error) {
              failed++;
              console.error(`❌ [Sync Products Cron] Ошибка обновления ${product.name}:`, error);
            }
          }
        } catch (error: any) {
          // Проверяем на ошибки с лимитами
          if (error.message?.includes('Превышен лимит')) {
            rateLimitErrors++;
            console.log(`⚠️ [Sync Products Cron] Лимит WB API превышен для кабинета ${cabinet.name}`);
          } else {
            console.error(`❌ [Sync Products Cron] Ошибка синхронизации кабинета ${cabinet.name}:`, error);
          }
        }

        totalSynced += synced;
        totalFailed += failed;

        results.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          synced,
          failed,
          rateLimitErrors,
          total: products.length
        });

        console.log(`✅ [Sync Products Cron] Кабинет ${cabinet.name}: синхронизировано ${synced}, ошибок ${failed}, лимитов ${rateLimitErrors}`);

        // Задержка между кабинетами
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ [Sync Products Cron] Ошибка синхронизации кабинета ${cabinet.id}:`, error);
        results.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    console.log(`✅ [Sync Products Cron] Автоматическая синхронизация завершена: ${totalSynced} успешно, ${totalFailed} ошибок`);

    return NextResponse.json({
      success: true,
      totalSynced,
      totalFailed,
      cabinetsProcessed: cabinets.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Sync Products Cron] Критическая ошибка:', error);
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
