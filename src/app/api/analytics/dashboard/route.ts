// src/app/api/analytics/dashboard/route.ts - Комплексная аналитика для дашборда + КЕШИРОВАНИЕ

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Основной клиент для auth
import { prismaAnalytics } from '@/lib/prisma-analytics'; // Отдельный клиент для аналитики
import { safePrismaOperation } from '@/lib/prisma-utils';
import { AuthService } from '@/lib/auth/auth-service';
import { WB_API_CONFIG } from '@/lib/config/wbApiConfig';
import { WbFinancialCalculator } from '@/lib/services/wbFinancialCalculator';
import { WbConversionService } from '@/lib/services/wbConversionService';
import { WbReportService } from '@/lib/services/wbReportService';
import { WbTariffService } from '@/lib/services/wbTariffService'; // ✅ Для получения KTR
import { WbPenaltiesService } from '@/lib/services/wbPenaltiesService'; // ✅ Для актуальных штрафов и удержаний
import { AnalyticsCalculator } from '@/lib/services/analyticsCalculator'; // ✅ Новый расчет из БД
import { WbAnalyticsEngine } from '@/lib/services/wbAnalyticsEngine'; // ✅ Комплексный движок аналитики
import { getCached, setCached } from '@/lib/cache/redis'; // ✅ Redis кеширование
import { CacheService } from '@/lib/services/cacheService'; // ✅ Кеширование в БД

export const runtime = "nodejs";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// НАСТРОЙКИ КЕШИРОВАНИЯ И RATE LIMITING
// WB API имеет строгие лимиты: ~1 запрос в минуту для некоторых эндпоинтов
const CACHE_CONFIG = {
  CACHE_TTL: 6 * 60 * 60 * 1000, // 6 часов
  DELAY_BETWEEN_REQUESTS: 3000, // 3000ms между запросами (увеличено для WB rate limits)
  MIN_DELAY_BETWEEN_REQUESTS: 1000, // Минимальная задержка 1 секунда
  RETRY_DELAYS: [35000, 60000, 90000, 120000], // 35с, 60с, 90с, 120с (WB рекомендует 35с)
  MAX_RETRIES: 4
};

// Глобальный счетчик для отслеживания оставшихся запросов
let rateLimitRemaining: number | null = null;
let rateLimitResetTime: number | null = null;

// Утилита для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Универсальная функция retry с экспоненциальным backoff для WB API
 * Использует заголовки X-Ratelimit-* для динамического управления запросами
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = CACHE_CONFIG.MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Проверяем, нужно ли ждать перед запросом
      if (rateLimitRemaining !== null && rateLimitRemaining <= 1) {
        if (rateLimitResetTime && rateLimitResetTime > Date.now()) {
          const waitTime = rateLimitResetTime - Date.now() + 1000; // +1 секунда для безопасности
          console.warn(`⚠️ Rate limit близок к исчерпанию (${rateLimitRemaining} запросов), ожидание ${Math.round(waitTime/1000)}с...`);
          await delay(waitTime);
        }
      }
      
      const response = await fetch(url, options);
      
      // Обрабатываем заголовки rate limit
      const remaining = response.headers.get('X-Ratelimit-Remaining');
      const reset = response.headers.get('X-Ratelimit-Reset');
      const retry = response.headers.get('X-Ratelimit-Retry');
      
      if (remaining) {
        rateLimitRemaining = parseInt(remaining);
        console.log(`📊 Rate limit remaining: ${rateLimitRemaining}`);
      }
      
      if (reset) {
        const resetSeconds = parseInt(reset);
        rateLimitResetTime = Date.now() + (resetSeconds * 1000);
      }
      
      if (response.status === 429 && attempt < retries) {
        // Используем заголовок X-Ratelimit-Retry если доступен
        let delayMs = CACHE_CONFIG.RETRY_DELAYS[attempt] || 20000;
        
        if (retry) {
          delayMs = parseInt(retry) * 1000 + 1000; // +1 секунда для безопасности
          console.warn(`⚠️ Rate limit (429) для ${url}, WB рекомендует ожидание ${delayMs/1000}с...`);
        } else {
          console.warn(`⚠️ Rate limit (429) для ${url}, ожидание ${delayMs}мс перед попыткой ${attempt + 2}/${retries + 1}...`);
        }
        
        await delay(delayMs);
        continue;
      }
      
      if (response.status >= 500 && response.status < 600 && attempt < retries) {
        const delayMs = CACHE_CONFIG.RETRY_DELAYS[attempt] || 20000;
        console.warn(`⚠️ Ошибка сервера (${response.status}), повтор через ${delayMs}мс...`);
        await delay(delayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt < retries) {
        const delayMs = CACHE_CONFIG.RETRY_DELAYS[attempt] || 20000;
        console.warn(`⚠️ Ошибка запроса, повтор через ${delayMs}мс...`, error);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`Превышено количество попыток запроса к ${url}`);
}

interface AnalyticsDashboardData {
  // Финансовая аналитика
  financial: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalForPay: number; // К переводу от WB (после вычета расходов WB, до вычета себестоимости)
    totalProfit: number; // Чистая прибыль (после вычета себестоимости)
    profitMargin: number;
    periodComparison: {
      revenueChange: number;
      ordersChange: number;
      profitChange: number;
    };
    // Детальные расходы
    expenses: {
      totalWbCommission: number;
      totalLogistics: number;
      logisticsToClient: number; // Логистика до клиента
      logisticsReturns: number; // Логистика возвратов (50₽ за единицу)
      returnsCount: number; // Количество возвратов
      totalStorage: number;
      totalAcceptance: number;
      totalPenalty: number; // Штрафы WB
      totalDeduction: number; // 🔥 Корректировка ВВ (удержания)
      totalOtherDeductions: number; // Прочие вычеты WB
      totalWbExpenses: number;
      totalCost: number; // Себестоимость товаров
      totalTaxes: number; // Налоги
      totalAdvertising: number; // Реклама
    };
    // Информация о себестоимости
    costInfo: {
      totalProducts: number; // Всего товаров в продажах
      productsWithCost: number; // Товаров с указанной себестоимостью
      productsWithoutCost: number; // Товаров без себестоимости
      coveragePercent: number; // Процент покрытия себестоимостью
      hasMissingCost: boolean; // Есть ли товары без себестоимости
      warning: string | null; // Предупреждение для пользователя
    };
  };
  
  // Статистика продаж
  sales: {
    todaySales: number;
    weekSales: number;
    monthSales: number;
    topProducts: Array<{
      nmID: number;
      title: string;
      revenue: number;
      orders: number;
      image: string;
    }>;
    allProducts: Array<{
      nmID: number;
      title: string;
      revenue: number;
      orders: number;
      image: string;
    }>;
    salesByDay: Array<{
      date: string;
      revenue: number;      // Выручка от выкупов
      orders: number;       // Количество выкупов (из детализированного отчета)
      orderCount?: number;  // Количество заказов (из воронки продаж)
      orderSum?: number;    // Сумма заказов
      buyoutCount?: number; // Количество выкупов (из воронки продаж)
      buyoutSum?: number;   // Сумма выкупов
      fbsBuyouts?: number;  // Выкупы FBS
      fbwBuyouts?: number;  // Выкупы FBW
      fbsRevenue?: number;  // Выручка FBS
      fbwRevenue?: number;  // Выручка FBW
    }>;
  };
  
  // Остатки и логистика
  inventory: {
    totalProducts: number;
    totalStock: number;
    lowStockProducts: number;
    lowStockProductsList?: Array<{
      nmId: number;
      quantity: number;
      warehouseName: string;
      title: string;
    }>;
    inTransit: number; // В пути к клиенту
    inReturn: number; // В пути от клиента (возвраты)
    reserved: number;
    stockValue: number;
    fbwStock: number; // Остатки на складах WB (FBW)
    fbsStock: number; // Остатки на складах продавца (FBS)
    fbwTotal?: number; // FBW всего (на складе + в пути)
    fbwInTransitToClient?: number; // FBW товары в пути к клиенту
    fbwInTransitFromClient?: number; // FBW товары в пути от клиента
    warehouseDetails: Array<{
      name: string;
      type: string; // 'FBS' или 'FBW'
      quantity: number;
      inWayToClient: number;
      inWayFromClient: number;
      total: number; // quantity + inWayToClient + inWayFromClient
    }>;
  };
  
  // Конверсия и эффективность
  conversion: {
    totalViews: number;
    addToCartRate: number;
    purchaseRate: number;
    avgCTR: number;
    cartAbandonmentRate: number;
  };
  
  // Топ поисковые запросы
  topSearchQueries: Array<{
    query: string;
    frequency: number;
    orders: number;
    revenue: number;
  }>;
  
  // Категории товаров
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    orders: number;
    avgPrice: number;
  }>;
  
  // Временные данные
  period: {
    start: string;
    end: string;
  };
  
  generatedAt: string;
}

/**
 * GET - Получение комплексной аналитики + КЕШИРОВАНИЕ
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Запрос комплексной аналитики дашборда');

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const days = parseInt(searchParams.get('days') || '30');
    
    console.log(`📋 Параметры запроса: days=${days}, forceRefresh=${forceRefresh}`);
    
    // Получаем активный кабинет
    const cabinets = await safePrismaOperation(
      () => prismaAnalytics.cabinet.findMany({
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

    // ВАЖНО: При forceRefresh обновляем остатки из WB API перед загрузкой аналитики
    if (forceRefresh) {
      console.log(`🔄 [Force Refresh] Обновление остатков из WB API перед загрузкой аналитики...`);
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        
        const stocksResponse = await fetch(`${baseUrl}/api/wb/stocks?cabinetId=${cabinet.id}`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        });
        
        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          console.log(`✅ [Force Refresh] Остатки обновлены: FBS=${stocksData.summary?.fbsTotal || 0}, FBW=${stocksData.summary?.fbwTotal || 0}`);
        } else {
          console.warn(`⚠️ [Force Refresh] Ошибка обновления остатков: ${stocksResponse.status}`);
        }
      } catch (error) {
        console.error(`❌ [Force Refresh] Не удалось обновить остатки:`, error);
      }
    }

    console.log(`✅ Работаем с кабинетом: ${cabinet.name || cabinet.id}`);

    // ============ БД КЕШИРОВАНИЕ (STALE-WHILE-REVALIDATE) ============
    const cacheKey = CacheService.createAnalyticsKey(user.id, cabinet.id, days);
    const CACHE_TTL_MINUTES = 60; // 1 час TTL
    
    // Проверяем кеш в БД (если не принудительное обновление)
    if (!forceRefresh) {
      const cached = await CacheService.get<any>(cacheKey);
      
      if (cached) {
        console.log(`✅ [DB Cache] Данные найдены в кеше БД`);
        return NextResponse.json({
          success: true,
          data: cached,
          fromCache: true,
          message: 'Данные из кеша. Нажмите "Обновить" для получения свежих данных.'
        });
      } else {
        console.log('⚠️ [DB Cache] Кеш отсутствует или истек, загружаем свежие данные из WB API...');
      }
    } else {
      console.log('🔄 [DB Cache] Принудительное обновление данных (forceRefresh=true), удаляем старый кеш...');
      await CacheService.delete(cacheKey);
    }

    // Рассчитываем временной период
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Получаем данные последовательно с увеличенными задержками для соблюдения rate limits
    console.log('📥 Получение данных с WB API (с увеличенными задержками для соблюдения rate limits)...');
    
    // ГИБРИДНАЯ ЛОГИКА: 
    // - Для 7+ дней используем детализированный отчет WB (реальные расходы)
    // - Для дня используем старый API + расчет расходов (отчет формируется раз в неделю)
    const useDetailedReport = days >= 7;  // ✅ ИЗМЕНЕНО: теперь используем детализированный отчет для недели!
    
    console.log(`📋 ГИБРИДНАЯ ЛОГИКА: days=${days}, useDetailedReport=${useDetailedReport}`);
    console.log(`📅 Период: ${startDate.toISOString().split('T')[0]} до ${endDate.toISOString().split('T')[0]}`);
    if (useDetailedReport) {
      console.log(`✅ Используем детализированный отчет WB (РЕАЛЬНЫЕ расходы из каждой записи)`);
    } else {
      console.log(`⚠️ Используем старый API + расчет расходов (отчет еще не готов, формируется по средам)`);
      
      // 🧪 ТЕСТОВЫЙ ЗАПРОС: Попробуем получить детализированный отчет за неделю для отладки
      console.log(`\n🧪 ТЕСТОВЫЙ ЗАПРОС: Проверяем доступность детализированного отчета за неделю...`);
      try {
        const reportService = new WbReportService(cabinet.apiToken);
        const testDetailedReport = await reportService.getDetailedReport(startDate, endDate);
        console.log(`🧪 Результат: получено ${testDetailedReport.length} записей из детализированного отчета за неделю`);
        
        if (testDetailedReport.length > 0) {
          console.log(`🧪 ВАЖНО: Детализированный отчет ДОСТУПЕН за неделю!`);
          console.log(`🧪 Первые 3 записи:`, testDetailedReport.slice(0, 3).map((r: any) => ({
            docTypeName: r.docTypeName,
            nmId: r.nmId,
            quantity: r.quantity,
            basePrice: r.basePrice,
            forPay: r.forPay,
            supplierReward: r.supplierReward
          })));
          console.log(`🧪 РЕКОМЕНДАЦИЯ: Можно использовать детализированный отчет для более точных расчетов!`);
        } else {
          console.log(`🧪 Детализированный отчет за неделю пуст (еще не готов)`);
        }
      } catch (testError: any) {
        console.log(`🧪 Ошибка при попытке получить детализированный отчет: ${testError.message}`);
      }
    }
    
    let salesData: any[] = [];
    let previousSalesData: any[] = [];
    let detailedReport: any[] = [];
    let previousDetailedReport: any[] = [];
    
    if (useDetailedReport) {
      console.log(`📊 Период ≥7 дней: используем детализированный отчет WB с РЕАЛЬНЫМИ расходами`);
      const reportService = new WbReportService(cabinet.apiToken);
      detailedReport = await reportService.getDetailedReport(startDate, endDate);
      console.log(`✅ Получено ${detailedReport.length} записей из детализированного отчета`);
      await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
      
      // ✅ ВАЖНО: Дополнительно загружаем выкупы из старого API для актуальных данных за последние дни
      // Детализированный отчет WB формируется с задержкой и не содержит данные за последние 2-3 дня
      salesData = await getWBSales(cabinet.apiToken, startDate, endDate);
      console.log(`✅ Получено ${salesData.length} выкупов из старого API (для актуальных данных)`);
      await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
      
      // ✅ Для сравнения используем старый API (previousSalesData)
      // previousDetailedReport не нужен, так как не используется в расчетах
      previousSalesData = await getWBSales(cabinet.apiToken, previousStartDate, startDate);
      console.log(`✅ Получено продаж за предыдущий период: ${previousSalesData.length}`);
      await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    } else {
      console.log('📊 Период <7 дней: используем старый API + расчет расходов');
      salesData = await getWBSales(cabinet.apiToken, startDate, endDate);
      console.log(`✅ Получено продаж: ${salesData.length}`);
      await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
      
      previousSalesData = await getWBSales(cabinet.apiToken, previousStartDate, startDate);
      console.log(`✅ Получено продаж за предыдущий период: ${previousSalesData.length}`);
      await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    }
    
    // Получаем баркоды товаров из БД для корректного расчета остатков
    const productsForBarcodes = await prismaAnalytics.product.findMany({
      where: {
        userId: user.id,
        wbNmId: { not: null }
      },
      select: {
        barcode: true,
        barcodes: true
      }
    });
    
    const allBarcodes: string[] = [];
    for (const product of productsForBarcodes) {
      if (product.barcodes && Array.isArray(product.barcodes)) {
        const validBarcodes = (product.barcodes as string[]).filter((b: any) => typeof b === 'string');
        allBarcodes.push(...validBarcodes);
      } else if (product.barcode && typeof product.barcode === 'string') {
        allBarcodes.push(product.barcode);
      }
    }
    console.log(`📦 Найдено ${allBarcodes.length} баркодов для загрузки остатков`);
    
    // Получаем остатки, заказы и товары (для всех периодов)
    const stocksData = await getWBStocks(cabinet.apiToken, allBarcodes, user.id, cabinet.id);
    console.log(`✅ Получено остатков: ${stocksData.length}`);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    
    const ordersData = await getWBOrders(cabinet.apiToken, startDate, endDate);
    console.log(`✅ Получено заказов: ${ordersData.length}`);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    
    const productsData = await getWBProducts(cabinet.apiToken);
    console.log(`✅ Получено товаров: ${productsData.length}`);

    // Синхронизируем товары в БД для корректного расчета аналитики
    // БАТЧИНГ: обрабатываем по 20 товаров за раз чтобы не перегружать БД
    console.log('🔄 Синхронизация товаров в БД (батчами по 20)...');
    let syncedCount = 0;
    let skippedCount = 0;
    const BATCH_SIZE = 20; // Увеличено с 10 до 20
    const BATCH_DELAY = 200; // Уменьшено с 500мс до 200мс
    
    for (let i = 0; i < productsData.length; i += BATCH_SIZE) {
      const batch = productsData.slice(i, i + BATCH_SIZE);
      console.log(`📦 Обработка батча ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(productsData.length / BATCH_SIZE)} (товары ${i + 1}-${Math.min(i + BATCH_SIZE, productsData.length)})`);
      
      // Обрабатываем батч параллельно
      await Promise.all(batch.map(async (wbProduct) => {
        try {
          // Проверяем, есть ли товар в БД
          const existingProduct = await safePrismaOperation(
            () => prismaAnalytics.product.findFirst({
              where: {
                wbNmId: String(wbProduct.nmID),
                userId: user.id
              }
            }),
            'проверка товара в БД'
          );

          if (!existingProduct) {
            // Товара нет - создаем базовую запись
            await safePrismaOperation(
              () => prismaAnalytics.product.create({
                data: {
                  wbNmId: String(wbProduct.nmID),
                  name: wbProduct.object || wbProduct.subjectName || `Товар ${wbProduct.nmID}`,
                  vendorCode: wbProduct.vendorCode || String(wbProduct.nmID),
                  userId: user.id,
                  price: 0, // Обязательное поле
                  costPrice: 0,
                  stock: 0,
                  status: 'ACTIVE',
                  lastWbSyncAt: new Date(),
                  wbSyncStatus: 'synced'
                }
              }),
              'создание товара в БД'
            );
            syncedCount++;
            console.log(`✅ Товар ${wbProduct.nmID} добавлен в БД`);
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ Ошибка синхронизации товара ${wbProduct.nmID}:`, error);
        }
      }));
      
      // Задержка между батчами (кроме последнего)
      if (i + BATCH_SIZE < productsData.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    console.log(`✅ Синхронизация завершена: добавлено ${syncedCount}, пропущено ${skippedCount}`);

    if (useDetailedReport) {
      console.log(`📈 Получено: записей отчета ${detailedReport.length}, товаров ${productsData.length}`);
    } else {
      console.log(`📈 Получено: продаж ${salesData.length}, заказов ${ordersData.length}, товаров ${productsData.length}`);
    }

    // Собираем аналитику (гибридный режим)
    console.log('🔄 НАЧИНАЕМ buildAnalyticsDashboard...');
    console.log(`📊 Параметры: salesData=${salesData.length}, previousSalesData=${previousSalesData.length}, stocksData=${stocksData.length}, ordersData=${ordersData.length}, productsData=${productsData.length}`);
    
    let analyticsResult;
    try {
      analyticsResult = await buildAnalyticsDashboard(
        salesData,
        previousSalesData,
        stocksData,
        ordersData,
        productsData,
        { start: startDate.toISOString(), end: endDate.toISOString() },
        user,
        cabinet.apiToken,
        useDetailedReport ? detailedReport : undefined,
        days,
        request
      );
      console.log('✅ buildAnalyticsDashboard ЗАВЕРШЕН успешно');
    } catch (buildError) {
      console.error('❌ ОШИБКА В buildAnalyticsDashboard:', buildError);
      throw buildError;
    }

    // ============ СОХРАНЕНИЕ В REDIS КЕШ ============
    const responseData = {
      success: true,
      data: analyticsResult
    };

    // 🔍 Логирование детализации логистики перед отправкой
    console.log('📊 Детализация логистики перед отправкой в UI:', {
      totalLogistics: analyticsResult.financial?.expenses?.totalLogistics,
      logisticsToClient: analyticsResult.financial?.expenses?.logisticsToClient,
      logisticsReturns: analyticsResult.financial?.expenses?.logisticsReturns,
      returnsCount: analyticsResult.financial?.expenses?.returnsCount
    });

    // Сохраняем в БД кеш с TTL 60 минут
    await CacheService.set(cacheKey, analyticsResult, CACHE_TTL_MINUTES);
    console.log(`✅ [DB Cache] Аналитика сохранена в БД кеш на ${CACHE_TTL_MINUTES} минут`);

    return NextResponse.json({
      success: true,
      data: analyticsResult,
      fromCache: false
    });

  } catch (error) {
    console.error('❌ Ошибка получения аналитики:', error);
    return NextResponse.json({
      error: 'Ошибка получения данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// ==================== Вспомогательные функции ====================

/**
 * Задержка выполнения
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Получение данных о продажах с retry логикой
 * Использует старый API statistics для получения ДЕТАЛЬНЫХ продаж (каждая продажа отдельно)
 */
async function getWBSales(apiToken: string, startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const dateFrom = startDate.toISOString().split('T')[0];
    const url = `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom}`;
    
    console.log(`📊 Запрос продаж с ${dateFrom}`);
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Не удалось получить данные о продажах: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    console.log(`📊 Получено ${data?.length || 0} записей с WB API`);
    if (data && data.length > 0) {
      console.log(`   Первая запись: ${JSON.stringify(data[0]).substring(0, 100)}`);
    }
    
    // Фильтруем только продажи (saleID !== 0) и в нужном периоде
    const salesData = (data || []).filter((sale: any) => {
      const saleDate = new Date(sale.date);
      return sale.saleID && saleDate >= startDate && saleDate <= endDate;
    });
    
    console.log(`✅ Получено ${salesData.length} продаж из ${data?.length || 0} записей (фильтр по saleID и дате)`);
    
    return salesData;
  } catch (error) {
    console.warn('⚠️ Ошибка получения продаж:', error);
    return [];
  }
}


/**
 * Получение данных о заказах с retry логикой
 */
async function getWBOrders(apiToken: string, startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const dateFrom = startDate.toISOString().split('T')[0];
    const url = `https://statistics-api.wildberries.ru/api/v1/supplier/orders?dateFrom=${dateFrom}`;
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Не удалось получить данные о заказах: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.warn('⚠️ Ошибка получения заказов:', error);
    return [];
  }
}

/**
 * Получение остатков с retry логикой
 * 
 * ВАЖНО: Для получения ПОЛНОГО остатка нужно указать максимально раннюю дату в dateFrom
 * Согласно документации WB API: "Для получения полного остатка следует указывать максимально раннее значение"
 * 
 * Ответ содержит поля:
 * - quantity: количество на складе
 * - inWayToClient: в пути к клиенту
 * - inWayFromClient: в пути от клиента (возвраты)
 * - quantityFull: общее количество (quantity + inWayToClient + inWayFromClient)
 */
/**
 * Получение остатков напрямую из WB API
 * Использует ту же логику, что и /api/wb/stocks:
 * 1. FBS остатки через /api/v3/stocks/{warehouseId}
 * 2. FBW остатки через Statistics API
 * 3. Товары в пути (inTransit, inReturn) из Statistics API
 */
async function getWBStocks(apiToken: string, barcodes?: string[], userId?: string, cabinetId?: string): Promise<any[]> {
  try {
    console.log(`📦 [Dashboard Stocks] Загрузка остатков напрямую из WB API...`);
    
    const { wbApiService } = await import('../../../../../lib/services/wbApiService');
    const allStocks: any[] = [];
    
    // ШАГ 1: Получаем список складов для определения FBS склада
    let warehouses: any[] = [];
    try {
      warehouses = await wbApiService.getWarehouses(apiToken);
      console.log(`📦 [Dashboard Stocks] Получено складов: ${warehouses.length}`);
    } catch (error) {
      console.warn('⚠️ [Dashboard Stocks] Не удалось загрузить список складов:', error);
    }
    
    // ШАГ 2: Получаем FBS остатки через /api/v3/stocks/{warehouseId}
    const fbsStocksByNmId = new Map<number, number>();
    const fbsWarehouse = warehouses.find((w: any) => w.deliveryType === 1);
    
    if (fbsWarehouse && userId) {
      console.log(`📦 [Dashboard Stocks] Найден FBS склад: ${fbsWarehouse.name} (ID: ${fbsWarehouse.id})`);
      
      // Получаем баркоды товаров из БД
      const products = await prisma.product.findMany({
        where: {
          userId,
          wbNmId: { not: null }
        },
        select: {
          id: true,
          wbNmId: true,
          barcode: true,
          barcodes: true
        }
      });
      
      const allBarcodes: string[] = [];
      for (const product of products) {
        if (product.barcodes && Array.isArray(product.barcodes)) {
          const validBarcodes = product.barcodes.filter((b: any) => typeof b === 'string');
          allBarcodes.push(...validBarcodes);
        } else if (product.barcode && typeof product.barcode === 'string') {
          allBarcodes.push(product.barcode);
        }
      }
      
      if (allBarcodes.length > 0) {
        console.log(`📦 [Dashboard Stocks] Загрузка FBS остатков для ${allBarcodes.length} баркодов...`);
        try {
          const fbsStocksResponse = await fetch(
            `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${fbsWarehouse.id}`,
            {
              method: 'POST',
              headers: {
                'Authorization': apiToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ skus: allBarcodes })
            }
          );
          
          if (fbsStocksResponse.ok) {
            const fbsStocksData = await fbsStocksResponse.json();
            console.log(`✅ [Dashboard Stocks] Получено FBS остатков: ${fbsStocksData.stocks?.length || 0} позиций`);
            
            if (fbsStocksData.stocks && Array.isArray(fbsStocksData.stocks)) {
              for (const stock of fbsStocksData.stocks) {
                if (stock.amount > 0) {
                  const product = products.find(p => {
                    if (p.barcodes && Array.isArray(p.barcodes)) {
                      return p.barcodes.includes(stock.sku);
                    }
                    return p.barcode === stock.sku;
                  });
                  
                  if (product && product.wbNmId) {
                    const nmId = parseInt(product.wbNmId);
                    const currentAmount = fbsStocksByNmId.get(nmId) || 0;
                    fbsStocksByNmId.set(nmId, currentAmount + stock.amount);
                  }
                }
              }
              console.log(`📦 [Dashboard Stocks] FBS остатков по ${fbsStocksByNmId.size} товарам`);
            }
          }
        } catch (fbsError) {
          console.warn(`⚠️ [Dashboard Stocks] Ошибка загрузки FBS остатков:`, fbsError);
        }
      }
    }
    
    // ШАГ 3: Получаем FBW остатки через Statistics API
    console.log(`📦 [Dashboard Stocks] Загрузка FBW остатков через Statistics API...`);
    const fbwStocks = await wbApiService.getStocks(apiToken);
    
    // ШАГ 4: Объединяем FBS и FBW остатки
    const stocksByProduct = new Map<number, any>();
    
    if (fbwStocks && Array.isArray(fbwStocks)) {
      console.log(`✅ [Dashboard Stocks] Получено FBW остатков: ${fbwStocks.length} записей`);
      
      fbwStocks.forEach((stock: any) => {
        const nmId = stock.nmId || stock.nm_id;
        if (!nmId) return;
        
        const fbsStock = fbsStocksByNmId.get(nmId) || 0;
        const fbwStock = stock.quantity || 0;
        const inTransitToClient = stock.inWayToClient || 0;
        const inTransitFromClient = stock.inWayFromClient || 0;
        
        const existing = stocksByProduct.get(nmId);
        if (existing) {
          existing.fbwStock += fbwStock;
          existing.inWayToClient += inTransitToClient;
          existing.inWayFromClient += inTransitFromClient;
        } else {
          stocksByProduct.set(nmId, {
            nmId,
            vendorCode: stock.supplierArticle || stock.vendor_code || '',
            warehouseName: stock.warehouseName || 'Склад WB',
            fbsStock,
            fbwStock,
            inWayToClient: inTransitToClient,
            inWayFromClient: inTransitFromClient,
            quantity: fbwStock, // Только FBW на складе (без товаров в пути)
            quantityFull: fbsStock + fbwStock,
            warehouseType: fbsStock > 0 ? 'FBS' : 'FBW',
            Price: 0
          });
        }
      });
    }
    
    // ШАГ 5: Добавляем товары с FBS остатками, которых нет в Statistics API
    for (const [nmId, fbsAmount] of fbsStocksByNmId.entries()) {
      if (!stocksByProduct.has(nmId)) {
        stocksByProduct.set(nmId, {
          nmId,
          vendorCode: nmId.toString(),
          warehouseName: fbsWarehouse?.name || 'FBS',
          fbsStock: fbsAmount,
          fbwStock: 0,
          inWayToClient: 0,
          inWayFromClient: 0,
          quantity: fbsAmount,
          quantityFull: fbsAmount,
          warehouseType: 'FBS',
          Price: 0
        });
      }
    }
    
    // Преобразуем Map в массив
    allStocks.push(...Array.from(stocksByProduct.values()));
    
    const fbsCount = allStocks.reduce((sum, s) => sum + (s.fbsStock || 0), 0);
    const fbwCount = allStocks.reduce((sum, s) => sum + (s.fbwStock || 0), 0);
    const fbwInWay = allStocks.reduce((sum, s) => sum + (s.inWayToClient || 0) + (s.inWayFromClient || 0), 0);
    
    console.log(`✅ [Dashboard Stocks] ИТОГО: ${allStocks.length} товаров`);
    console.log(`   FBS: ${fbsCount} шт`);
    console.log(`   FBW: ${fbwCount} шт на складе + ${fbwInWay} шт в пути`);
    console.log(`   FBS: ${fbsCount} шт`);
    
    return allStocks;
  } catch (error) {
    console.error('❌ [Dashboard Stocks] Ошибка получения остатков:', error);
    return [];
  }
}

/**
 * Определение типа склада на основе данных от WB API
 */
function determineWarehouseType(stock: any): string {
  // Определяем тип склада на основе данных от WB API
  if (stock.deliveryType === 1 || stock.delivery_type === 1) {
    return 'FBS';
  } else if (stock.deliveryType === 0 || stock.delivery_type === 0) {
    return 'FBW';
  } else if (stock.warehouseName?.toLowerCase().includes('фбс') || 
             stock.warehouse_name?.toLowerCase().includes('фбс')) {
    return 'FBS';
  } else if (stock.warehouseName?.toLowerCase().includes('фбо') || 
             stock.warehouse_name?.toLowerCase().includes('фбо') ||
             stock.warehouseName?.toLowerCase().includes('wb') ||
             stock.warehouse_name?.toLowerCase().includes('wb')) {
    return 'FBW';
  }
  
  // По умолчанию считаем FBW (склад WB)
  return 'FBW';
}

/**
 * Получение габаритов товаров из WB API
 * Возвращает Map: nmId -> { length, width, height }
 * 
 * ВАЖНО: WB API /content/v2/get/cards/list не поддерживает фильтрацию по nmId,
 * поэтому используем пагинацию и фильтруем результат
 */
async function getProductDimensionsFromWB(apiToken: string, nmIds: number[]): Promise<Map<number, any>> {
  const dimensionsMap = new Map<number, any>();
  
  try {
    console.log(`📦 Загрузка габаритов товаров из WB API для ${nmIds.length} товаров...`);
    
    const url = `${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/get/cards/list`;
    
    let cursor: any = {
      limit: 100
    };
    let foundCount = 0;
    let notFoundCount = 0;
    let totalCards = 0;
    let hasMore = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Максимум 10 страниц (1000 товаров)
    
    // Пагинация по товарам
    while (hasMore && foundCount < nmIds.length && iterations < MAX_ITERATIONS) {
      iterations++;
      
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiToken,
          'User-Agent': 'WB-AI-Assistant/2.0'
        },
        body: JSON.stringify({
          settings: {
            cursor: cursor,
            filter: {
              withPhoto: -1
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Не удалось получить карточки товаров: ${response.status}`);
        console.error(`❌ Ответ WB API:`, errorText);
        break;
      }

      const data = await response.json();
      const cards = data?.cards || [];
      totalCards += cards.length;
      
      console.log(`📦 Страница ${iterations}: получено ${cards.length} карточек (всего: ${totalCards})`);
      
      // Извлекаем габариты из каждой карточки
      cards.forEach((card: any) => {
        const nmID = card.nmID;
        if (!nmID) return;
        
        // Проверяем нужен ли этот товар
        if (!nmIds.includes(nmID)) return;
        
        // Уже нашли этот товар
        if (dimensionsMap.has(nmID)) return;
        
        // В WB API габариты хранятся в dimensions объекте
        const dimensions = card.dimensions;
        
        if (dimensions && typeof dimensions === 'object') {
          const length = parseInt(dimensions.length) || 0;
          const width = parseInt(dimensions.width) || 0;
          const height = parseInt(dimensions.height) || 0;
          
          if (length > 0 && width > 0 && height > 0) {
            dimensionsMap.set(nmID, { length, width, height });
            foundCount++;
            
            if (foundCount <= 3) {
              console.log(`  ✅ Товар ${nmID}: ${length}×${width}×${height} см (из WB API)`);
            }
          } else {
            notFoundCount++;
            if (notFoundCount <= 3) {
              console.log(`  ⚠️ Товар ${nmID}: габариты некорректные (${length}×${width}×${height})`);
            }
          }
        } else {
          notFoundCount++;
          if (notFoundCount <= 3) {
            console.log(`  ⚠️ Товар ${nmID}: dimensions отсутствует в карточке`);
          }
        }
      });
      
      // Проверяем есть ли еще страницы
      if (cards.length < 100 || !data.cursor) {
        hasMore = false;
      } else {
        cursor = {
          limit: 100,
          updatedAt: data.cursor.updatedAt,
          nmID: data.cursor.nmID
        };
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`📦 Найдено габаритов из WB API: ${foundCount} из ${nmIds.length} товаров (проверено ${totalCards} карточек)`);
    
  } catch (error) {
    console.error('❌ Ошибка получения габаритов из WB API:', error);
  }
  
  return dimensionsMap;
}

/**
 * Получение списка товаров
 */
async function getWBProducts(apiToken: string): Promise<any[]> {
  try {
    const url = `${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/get/cards/list`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      },
      body: JSON.stringify({
        settings: {
          cursor: {
            limit: 100
          },
          filter: {
            withPhoto: -1
          }
        }
      })
    });

    if (!response.ok) {
      console.warn(`⚠️ Не удалось получить товары: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.cards || [];
  } catch (error) {
    console.warn('⚠️ Ошибка получения товаров:', error);
    return [];
  }
}

/**
 * Построение комплексной аналитики (ГИБРИДНЫЙ РЕЖИМ)
 * - Для периодов ≥30 дней: используем детализированный отчет WB (реальные расходы)
 * - Для периодов <30 дней: используем старый API + расчет расходов
 */
async function buildAnalyticsDashboard(
  salesData: any[],
  previousSalesData: any[],
  stocksData: any[],
  ordersData: any[],
  productsData: any[],
  period: { start: string; end: string },
  user: any,
  apiToken: string,
  detailedReport?: any[],
  days?: number,
  request?: NextRequest
): Promise<AnalyticsDashboardData> {
  
  console.log('🔄 [buildAnalyticsDashboard] ШАГ 1: Получение KTR...');
  // ✅ Получаем KTR (коэффициент логистики) для всех складов
  console.log('📊 Получаем коэффициенты логистики (KTR) для складов...');
  const warehouseKtrMap = await WbTariffService.getWarehouseKtrMap(apiToken, false);
  console.log(`✅ Получены KTR для ${warehouseKtrMap?.size || 0} складов`);
  
  console.log('🔄 [buildAnalyticsDashboard] ШАГ 2: Получение полных тарифов...');
  // ✅ Получаем ПОЛНЫЕ тарифы для расчета логистики
  const warehouseTariffsMap = await WbTariffService.getWarehouseTariffsMap(apiToken);
  console.log(`✅ Получены полные тарифы для ${warehouseTariffsMap?.size || 0} складов`);
  
  // Определяем режим работы
  const useDetailedReport = detailedReport && detailedReport.length > 0;
  
  let totalRevenue = 0;
  let totalForPay = 0;
  let totalOrders = 0;
  let totalWbCommission = 0;
  let totalLogistics = 0;
  let totalLogisticsReturn = 0;
  let totalStorage = 0;
  let totalAcceptance = 0;
  let totalPenalty = 0;
  let totalDeduction = 0; // 🔥 Корректировка ВВ (удержания)
  let totalAdvertising = 0; // 📢 Расходы на рекламу/продвижение
  let totalOtherDeductions = 0;
  let totalWbExpenses = 0;
  let logisticsToClient = 0; // Для старого API
  let logisticsReturns = 0; // Логистика возвратов
  let returnsCount = 0; // Количество возвратов
  let cancelsCount = 0; // Количество отмен
  
  // ✅ РАСЧЕТ: Используем данные из детализированного отчета WB или старого API
  console.log('📊 РАСЧЕТ АНАЛИТИКИ:', useDetailedReport ? 'Детализированный отчет WB' : 'Старый API + расчет');
  
  // ✅ ДЛЯ ДЕТАЛИЗИРОВАННОГО ОТЧЕТА: Используем aggregateExpenses из WbReportService
  if (useDetailedReport) {
    console.log('🔄 [buildAnalyticsDashboard] ШАГ 3: Детализированный отчет - получение габаритов...');
    // Получаем габариты товаров для расчетной логистики
    const nmIds = [...new Set(detailedReport!.map(item => item.nmId))];
    console.log(`📦 Ищем габариты для ${nmIds.length} уникальных товаров:`, nmIds.slice(0, 5));
    
    console.log('🔄 [buildAnalyticsDashboard] ШАГ 3.1: Загрузка из БД...');
    // ШАГ 1: Пытаемся загрузить из БД
    const productsFromDb = await prismaAnalytics.product.findMany({
      where: {
        wbNmId: { in: nmIds.map(String) },
        userId: user.id
      },
      select: {
        wbNmId: true,
        dimensions: true
      }
    });
    
    console.log(`📦 Найдено ${productsFromDb.length} товаров в БД`);
    
    // Создаем Map габаритов (nmId -> dimensions)
    const productDimensionsMap = new Map<number, any>();
    let productsWithDimensions = 0;
    let productsWithoutDimensions = 0;
    
    productsFromDb.forEach(product => {
      if (product.wbNmId) {
        const nmId = parseInt(product.wbNmId);
        if (product.dimensions && typeof product.dimensions === 'object') {
          const dims = product.dimensions as any;
          // Проверяем что dimensions содержит нужные поля
          if (dims.length && dims.width && dims.height) {
            productDimensionsMap.set(nmId, dims);
            productsWithDimensions++;
            if (productsWithDimensions <= 3) {
              console.log(`  ✅ Товар ${nmId}: ${dims.length}×${dims.width}×${dims.height} см (из БД)`);
            }
          } else {
            productsWithoutDimensions++;
            if (productsWithoutDimensions <= 3) {
              console.log(`  ⚠️ Товар ${nmId}: dimensions некорректные`, dims);
            }
          }
        } else {
          productsWithoutDimensions++;
          if (productsWithoutDimensions <= 3) {
            console.log(`  ⚠️ Товар ${nmId}: dimensions отсутствует`);
          }
        }
      }
    });
    
    console.log(`📦 Из БД: ${productsWithDimensions} с габаритами, ${productsWithoutDimensions} без габаритов`);
    
    // ШАГ 2: Если не все товары найдены в БД - загружаем из WB API
    const missingNmIds = nmIds.filter(nmId => !productDimensionsMap.has(nmId));
    if (missingNmIds.length > 0) {
      console.log('🔄 [buildAnalyticsDashboard] ШАГ 3.2: Загрузка габаритов из WB API...');
      console.log(`📦 Загружаем габариты из WB API для ${missingNmIds.length} недостающих товаров...`);
      const dimensionsFromWB = await getProductDimensionsFromWB(apiToken, missingNmIds);
      
      // Объединяем с данными из БД
      dimensionsFromWB.forEach((dims, nmId) => {
        productDimensionsMap.set(nmId, dims);
      });
      
      console.log(`📦 ИТОГО габаритов: ${productDimensionsMap.size} из ${nmIds.length} товаров`);
    }
    
    console.log('🔄 [buildAnalyticsDashboard] ШАГ 3.3: Вызов aggregateExpenses...');
    const reportService = new WbReportService(apiToken);
    const aggregated = reportService.aggregateExpenses(
      detailedReport!,
      productDimensionsMap,
      warehouseTariffsMap || undefined
    );
    
    totalRevenue = aggregated.totalRevenue;
    totalForPay = aggregated.totalForPay;
    totalOrders = aggregated.totalSales;
    totalWbCommission = aggregated.totalCommission;
    totalLogistics = aggregated.totalLogistics;
    totalLogisticsReturn = aggregated.totalLogisticsReturn;
    totalStorage = aggregated.totalStorage;
    totalAcceptance = aggregated.totalAcceptance;
    totalPenalty = aggregated.totalPenalty;
    totalDeduction = aggregated.totalDeduction; // 🔥 Корректировка ВВ
    totalAdvertising = aggregated.totalAdvertising; // 📢 Расходы на рекламу
    totalOtherDeductions = aggregated.totalOther;
    totalWbExpenses = aggregated.totalWbExpenses;
    returnsCount = aggregated.totalReturns;
    cancelsCount = aggregated.totalCancels;
    
    // Детализация логистики
    logisticsToClient = aggregated.totalLogistics; // Логистика до клиента
    logisticsReturns = aggregated.totalLogisticsReturn; // Логистика возвратов
    
    console.log(`✅ Использованы данные из aggregateExpenses: ${totalOrders} заказов, ${totalRevenue.toFixed(2)}₽ выручка`);
    console.log(`📦 Детализация логистики из aggregateExpenses:`, {
      totalLogistics: aggregated.totalLogistics,
      totalLogisticsReturn: aggregated.totalLogisticsReturn,
      logisticsToClient,
      logisticsReturns
    });
    
    console.log('🔄 [buildAnalyticsDashboard] ШАГ 4: Добавление данных за последние дни...');
    // ✅ ВАЖНО: Добавляем данные за последние дни из старого API (salesData)
    // Детализированный отчет WB формируется с задержкой 2-3 дня
    if (salesData && salesData.length > 0) {
      // Находим последнюю дату в детализированном отчете
      const detailedDates = detailedReport!.map(item => {
        const dateStr = item.saleDt || item.sale_dt || item.orderDt || item.order_dt;
        return dateStr ? new Date(dateStr).toISOString().split('T')[0] : null;
      }).filter(Boolean);
      const lastDetailedDate = detailedDates.length > 0 
        ? (detailedDates.sort().reverse()[0] || '2000-01-01')
        : '2000-01-01';
      
      console.log(`📊 Последняя дата в детализированном отчете: ${lastDetailedDate}`);
      
      // Фильтруем продажи из старого API, которые ПОСЛЕ последней даты детализированного отчета
      const recentSales = salesData.filter((sale: any) => {
        const saleDate = sale.date ? new Date(sale.date).toISOString().split('T')[0] : null;
        return saleDate && saleDate > lastDetailedDate;
      });
      
      if (recentSales.length > 0) {
        console.log(`📊 Найдено ${recentSales.length} выкупов за последние дни (после ${lastDetailedDate})`);
        
        // Добавляем выручку и "к переводу" за последние дни
        let recentRevenue = 0;
        let recentForPay = 0;
        let recentOrders = 0;
        
        recentSales.forEach((sale: any) => {
          const isReturn = sale.isReturn || sale.saleID?.startsWith('R') || false;
          const isCancel = sale.isCancel || false;
          
          if (!isReturn && !isCancel) {
            recentRevenue += sale.finishedPrice || 0;
            recentForPay += sale.forPay || sale.finishedPrice || 0;
            recentOrders += 1;
          }
        });
        
        console.log(`📊 Добавляем за последние дни: выручка=${recentRevenue}₽, кПереводу=${recentForPay}₽, заказов=${recentOrders}`);
        
        // Добавляем к общим суммам
        totalRevenue += recentRevenue;
        totalForPay += recentForPay;
        totalOrders += recentOrders;
        
        // Примерный расчет расходов для последних дней (комиссия = выручка - к переводу)
        const recentCommission = recentRevenue - recentForPay;
        totalWbCommission += recentCommission;
        totalWbExpenses += recentCommission;
        
        console.log(`📊 ИТОГО после добавления последних дней: выручка=${totalRevenue}₽, кПереводу=${totalForPay}₽, заказов=${totalOrders}`);
      } else {
        console.log(`📊 Нет новых выкупов после ${lastDetailedDate}`);
      }
    }
  } else {
    // ДЛЯ СТАРОГО API: Используем AnalyticsCalculator
    // Получаем товары из БД
    const productIds = [...new Set(salesData.map((sale: any) => sale.nmId).filter(Boolean))];
      
    const products = await prismaAnalytics.product.findMany({
      where: {
        wbNmId: { in: productIds.map(String) },
        userId: user.id
      },
      include: {
        subcategory: true  // ✅ Получаем категорию с комиссиями
      }
    });
    
    const productMap = new Map<string, any>();
    products.forEach((p: any) => {
      productMap.set(String(p.wbNmId), {
        id: p.id,
        costPrice: p.costPrice,
        subcategory: p.subcategory,
        // 📦 Габариты для расчета логистики
        dimensions: {
          length: p.length,
          width: p.width,
          height: p.height
        }
      });
    });
    
    const salesForCalculation = salesData.map((sale: any) => {
      const product = productMap.get(String(sale.nmId));
      return {
        id: sale.id || `sale_${sale.nmId}_${sale.saleID}`,
        nmId: sale.nmId,
        quantity: sale.quantity || 1,
        finishedPrice: sale.finishedPrice || 0,
        forPay: sale.forPay || sale.finishedPrice || 0,
        isReturn: (sale.isReturn || sale.saleID?.startsWith('R') || false),
        isCancel: (sale.isCancel || false),
        createdAt: new Date(sale.createdAt || new Date()),
        warehouseName: sale.warehouseName || sale.warehouse || '',
        // 📦 Габариты товара для расчета логистики
        dimensions: product?.dimensions
      };
    });
    
    // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ КАЖДОЙ ПРОДАЖИ ДЛЯ ОТЛАДКИ
    console.log(`\n📊 ДЕТАЛИЗАЦИЯ ПРОДАЖ (для отладки расхождения с WB):`);
    console.log(`   Всего продаж: ${salesForCalculation.length}`);
    
    let debugTotalRevenue = 0;
    let debugTotalForPay = 0;
    let debugTotalOrders = 0;
    let debugTotalReturns = 0;
    
    salesForCalculation.slice(0, 10).forEach((sale: any, idx: number) => {
      debugTotalRevenue += sale.basePrice;
      debugTotalForPay += sale.forPay;
      if (!sale.isReturn && !sale.isCancel) debugTotalOrders++;
      if (sale.isReturn) debugTotalReturns++;
      
      console.log(`   [${idx + 1}] ${sale.isReturn ? '↩️ ВОЗВРАТ' : sale.isCancel ? '❌ ОТМЕНА' : '✅ ПРОДАЖА'}: ${sale.basePrice}₽ → ${sale.forPay}₽ (комиссия: ${(sale.basePrice - sale.forPay).toFixed(2)}₽)`);
    });
    
    console.log(`\n   📈 Итого по первым 10: выручка=${debugTotalRevenue}₽, кПереводу=${debugTotalForPay}₽, заказов=${debugTotalOrders}, возвратов=${debugTotalReturns}`);
    
    const analyticsResult = AnalyticsCalculator.calculate(salesForCalculation, productMap, {
      warehouseKtr: warehouseKtrMap?.get('default') || 1,
      warehouseKtrMap: warehouseKtrMap || undefined,
      storagePerUnit: 5,
      acceptancePerUnit: 2,
      logisticsReturnPerUnit: 50
    });
    
    totalRevenue = analyticsResult.totalRevenue;
    totalForPay = analyticsResult.totalForPay;
    totalOrders = analyticsResult.totalSales;
    totalWbCommission = analyticsResult.totalCommission;
    totalLogistics = analyticsResult.totalLogistics;
    totalLogisticsReturn = analyticsResult.totalLogisticsReturn;
    totalStorage = analyticsResult.totalStorage;
    totalAcceptance = analyticsResult.totalAcceptance;
    totalWbExpenses = analyticsResult.totalExpenses;
    returnsCount = analyticsResult.totalReturns;
    cancelsCount = analyticsResult.totalCancels;
    
    console.log(`\n🔢 РЕЗУЛЬТАТЫ РАСЧЕТА (AnalyticsCalculator):`);
    console.log(`   Выручка: ${totalRevenue}₽`);
    console.log(`   К переводу: ${totalForPay}₽`);
    console.log(`   Заказов: ${totalOrders}`);
    console.log(`   Комиссия WB: ${totalWbCommission}₽`);
    console.log(`   Логистика: ${totalLogistics}₽`);
    console.log(`   Возвраты: ${returnsCount}`);
    console.log(`   Отмены: ${cancelsCount}`);
  }
  
  // Получаем товары из БД для расчета себестоимости
  const productIds = useDetailedReport 
    ? [...new Set(detailedReport!.map((item: any) => item.nmId).filter(Boolean))]
    : [...new Set(salesData.map((sale: any) => sale.nmId).filter(Boolean))];
    
  const products = await prismaAnalytics.product.findMany({
    where: {
      wbNmId: { in: productIds.map(String) },
      userId: user.id
    },
    include: {
      subcategory: true
    }
  });
  
  const productMap = new Map<string, any>();
  products.forEach(p => {
    productMap.set(String(p.wbNmId), {
      id: p.id,
      costPrice: p.costPrice,
      discountPrice: p.discountPrice, // Цена со скидкой для расчета стоимости остатков
      price: p.price, // Базовая цена (fallback)
      subcategory: p.subcategory
    });
  });

  console.log(`💰 Финансовая аналитика (расчет из БД):`, {
    продаж: totalOrders,
    возвратов: returnsCount,
    отмен: cancelsCount,
    выручка: `${totalRevenue.toFixed(2)}₽`,
    комиссии: `${totalWbCommission.toFixed(2)}₽`,
    логистика: `${totalLogistics.toFixed(2)}₽`,
    хранение: `${totalStorage.toFixed(2)}₽`,
    приемка: `${totalAcceptance.toFixed(2)}₽`,
    расходы: `${totalWbExpenses.toFixed(2)}₽`,
    кПереводу: `${totalForPay.toFixed(2)}₽`
  });
  
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Расчет себестоимости
  let totalCost = 0;
  let costFromDb = 0;
  
  if (useDetailedReport) {
    // ✅ Учитываем ВСЕ типы документов (продажи, выкупы, возвраты, отмены)
    const allItems = detailedReport!.filter((item: any) => item.quantity > 0);
    allItems.forEach((item: any) => {
      const product = productMap.get(String(item.nmId));
      if (product?.costPrice && product.costPrice > 0) {
        // Для возвратов и отмен себестоимость вычитается
        const multiplier = (item.docTypeName?.includes('возврат') || item.docTypeName?.includes('Возврат') || 
                           item.docTypeName?.includes('отмен') || item.docTypeName?.includes('Отмен')) ? -1 : 1;
        totalCost += product.costPrice * item.quantity * multiplier;
        costFromDb++;
      }
    });
  } else {
    salesData.forEach((sale: any) => {
      const product = productMap.get(String(sale.nmId));
      if (product?.costPrice && product.costPrice > 0) {
        totalCost += product.costPrice;
        costFromDb++;
      }
    });
  }
  
  // ✅ Учитываем ВСЕ типы документов (продажи, выкупы, возвраты, отмены)
  const totalProductsInSales = useDetailedReport 
    ? detailedReport!.filter((item: any) => item.quantity > 0).length
    : salesData.length;
  
  const costCoveragePercent = totalProductsInSales > 0 ? (costFromDb / totalProductsInSales) * 100 : 0;
  
  console.log(`📦 Себестоимость: ${costFromDb} из ${totalProductsInSales} товаров (${costCoveragePercent.toFixed(1)}%) с указанной себестоимостью, итого ${totalCost.toFixed(2)}₽`);
  
  // Предупреждение если не все товары имеют себестоимость
  const missingCostCount = totalProductsInSales - costFromDb;
  if (missingCostCount > 0) {
    console.warn(`⚠️ ВНИМАНИЕ: У ${missingCostCount} товаров (${(100 - costCoveragePercent).toFixed(1)}%) не указана себестоимость. Укажите себестоимость для более точного расчета прибыли.`);
  }
  
  // Налоги НЕ включаем в общий расчет (пользователь платит их отдельно)
  // Налоги будут рассчитываться только в детальной аналитике товара
  const totalTaxes = 0;
  
  // Реклама - теперь берется из детализированного отчета WB (additionalPayment < 0)
  // totalAdvertising уже объявлен выше и заполнен данными из aggregateExpenses
  
  // ПРАВИЛЬНЫЙ расчет прибыли согласно схеме WB:
  // 1. finishedPrice - база (что платит WB продавцу)
  // 2. finishedPrice - комиссия - логистика - хранение - приемка - прочее = forPay
  // 3. forPay - себестоимость = чистая прибыль
  // 4. Маржа = (прибыль / finishedPrice) * 100%
  
  const totalProfit = totalForPay - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  // Рассчитываем потенциальную прибыль если бы все товары имели себестоимость
  const hasMissingCost = missingCostCount > 0;
  const profitStatus = hasMissingCost 
    ? `${totalProfit.toFixed(2)}₽ (неполные данные)` 
    : `${totalProfit.toFixed(2)}₽`;
  
  console.log(`\n💰 ИТОГО (как в WB приложении):`, {
    продажи: `+${totalRevenue.toFixed(2)}₽`,
    комиссияWB: `-${totalWbCommission.toFixed(2)}₽`,
    логистика: `-${totalLogistics.toFixed(2)}₽`,
    хранение: `-${totalStorage.toFixed(2)}₽`,
    приемка: `-${totalAcceptance.toFixed(2)}₽`,
    штрафы: `-${totalPenalty.toFixed(2)}₽`,
    кПереводу: `${totalForPay.toFixed(2)}₽`,
    себестоимость: `-${totalCost.toFixed(2)}₽ (${costFromDb}/${totalProductsInSales} товаров)`,
    ПРИБЫЛЬ: profitStatus,
    ...(hasMissingCost && { предупреждение: `⚠️ ${missingCostCount} товаров без себестоимости` })
  });

  // Сравнение с предыдущим периодом (используем finishedPrice - база продавца)
  const previousRevenue = previousSalesData.reduce((sum, sale) => sum + (sale.finishedPrice || 0), 0);
  const previousForPay = previousSalesData.reduce((sum, sale) => sum + (sale.forPay || 0), 0);
  const previousOrders = previousSalesData.length;
  
  // Расчет себестоимости за предыдущий период
  let previousCost = 0;
  previousSalesData.forEach(sale => {
    const product = productMap.get(String(sale.nmId));
    if (product?.costPrice && product.costPrice > 0) {
      previousCost += product.costPrice;
    }
  });
  
  // КОРРЕКТНЫЙ расчет прибыли за предыдущий период
  const previousProfit = previousForPay - previousCost;
  
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const ordersChange = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;
  const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;

  // Агрегация ВЫКУПОВ по дням
  // ГИБРИДНЫЙ ПОДХОД: объединяем данные из детализированного отчета и старого API
  // Детализированный отчет содержит точные расходы, но формируется с задержкой 2-3 дня
  // Старый API содержит актуальные выкупы, но без детальных расходов
  let salesByDay: Array<{ date: string; revenue: number; orders: number; fbsBuyouts?: number; fbwBuyouts?: number; fbsRevenue?: number; fbwRevenue?: number }>;
  
  if (useDetailedReport && detailedReport.length > 0) {
    // Получаем данные из детализированного отчета
    const detailedSalesByDay = aggregateSalesByDayFromDetailedReport(detailedReport);
    
    // Получаем данные из старого API (актуальные за последние дни)
    const realtimeSalesByDay = aggregateSalesByDay(salesData);
    
    // Находим последнюю дату в детализированном отчете
    const lastDetailedDate = detailedSalesByDay.length > 0 
      ? detailedSalesByDay[detailedSalesByDay.length - 1].date 
      : '2000-01-01';
    
    console.log(`📊 Последняя дата в детализированном отчете: ${lastDetailedDate}`);
    console.log(`📊 Выкупов из детализированного отчета: ${detailedSalesByDay.length} дней`);
    console.log(`📊 Выкупов из старого API: ${realtimeSalesByDay.length} дней`);
    
    // Объединяем: берем данные из детализированного отчета + добавляем более новые из старого API
    const salesByDayMap = new Map<string, { date: string; revenue: number; orders: number; fbsBuyouts?: number; fbwBuyouts?: number; fbsRevenue?: number; fbwRevenue?: number }>();
    
    // Сначала добавляем данные из детализированного отчета (они более точные)
    detailedSalesByDay.forEach(day => {
      salesByDayMap.set(day.date, day);
    });
    
    // Затем добавляем/обновляем данные из старого API для дней ПОСЛЕ последней даты детализированного отчета
    realtimeSalesByDay.forEach(day => {
      if (day.date > lastDetailedDate) {
        // Для новых дней берем данные из старого API
        salesByDayMap.set(day.date, {
          ...day,
          fbsBuyouts: 0,
          fbwBuyouts: day.orders, // Предполагаем FBW по умолчанию
          fbsRevenue: 0,
          fbwRevenue: day.revenue
        });
        console.log(`📊 Добавлен день ${day.date} из старого API: ${day.orders} выкупов, ${day.revenue}₽`);
      }
    });
    
    salesByDay = Array.from(salesByDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    console.log(`📊 Итого после объединения: ${salesByDay.length} дней`);
  } else {
    // Используем только старый API
    salesByDay = aggregateSalesByDay(salesData);
  }
  
  const dataForChart = useDetailedReport ? detailedReport! : salesData;
  
  // Агрегация ЗАКАЗОВ по дням (из /api/v1/supplier/orders)
  // Это реальные заказы клиентов, не выкупы!
  const ordersByDay = aggregateOrdersByDay(ordersData);
  
  // Объединяем данные выкупов и заказов по датам
  const salesByDayWithOrders = salesByDay.map(day => {
    const ordersForDay = ordersByDay.find(o => o.date === day.date);
    return {
      ...day,
      orderCount: ordersForDay?.orderCount || 0,
      orderSum: ordersForDay?.orderSum || 0
    };
  });
  
  // Добавляем дни с заказами, которых нет в выкупах
  ordersByDay.forEach(orderDay => {
    if (!salesByDayWithOrders.find(s => s.date === orderDay.date)) {
      salesByDayWithOrders.push({
        date: orderDay.date,
        revenue: 0,
        orders: 0,
        orderCount: orderDay.orderCount,
        orderSum: orderDay.orderSum
      });
    }
  });
  
  // Сортируем по дате
  salesByDayWithOrders.sort((a, b) => a.date.localeCompare(b.date));
  
  console.log(`📊 salesByDay (выкупы): ${salesByDay.length} дней, первый: ${salesByDay[0]?.date}, последний: ${salesByDay[salesByDay.length-1]?.date}`);
  console.log(`📊 ordersByDay (заказы): ${ordersByDay.length} дней`);
  console.log(`📊 Источник данных для графика: ${useDetailedReport ? 'detailedReport' : 'salesData'}, записей: ${dataForChart.length}`);
  
  if (salesByDay.length === 0 && dataForChart.length > 0) {
    console.warn('⚠️ График пустой (salesByDay.length = 0), но есть данные (dataForChart.length = ' + dataForChart.length + ')');
    console.log('🔍 Первая запись:', dataForChart[0]);
  } else if (salesByDay.length === 0) {
    console.warn('⚠️ График пустой - нет данных о продажах за выбранный период');
  }
  
  // Топ товары по выручке с данными по периодам
  interface ProductStats {
    revenue: number;
    orders: number;
    orderCount: number;
    orderSum: number;
    title: string;
    // Данные за неделю
    weekRevenue: number;
    weekOrders: number;
    weekOrderCount: number;
    weekOrderSum: number;
    // Данные за месяц
    monthRevenue: number;
    monthOrders: number;
    monthOrderCount: number;
    monthOrderSum: number;
  }
  
  const productRevenue = new Map<number, ProductStats>();
  
  // Даты для фильтрации по периодам
  const periodNow = new Date();
  const periodToday = new Date(periodNow.getFullYear(), periodNow.getMonth(), periodNow.getDate());
  const periodWeekAgo = new Date(periodToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodMonthAgo = new Date(periodToday.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Сначала собираем данные о ЗАКАЗАХ по товарам (из ordersData) с разбивкой по периодам
  const productOrders = new Map<number, { 
    orderCount: number; orderSum: number;
    weekOrderCount: number; weekOrderSum: number;
    monthOrderCount: number; monthOrderSum: number;
  }>();
  
  (ordersData || []).forEach((order: any) => {
    if (order.isCancel) return; // Пропускаем отмененные
    const nmId = order.nmId;
    if (!nmId) return;
    
    const orderDate = new Date(order.date || order.createdAt || order.orderDate);
    const isWeek = orderDate >= periodWeekAgo;
    const isMonth = orderDate >= periodMonthAgo;
    const price = order.finishedPrice || order.priceWithDisc || order.totalPrice || 0;
    
    const current = productOrders.get(nmId) || { 
      orderCount: 0, orderSum: 0,
      weekOrderCount: 0, weekOrderSum: 0,
      monthOrderCount: 0, monthOrderSum: 0
    };
    
    // Общие данные (за весь период)
    current.orderCount += 1;
    current.orderSum += price;
    
    // За неделю
    if (isWeek) {
      current.weekOrderCount += 1;
      current.weekOrderSum += price;
    }
    
    // За месяц
    if (isMonth) {
      current.monthOrderCount += 1;
      current.monthOrderSum += price;
    }
    
    productOrders.set(nmId, current);
  });
  console.log(`📦 Собрано заказов по ${productOrders.size} товарам (с разбивкой по периодам)`);
  
  console.log(`📦 Формирование товаров: useDetailedReport=${useDetailedReport}, salesData=${salesData?.length || 0}, detailedReport=${detailedReport?.length || 0}`);
  
  // Функция для создания пустой статистики товара
  const createEmptyStats = (orderData: any): ProductStats => ({
    revenue: 0, orders: 0,
    orderCount: orderData.orderCount || 0, orderSum: orderData.orderSum || 0,
    title: '',
    weekRevenue: 0, weekOrders: 0,
    weekOrderCount: orderData.weekOrderCount || 0, weekOrderSum: orderData.weekOrderSum || 0,
    monthRevenue: 0, monthOrders: 0,
    monthOrderCount: orderData.monthOrderCount || 0, monthOrderSum: orderData.monthOrderSum || 0
  });

  if (useDetailedReport) {
    // ✅ Из детализированного отчета: учитываем ВСЕ типы документов с разбивкой по периодам
    // Фильтруем только продажи (не логистику, хранение и т.д.)
    const salesItems = detailedReport!.filter((item: any) => {
      const docType = (item.docTypeName || '').toLowerCase();
      return docType.includes('продажа') || docType.includes('возврат') || 
             docType.includes('реализация') || docType.includes('выкуп');
    });
    console.log(`📦 Отфильтровано продаж из detailedReport: ${salesItems.length}`);
    
    salesItems.forEach((item: any) => {
      const nmId = item.nmId;
      const orderData = productOrders.get(nmId) || { 
        orderCount: 0, orderSum: 0,
        weekOrderCount: 0, weekOrderSum: 0,
        monthOrderCount: 0, monthOrderSum: 0
      };
      const current = productRevenue.get(nmId) || createEmptyStats(orderData);
      
      // Определяем дату продажи
      const saleDate = new Date(item.saleDt || item.sale_dt || item.orderDt);
      const isWeek = saleDate >= periodWeekAgo;
      const isMonth = saleDate >= periodMonthAgo;
      
      // Для возвратов вычитаем
      const docType = (item.docTypeName || '').toLowerCase();
      const isReturn = docType.includes('возврат');
      const multiplier = isReturn ? -1 : 1;
      
      const revenue = (item.retailPriceWithDisc || item.retailPrice || 0) * multiplier;
      const qty = (item.quantity || 1) * multiplier;
      
      // Общие данные
      current.revenue += revenue;
      current.orders += qty;
      
      // За неделю
      if (isWeek) {
        current.weekRevenue += revenue;
        current.weekOrders += qty;
      }
      
      // За месяц
      if (isMonth) {
        current.monthRevenue += revenue;
        current.monthOrders += qty;
      }
      
      // Используем subject из WB если есть
      if (item.subject && !current.title) {
        current.title = item.subject;
      }
      
      productRevenue.set(nmId, current);
    });
  } else {
    // Из старого API
    salesData.forEach((sale: any) => {
      const nmId = sale.nmId;
      const orderData = productOrders.get(nmId) || { 
        orderCount: 0, orderSum: 0,
        weekOrderCount: 0, weekOrderSum: 0,
        monthOrderCount: 0, monthOrderSum: 0
      };
      const current = productRevenue.get(nmId) || createEmptyStats(orderData);
      
      const saleDate = new Date(sale.date);
      const isWeek = saleDate >= periodWeekAgo;
      const isMonth = saleDate >= periodMonthAgo;
      const price = sale.finishedPrice || 0;
      
      current.revenue += price;
      current.orders += 1;
      
      if (isWeek) {
        current.weekRevenue += price;
        current.weekOrders += 1;
      }
      
      if (isMonth) {
        current.monthRevenue += price;
        current.monthOrders += 1;
      }
      
      // Используем subject из WB если есть
      if (sale.subject && !current.title) {
        current.title = sale.subject;
      }
      
      productRevenue.set(nmId, current);
    });
  }

  // ✅ ДОБАВЛЯЕМ ТОВАРЫ ИЗ ЗАКАЗОВ, которых нет в выкупах
  // Это важно для отображения товаров с заказами, но без выкупов
  productOrders.forEach((orderData, nmId) => {
    if (!productRevenue.has(nmId)) {
      productRevenue.set(nmId, createEmptyStats(orderData));
    }
  });
  console.log(`📦 После добавления заказов: ${productRevenue.size} товаров в productRevenue`);

  // ✅ СОЗДАЕМ MAP С ФОТО ИЗ КАРТОЧЕК WB API (productsData)
  const wbCardsPhotoMap = new Map<number, string>();
  (productsData || []).forEach((card: any) => {
    const nmId = card.nmID;
    if (!nmId) return;
    
    // Извлекаем фото из карточки WB
    // Структура: card.photos[0].big или card.mediaFiles[0]
    let photoUrl: string | null = null;
    
    if (card.photos && Array.isArray(card.photos) && card.photos.length > 0) {
      // Формат: photos[].big или photos[].c516x688
      const photo = card.photos[0];
      photoUrl = photo.big || photo.c516x688 || photo.tm || null;
    } else if (card.mediaFiles && Array.isArray(card.mediaFiles) && card.mediaFiles.length > 0) {
      photoUrl = card.mediaFiles[0];
    }
    
    if (photoUrl) {
      wbCardsPhotoMap.set(nmId, photoUrl);
    }
  });
  console.log(`📷 Загружено фото из карточек WB: ${wbCardsPhotoMap.size} товаров`);

  // ✅ ОБОГАЩАЕМ ДАННЫЕ: Получаем названия товаров из БД
  console.log(`📦 Загружаем названия для ${productRevenue.size} товаров из БД...`);
  const productIdsForTitles = Array.from(productRevenue.keys());
  const productsFromDb = await safePrismaOperation(
    () => prismaAnalytics.product.findMany({
      where: {
        wbNmId: { in: productIdsForTitles.map(String) },
        userId: user.id
      },
      select: {
        wbNmId: true,
        name: true,
        originalImage: true,
        wbData: true
      }
    }),
    'получение названий товаров из БД'
  );

  const productTitlesMap = new Map<number, { name: string; image?: string }>();
  let titlesFromDb = 0;
  (productsFromDb || []).forEach((p: any) => {
    const nmId = Number(p.wbNmId);
    
    // Пытаемся получить изображение из разных источников
    let imageUrl: string | null = null;
    
    // 1. Из originalImage (загруженное пользователем)
    if (p.originalImage) {
      imageUrl = p.originalImage;
    }
    // 2. Из wbData (если товар опубликован на WB)
    else if (p.wbData && typeof p.wbData === 'object') {
      const wbData = p.wbData as any;
      if (wbData.photos && Array.isArray(wbData.photos) && wbData.photos.length > 0) {
        imageUrl = wbData.photos[0];
      }
    }
    // 3. Из карточек WB API (если нет в БД)
    if (!imageUrl && wbCardsPhotoMap.has(nmId)) {
      imageUrl = wbCardsPhotoMap.get(nmId) || null;
    }
    
    productTitlesMap.set(nmId, { 
      name: p.name,
      image: imageUrl || undefined
    });
    
    if (p.name) titlesFromDb++;
  });
  
  console.log(`✅ Загружено названий из БД: ${titlesFromDb} из ${productRevenue.size} товаров`);
  
  // Логируем примеры данных из БД
  if (productTitlesMap.size > 0) {
    const firstEntry = Array.from(productTitlesMap.entries())[0];
    console.log(`📋 Пример данных из БД:`, {
      nmId: firstEntry[0],
      name: firstEntry[1].name,
      hasImage: !!firstEntry[1].image,
      image: firstEntry[1].image?.substring(0, 100)
    });
  }
  
  // Обновляем названия в productRevenue
  let updatedTitles = 0;
  productRevenue.forEach((data, nmId) => {
    const dbData = productTitlesMap.get(nmId);
    // Обновляем если название пустое или отсутствует
    if (dbData?.name && (!data.title || data.title.trim() === '')) {
      console.log(`🔄 Обновляем название для товара ${nmId}: "${data.title}" -> "${dbData.name}"`);
      data.title = dbData.name;
      updatedTitles++;
    }
  });
  
  console.log(`✅ Обновлено названий: ${updatedTitles} из ${productRevenue.size} товаров`);

  console.log(`📦 productRevenue размер: ${productRevenue.size}`);
  
  const topProducts = Array.from(productRevenue.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([nmID, data]) => {
      const dbData = productTitlesMap.get(nmID);
      const wbCardPhoto = wbCardsPhotoMap.get(nmID);
      const wbImageUrl = generateWBImageUrl(nmID);
      
      // Приоритет: 1. БД (originalImage/wbData), 2. Карточка WB API, 3. CDN WB
      const imageUrl = dbData?.image || wbCardPhoto || wbImageUrl;
      
      return {
        nmID,
        title: data.title || dbData?.name || `Товар ${nmID}`,
        revenue: Math.round(data.revenue),
        orders: data.orders,
        image: imageUrl
      };
    });

  // ✅ ВСЕ товары (для поиска) с данными о заказах ПО ПЕРИОДАМ
  // Сначала добавляем товары с продажами
  const allProductsWithSales = Array.from(productRevenue.entries())
    .map(([nmID, data]) => {
      const dbData = productTitlesMap.get(nmID);
      const wbCardPhoto = wbCardsPhotoMap.get(nmID);
      const wbImageUrl = generateWBImageUrl(nmID);
      
      // Приоритет: 1. БД (originalImage/wbData), 2. Карточка WB API, 3. CDN WB
      const imageUrl = dbData?.image || wbCardPhoto || wbImageUrl;
      
      return {
        nmID,
        title: data.title || dbData?.name || `Товар ${nmID}`,
        revenue: Math.round(data.revenue),
        orders: data.orders,           // Количество выкупов (всего)
        orderCount: data.orderCount,   // Количество заказов (всего)
        orderSum: data.orderSum,       // Сумма заказов (всего)
        // Данные за неделю
        weekRevenue: Math.round(data.weekRevenue),
        weekOrders: data.weekOrders,
        weekOrderCount: data.weekOrderCount,
        weekOrderSum: Math.round(data.weekOrderSum),
        // Данные за месяц
        monthRevenue: Math.round(data.monthRevenue),
        monthOrders: data.monthOrders,
        monthOrderCount: data.monthOrderCount,
        monthOrderSum: Math.round(data.monthOrderSum),
        image: imageUrl
      };
    });

  // ✅ ДОБАВЛЯЕМ товары БЕЗ продаж (из productsData и БД)
  const productNmIdsWithSales = new Set(productRevenue.keys());
  
  // Товары из WB API без продаж
  const productsWithoutSalesFromWB = (productsData || [])
    .filter((card: any) => !productNmIdsWithSales.has(card.nmID))
    .map((card: any) => {
      const nmID = card.nmID;
      const dbData = productTitlesMap.get(nmID);
      const wbCardPhoto = wbCardsPhotoMap.get(nmID);
      const wbImageUrl = generateWBImageUrl(nmID);
      const imageUrl = dbData?.image || wbCardPhoto || wbImageUrl;
      
      return {
        nmID,
        title: card.title || dbData?.name || `Товар ${nmID}`,
        revenue: 0,
        orders: 0,
        orderCount: 0,
        orderSum: 0,
        weekRevenue: 0,
        weekOrders: 0,
        weekOrderCount: 0,
        weekOrderSum: 0,
        monthRevenue: 0,
        monthOrders: 0,
        monthOrderCount: 0,
        monthOrderSum: 0,
        image: imageUrl
      };
    });
  
  // Объединяем: сначала товары с продажами (отсортированные по выручке), потом без продаж
  const allProducts = [
    ...allProductsWithSales.sort((a, b) => b.revenue - a.revenue),
    ...productsWithoutSalesFromWB
  ];

  console.log(`✅ topProducts: ${topProducts.length}, allProducts: ${allProducts.length} (с продажами: ${allProductsWithSales.length}, без продаж: ${productsWithoutSalesFromWB.length})`);
  console.log(`📊 Товары для отправки (первые 3):`, topProducts.slice(0, 3).map(p => ({
    nmID: p.nmID,
    title: p.title,
    image: p.image
  })));
  
  console.log(`📊 ПЕРЕД ВОЗВРАТОМ: salesByDay.length=${salesByDay.length}, первый день: ${salesByDay[0]?.date}`);

  // РЕАЛЬНЫЕ остатки из WB API с детализацией по FBW/FBS
  // ⚠️ НЕ суммируем напрямую stock.quantity - там дубликаты!
  // Используем уникальные остатки по товарам из /api/wb/stocks
  const inWayToClient = stocksData.reduce((sum, stock) => sum + (stock.inWayToClient || 0), 0);
  const inWayFromClient = stocksData.reduce((sum, stock) => sum + (stock.inWayFromClient || 0), 0);
  const reserved = stocksData.reduce((sum, stock) => sum + (stock.quantityFull || 0) - (stock.quantity || 0), 0);
  const lowStockProducts = stocksData.filter(s => (s.quantity || 0) < 5).length;
  
  // Список товаров для пополнения (< 5 шт)
  const lowStockProductsList = stocksData
    .filter(s => (s.quantity || 0) < 5 && s.nmId) // Фильтруем товары без nmId
    .reduce((acc: Map<number, { nmId: number; quantity: number; warehouseName: string; title: string }>, stock) => {
      const nmId = stock.nmId;
      if (!nmId) return acc; // Пропускаем если нет nmId
      
      const existing = acc.get(nmId);
      if (existing) {
        existing.quantity += stock.quantity || 0;
      } else {
        // Получаем название из productTitlesMap или productsData
        const dbData = productTitlesMap?.get(nmId);
        const wbCard = (productsData || []).find((c: any) => c.nmID === nmId);
        const title = dbData?.name || wbCard?.title || stock.subject || stock.supplierArticle || `Артикул ${nmId}`;
        
        acc.set(nmId, {
          nmId,
          quantity: stock.quantity || 0,
          warehouseName: stock.warehouseName || 'Неизвестно',
          title
        });
      }
      return acc;
    }, new Map());
  
  // ✅ FBS остатки уже загружены из WB API в getWBStocks()
  // Больше не нужно дополнять из БД - все данные приходят напрямую с WB
  console.log('📦 Все остатки (FBW + FBS) загружены из WB API');
  
  // Группировка остатков по складам (FBW vs FBS)
  const stocksByWarehouse = new Map<string, { quantity: number; inWayToClient: number; inWayFromClient: number }>();
  stocksData.forEach(stock => {
    const warehouse = stock.warehouseName || 'Неизвестно';
    const current = stocksByWarehouse.get(warehouse) || { quantity: 0, inWayToClient: 0, inWayFromClient: 0 };
    current.quantity += stock.quantity || 0;
    current.inWayToClient += stock.inWayToClient || 0;
    current.inWayFromClient += stock.inWayFromClient || 0;
    stocksByWarehouse.set(warehouse, current);
  });
  
  // Определяем FBW и FBS остатки используя данные из /api/wb/stocks
  let fbwStock = 0;
  let fbsStock = 0;
  
  console.log('🏭 Анализ остатков по типам складов (из /api/wb/stocks):');
  
  // Подсчитываем остатки с учетом товаров в пути
  let fbwOnWarehouse = 0;
  let fbwInWayToClient = 0;
  let fbwInWayFromClient = 0;
  
  stocksData.forEach(stock => {
    const inWayToClient = stock.inWayToClient || 0;
    const inWayFromClient = stock.inWayFromClient || 0;
    
    // Используем fbsStock и fbwStock из /api/wb/stocks
    const stockFBS = stock.fbsStock || 0;
    const stockFBW = stock.fbwStock || 0;
    
    fbsStock += stockFBS;
    fbwOnWarehouse += stockFBW;
    fbwInWayToClient += inWayToClient;
    fbwInWayFromClient += inWayFromClient;
  });
  
  // FBW = на складе + в пути к клиенту + возвраты (как на странице товаров)
  fbwStock = fbwOnWarehouse + fbwInWayToClient + fbwInWayFromClient;
  
  console.log(`  ✅ FBW (склады WB): ${fbwStock} шт (на складе: ${fbwOnWarehouse}, к клиенту: ${fbwInWayToClient}, возвраты: ${fbwInWayFromClient})`);
  console.log(`  📦 FBS (склады продавца): ${fbsStock} шт`);
  
  // ✅ ПРАВИЛЬНЫЙ расчет totalStock: FBS (на складе продавца) + FBW (только на складе WB, БЕЗ товаров в пути)
  // Товары в пути не считаются как "на складе", они учитываются отдельно в inWayToClient
  const totalStock = fbsStock + fbwOnWarehouse;
  console.log(`  📊 ИТОГО на складе: ${totalStock} шт (FBS: ${fbsStock} + FBW на складе: ${fbwOnWarehouse})`);
  
  // Детализация по складам для отладки
  console.log('🏭 Детализация по складам:');
  stocksByWarehouse.forEach((data, warehouse) => {
    // Находим warehouseType для этого склада
    const stockForWarehouse = stocksData.find(s => s.warehouseName === warehouse);
    const warehouseType = stockForWarehouse?.warehouseType || 'FBW';
    
    if (warehouseType === 'FBS') {
      console.log(`  📦 FBS склад "${warehouse}": ${data.quantity} шт`);
    } else {
      console.log(`  ✅ FBW склад "${warehouse}": ${data.quantity} шт`);
    }
  });
  
  // Реальная стоимость остатков на основе цен из БД и продаж
  const priceMap = new Map<number, number>();
  
  // 1. Сначала берем цены из БД (productMap) - ПРИОРИТЕТ: discountPrice (цена со скидкой)
  productMap.forEach((product, nmIdStr) => {
    const nmId = parseInt(nmIdStr);
    // ВАЖНО: Используем discountPrice (цена со скидкой), если нет - fallback на price
    const priceToUse = product.discountPrice || product.price;
    if (priceToUse && priceToUse > 0) {
      priceMap.set(nmId, priceToUse);
    }
  });
  
  // 2. Дополняем ценами из продаж (если нет в БД)
  salesData.forEach(sale => {
    if (sale.nmId && sale.finishedPrice && !priceMap.has(sale.nmId)) {
      priceMap.set(sale.nmId, sale.finishedPrice);
    }
  });
  
  // 3. Также берем цены из детализированного отчета
  if (useDetailedReport && detailedReport) {
    detailedReport.forEach((item: any) => {
      if (item.nmId && item.retailPriceWithDisc && !priceMap.has(item.nmId)) {
        priceMap.set(item.nmId, item.retailPriceWithDisc);
      }
    });
  }
  
  // 4. Берем цены из stocksData (Price поле)
  stocksData.forEach(stock => {
    if (stock.nmId && stock.Price && stock.Price > 0 && !priceMap.has(stock.nmId)) {
      priceMap.set(stock.nmId, stock.Price);
    }
  });
  
  // 5. Берем цены из productsData (карточки товаров WB API)
  // Структура: card.sizes[].price или card.sizes[].discountedPrice
  let pricesFromCards = 0;
  (productsData || []).forEach((card: any) => {
    const nmId = card.nmID;
    if (!nmId) return;
    
    // Ищем цену в sizes
    if (card.sizes && Array.isArray(card.sizes) && card.sizes.length > 0) {
      const size = card.sizes[0];
      // ВАЖНО: discountedPrice - цена со скидкой (приоритет!)
      // WB API возвращает цены в копейках (например 399900 = 3999₽)
      let price = size.discountedPrice || size.price || 0;
      
      // Если цена > 100000, скорее всего это копейки
      if (price > 100000) {
        price = price / 100;
      }
      
      // Перезаписываем цену из БД, если нашли discountedPrice в WB API
      if (price > 0 && size.discountedPrice) {
        priceMap.set(nmId, price);
        pricesFromCards++;
      } else if (price > 0 && !priceMap.has(nmId)) {
        // Используем базовую цену только если нет другой
        priceMap.set(nmId, price);
        pricesFromCards++;
      }
    }
  });
  
  console.log(`💰 Карта цен: ${priceMap.size} товаров (из карточек WB: ${pricesFromCards})`);
  
  // 6. ✅ НОВОЕ: Получаем цены из WB API для товаров без цены в БД
  const nmIdsWithoutPrice: number[] = [];
  stocksData.forEach(stock => {
    if (stock.nmId && !priceMap.has(stock.nmId)) {
      nmIdsWithoutPrice.push(stock.nmId);
    }
  });
  
  if (nmIdsWithoutPrice.length > 0 && apiToken) {
    console.log(`🔄 Загрузка цен из WB API для ${nmIdsWithoutPrice.length} товаров без цены...`);
    try {
      const { wbApiService } = await import('@/lib/services/wbApiService');
      const wbPrices = await wbApiService.getBatchPrices(apiToken, nmIdsWithoutPrice);
      
      console.log(`✅ Получено ${wbPrices.size} цен из WB API`);
      
      // Сохраняем цены в БД и добавляем в priceMap
      const pricesUpdated: number[] = [];
      for (const [nmId, price] of wbPrices.entries()) {
        if (price > 0) {
          priceMap.set(nmId, price);
          
          // Сохраняем в БД
          try {
            await prisma.product.updateMany({
              where: { 
                wbNmId: String(nmId),
                userId: user.id
              },
              data: { 
                discountPrice: price,
                price: price // Также обновляем базовую цену
              }
            });
            pricesUpdated.push(nmId);
          } catch (dbError) {
            console.error(`⚠️ Ошибка сохранения цены для товара ${nmId}:`, dbError);
          }
        }
      }
      
      if (pricesUpdated.length > 0) {
        console.log(`✅ Обновлено цен в БД: ${pricesUpdated.length} товаров`);
        console.log(`   Примеры: ${pricesUpdated.slice(0, 3).map(id => `${id}: ${priceMap.get(id)}₽`).join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки цен из WB API:`, error);
    }
  }
  
  // Логируем первые 5 цен для отладки с источником
  let priceLogCount = 0;
  priceMap.forEach((price, nmId) => {
    if (priceLogCount < 5) {
      const product = productMap.get(String(nmId));
      const source = product?.discountPrice ? 'discountPrice (БД)' : product?.price ? 'price (БД)' : 'WB API';
      console.log(`  💵 Товар ${nmId}: ${price}₽ (источник: ${source})`);
      priceLogCount++;
    }
  });
  
  // ✅ ИСПРАВЛЕНИЕ: Сначала агрегируем количество по nmId (суммируем остатки со всех складов)
  const stocksByNmId = new Map<number, { 
    totalQuantity: number; 
    onWarehouse: number;
    inWayToClient: number; 
    inWayFromClient: number;
  }>();
  
  stocksData.forEach(stock => {
    if (!stock.nmId) return;
    
    const existing = stocksByNmId.get(stock.nmId) || { 
      totalQuantity: 0, 
      onWarehouse: 0,
      inWayToClient: 0, 
      inWayFromClient: 0 
    };
    
    existing.onWarehouse += stock.quantity || 0;
    existing.inWayToClient += stock.inWayToClient || 0;
    existing.inWayFromClient += stock.inWayFromClient || 0;
    existing.totalQuantity = existing.onWarehouse + existing.inWayToClient + existing.inWayFromClient;
    
    stocksByNmId.set(stock.nmId, existing);
  });
  
  console.log(`📦 Агрегировано остатков по ${stocksByNmId.size} товарам`);
  
  // Теперь рассчитываем стоимость по агрегированным данным
  let stockValueCalculated = 0;
  let stocksWithPrice = 0;
  let stocksWithoutPrice = 0;
  
  stocksByNmId.forEach((stockData, nmId) => {
    // Приоритет: 1. priceMap, 2. из stocksData
    let price: number = priceMap.get(nmId) || 0;
    
    if (price <= 0) {
      // Ищем цену в исходных данных stocksData
      const stockWithPrice = stocksData.find(s => s.nmId === nmId && (s.Price || s.price));
      if (stockWithPrice) {
        price = stockWithPrice.Price || stockWithPrice.price || 0;
        // Если цена > 100000, скорее всего это копейки
        if (price > 100000) {
          price = price / 100;
        }
      }
    }
    
    if (price && price > 0) {
      const itemValue = stockData.totalQuantity * price;
      stockValueCalculated += itemValue;
      stocksWithPrice++;
      // Логируем первые 10 товаров для отладки
      if (stocksWithPrice <= 10) {
        const product = productMap.get(String(nmId));
        const priceSource = product?.discountPrice ? `discountPrice=${product.discountPrice}₽` : 
                           product?.price ? `price=${product.price}₽` : 
                           'WB API';
        console.log(`  💵 [${nmId}] ${stockData.totalQuantity} шт × ${price}₽ = ${itemValue.toLocaleString('ru-RU')}₽ (${priceSource})`);
        console.log(`      └─ На складе: ${stockData.onWarehouse}, К клиенту: ${stockData.inWayToClient}, Возвраты: ${stockData.inWayFromClient}`);
      }
    } else {
      stocksWithoutPrice++;
      // Логируем ВСЕ товары без цены для отладки
      const product = productMap.get(String(nmId));
      const productName = product?.name || `Товар ${nmId}`;
      console.log(`  ⚠️ [${nmId}] "${productName}" БЕЗ ЦЕНЫ, количество: ${stockData.totalQuantity} шт`);
      console.log(`      └─ На складе: ${stockData.onWarehouse}, К клиенту: ${stockData.inWayToClient}, Возвраты: ${stockData.inWayFromClient}`);
    }
  });
  
  const stockValue = stockValueCalculated;
  console.log(`\n💰 ИТОГО стоимость остатков: ${Math.round(stockValue).toLocaleString('ru-RU')}₽`);
  console.log(`   ✅ Товаров с ценой: ${stocksWithPrice}`);
  console.log(`   ⚠️ Товаров БЕЗ цены: ${stocksWithoutPrice}`);
  
  if (stocksWithoutPrice > 0) {
    console.log(`\n⚠️ ВНИМАНИЕ: ${stocksWithoutPrice} товаров не учтены в стоимости остатков!`);
    console.log(`   Укажите цены (discountPrice) для этих товаров в базе данных.`);
  }
  
  console.log('📦 Остатки:', {
    всегоНаСкладе: totalStock,
    FBW: fbwStock,
    FBS: fbsStock,
    вПутиККлиенту: inWayToClient,
    вПутиОтКлиента: inWayFromClient,
    зарезервировано: reserved,
    стоимостьОстатков: Math.round(stockValue)
  });
  
  if (fbsStock === 0 && totalStock > 0) {
    console.warn('⚠️ FBS остатки = 0, но есть общие остатки. Возможно, все склады определены как FBW.');
    console.log('🔍 Список всех складов:', Array.from(stocksByWarehouse.keys()));
  }

  // Инициализация переменных конверсии
  let totalViews = 0;
  let addToCart = 0;
  let totalOrdersFromAnalytics = 0;
  let avgCTR = 0;
  let addToCartRate = 0;
  let purchaseRate = 0;
  let cartAbandonmentRate = 0;
  
  // Получение данных конверсии из отдельного endpoint (с кешем 60 минут)
  try {
    console.log('📊 Получение реальных данных о конверсии из WB Analytics API...');
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const conversionResponse = await fetch(
      `${baseUrl}/api/analytics/conversion?days=${days || 30}`,
      {
        headers: {
          'Cookie': request?.headers.get('cookie') || ''
        }
      }
    );
    
    if (conversionResponse.ok) {
      const conversionResult = await conversionResponse.json();
      
      if (conversionResult.success && conversionResult.data) {
        totalViews = conversionResult.data.totalViews || 0;
        addToCart = conversionResult.data.totalAddToCart || 0;
        totalOrdersFromAnalytics = conversionResult.data.totalOrders || 0;
        avgCTR = conversionResult.data.avgCTR || 0;
        addToCartRate = conversionResult.data.addToCartRate || 0;
        purchaseRate = conversionResult.data.purchaseRate || 0;
        cartAbandonmentRate = conversionResult.data.cartAbandonmentRate || 0;
        
        const cacheStatus = conversionResult.fromCache ? `из кеша (возраст: ${conversionResult.cacheAge} мин)` : 'с WB API';
        console.log(`✅ Данные конверсии получены ${cacheStatus}:`, {
          просмотры: totalViews,
          вКорзину: addToCart,
          заказов: totalOrdersFromAnalytics,
          CTR: `${avgCTR.toFixed(2)}%`,
          конверсияВКорзину: `${addToCartRate.toFixed(2)}%`,
          конверсияВЗаказ: `${purchaseRate.toFixed(2)}%`
        });
      }
    } else {
      console.warn(`⚠️ Ошибка получения конверсии: ${conversionResponse.status}`);
    }
  } catch (conversionError) {
    console.warn('⚠️ Ошибка при запросе конверсии:', conversionError);
  }

  // Топ поисковые запросы из синхронизированных данных ProductAnalytics
  let searchQueries: Array<{ query: string; frequency: number; orders: number; revenue: number }> = [];
  try {
    // Получаем поисковые запросы из таблицы ProductAnalytics
    const allAnalytics = await prismaAnalytics.productAnalytics.findMany({
      where: {
        product: {
          userId: user.id
        }
      },
      select: {
        topSearchQueries: true,
        revenue: true,
        orders: true
      }
    });
    
    // Фильтруем только те, у которых есть поисковые запросы
    const analyticsWithQueries = allAnalytics.filter(a => 
      a.topSearchQueries && 
      Array.isArray(a.topSearchQueries) && 
      (a.topSearchQueries as any[]).length > 0
    );
    
    // Агрегируем все поисковые запросы
    const queryMap = new Map<string, { frequency: number; orders: number; revenue: number; addToCart: number }>();
    
    analyticsWithQueries.forEach(analytics => {
      const queries = analytics.topSearchQueries as any[];
      if (!queries || !Array.isArray(queries)) return;
      
      queries.forEach((q: any) => {
        if (!q.query && !q.text) return;
        const queryText = q.query || q.text || '';
        if (!queryText) return;
        
        const existing = queryMap.get(queryText) || { frequency: 0, orders: 0, revenue: 0, addToCart: 0 };
        existing.frequency += q.frequency || q.openCard || 1;
        existing.orders += q.orders || 0;
        existing.addToCart += q.addToCart || 0;
        existing.revenue += (q.orders || 0) * (analytics.revenue / Math.max(analytics.orders, 1));
        queryMap.set(queryText, existing);
      });
    });
    
    // Сортируем по количеству заказов и берем топ-10
    searchQueries = Array.from(queryMap.entries())
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 10)
      .map(([query, data]) => ({
        query,
        frequency: data.frequency,
        orders: data.orders,
        revenue: Math.round(data.revenue)
      }));
    
    console.log(`📊 Топ поисковых запросов: ${searchQueries.length} (из ${analyticsWithQueries.length} товаров с данными)`);
  } catch (error) {
    console.warn('⚠️ Ошибка получения поисковых запросов:', error);
    searchQueries = [];
  }

  // Производительность категорий
  const categoryPerformance = aggregateByCategory(salesData);

  // ✅ ПОЛУЧАЕМ АКТУАЛЬНЫЕ ШТРАФЫ И УДЕРЖАНИЯ через WbPenaltiesService
  let penalties = {
    dimensionPenalty: 0,
    dimensionPenaltyCount: 0,
    deductions: 0,
    deductionsCount: 0,
    antifraud: 0,
    antifraudCount: 0,
    labelingPenalty: 0,
    labelingPenaltyCount: 0,
    paidAcceptance: 0,
    paidAcceptanceCount: 0,
    paidStorage: 0,
    paidStorageCount: 0,
    totalPenalties: 0,
    totalPaidServices: 0,
    grandTotal: 0
  };

  console.log('🔄 [buildAnalyticsDashboard] ШАГ 5: Получение актуальных штрафов и удержаний...');
  try {
    const penaltiesService = new WbPenaltiesService(apiToken);
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    console.log('\n🔥 === ЗАПРОС АКТУАЛЬНЫХ ШТРАФОВ И УДЕРЖАНИЙ WB ===');
    console.log(`📅 Период: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    
    // Добавляем таймаут на случай зависания
    const penaltiesPromise = penaltiesService.getAggregatedPenalties(startDate, endDate);
    const timeoutPromise = new Promise<any>((resolve) => {
      setTimeout(() => {
        console.warn('⚠️ Таймаут получения штрафов (30с), продолжаем без них...');
        resolve({
          dimensionPenalty: 0,
          dimensionPenaltyCount: 0,
          deductions: 0,
          deductionsCount: 0,
          antifraud: 0,
          antifraudCount: 0,
          labelingPenalty: 0,
          labelingPenaltyCount: 0,
          paidAcceptance: 0,
          paidAcceptanceCount: 0,
          paidStorage: 0,
          paidStorageCount: 0,
          totalPenalties: 0,
          totalPaidServices: 0,
          grandTotal: 0
        });
      }, 30000); // 30 секунд таймаут
    });
    
    penalties = await Promise.race([penaltiesPromise, timeoutPromise]);
    console.log('✅ Получены актуальные штрафы и удержания от WB API');
    console.log(`📊 Всего штрафов: ${penalties.grandTotal}₽\n`);
  } catch (error) {
    console.error('❌ Ошибка получения актуальных штрафов:', error);
  }

  console.log('🔄 [buildAnalyticsDashboard] ШАГ 6: Формирование итогового объекта...');
  // Период времени
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todaySales = salesData.filter(s => new Date(s.date) >= today).length;
  const weekSales = salesData.filter(s => new Date(s.date) >= weekAgo).length;
  const monthSales = salesData.filter(s => new Date(s.date) >= monthAgo).length;

  console.log('🔄 [buildAnalyticsDashboard] ШАГ 7: Возврат результата...');
  const result = {
    financial: {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue),
      totalForPay: Math.round(totalForPay), // К переводу от WB (без себестоимости)
      totalProfit: Math.round(totalProfit), // Чистая прибыль (с вычетом себестоимости)
      profitMargin: Math.round(profitMargin * 100) / 100,
      periodComparison: {
        revenueChange: Math.round(revenueChange * 100) / 100,
        ordersChange: Math.round(ordersChange * 100) / 100,
        profitChange: Math.round(profitChange * 100) / 100
      },
      expenses: {
        totalWbCommission: Math.round(totalWbCommission),
        totalLogistics: Math.round(totalLogistics),
        logisticsToClient: Math.round(logisticsToClient), // Логистика до клиента
        logisticsReturns: Math.round(logisticsReturns), // Логистика возвратов (50₽ за единицу)
        returnsCount, // Количество возвратов
        totalStorage: Math.round(totalStorage),
        totalAcceptance: Math.round(totalAcceptance),
        totalPenalty: Math.round(totalPenalty), // Штрафы WB из детализированного отчета
        totalDeduction: Math.round(totalDeduction), // 🔥 Корректировка ВВ
        totalOtherDeductions: Math.round(totalOtherDeductions), // Прочие вычеты
        totalWbExpenses: Math.round(totalWbExpenses),
        totalCost: Math.round(totalCost),
        totalTaxes: Math.round(totalTaxes),
        totalAdvertising: Math.round(totalAdvertising),
        // ✅ АКТУАЛЬНЫЕ ШТРАФЫ И УДЕРЖАНИЯ (из специализированных API WB)
        penalties: {
          dimensionPenalty: Math.round(penalties.dimensionPenalty),
          dimensionPenaltyCount: penalties.dimensionPenaltyCount,
          deductions: Math.round(penalties.deductions),
          deductionsCount: penalties.deductionsCount,
          antifraud: Math.round(penalties.antifraud),
          antifraudCount: penalties.antifraudCount,
          labelingPenalty: Math.round(penalties.labelingPenalty),
          labelingPenaltyCount: penalties.labelingPenaltyCount,
          paidAcceptance: Math.round(penalties.paidAcceptance),
          paidAcceptanceCount: penalties.paidAcceptanceCount,
          paidStorage: Math.round(penalties.paidStorage),
          paidStorageCount: penalties.paidStorageCount,
          totalPenalties: Math.round(penalties.totalPenalties),
          totalPaidServices: Math.round(penalties.totalPaidServices),
          grandTotal: Math.round(penalties.grandTotal)
        }
      },
      costInfo: {
        totalProducts: totalProductsInSales,
        productsWithCost: costFromDb,
        productsWithoutCost: missingCostCount,
        coveragePercent: Math.round(costCoveragePercent * 10) / 10,
        hasMissingCost,
        warning: hasMissingCost ? `Укажите себестоимость для ${missingCostCount} товаров, чтобы получить более точные данные о прибыли` : null
      }
    },
    sales: {
      todaySales,
      weekSales,
      monthSales,
      topProducts,
      allProducts,
      salesByDay: salesByDayWithOrders
    },
    inventory: {
      totalProducts: productsData.length,
      totalStock, // FBS + FBW на складе (БЕЗ товаров в пути)
      lowStockProducts,
      lowStockProductsList: Array.from(lowStockProductsList.values()).sort((a: any, b: any) => a.quantity - b.quantity) as Array<{ nmId: number; quantity: number; warehouseName: string; title: string }>,
      inTransit: inWayToClient, // Товары в пути к клиенту
      inReturn: inWayFromClient, // Товары в пути от клиента (возвраты)
      reserved,
      stockValue: Math.round(stockValue),
      // Детализация по типам складов (как на странице "Товары")
      fbsStock, // FBS остатки (склады продавца)
      fbwStock: fbwOnWarehouse, // FBW на складе WB (БЕЗ товаров в пути)
      fbwTotal: fbwStock, // FBW всего (на складе + в пути + возвраты)
      fbwInTransitToClient: fbwInWayToClient, // FBW товары в пути к клиенту
      fbwInTransitFromClient: fbwInWayFromClient, // FBW товары в пути от клиента
      // Детализация по складам
      warehouseDetails: Array.from(stocksByWarehouse.entries()).map(([name, data]) => {
        const stockForWarehouse = stocksData.find(s => s.warehouseName === name);
        const warehouseType = stockForWarehouse?.warehouseType || 'FBW';
        
        return {
          name,
          type: warehouseType,
          quantity: data.quantity,
          inWayToClient: data.inWayToClient,
          inWayFromClient: data.inWayFromClient,
          total: data.quantity + data.inWayToClient + data.inWayFromClient
        };
      }).sort((a, b) => b.total - a.total)
    },
    conversion: {
      totalViews,
      addToCartRate: Math.round(addToCartRate * 100) / 100,
      purchaseRate: Math.round(purchaseRate * 100) / 100,
      avgCTR: Math.round(avgCTR * 100) / 100,
      cartAbandonmentRate: Math.round(cartAbandonmentRate * 100) / 100
    },
    topSearchQueries: searchQueries,
    categoryPerformance,
    period,
    generatedAt: new Date().toISOString()
  };
  
  console.log('✅ [buildAnalyticsDashboard] ЗАВЕРШЕНО УСПЕШНО');
  return result;
}

/**
 * Агрегация продаж по дням из детализированного отчета
 * ВАЖНО: 
 * - revenue и orders - это ВЫКУПЫ (когда клиент забрал товар)
 * - Детализированный отчет содержит только выкупы, не заказы
 * - Для заказов нужно использовать воронку продаж (sales-funnel/products/history)
 */
function aggregateSalesByDayFromDetailedReport(detailedReport: any[]): Array<{ date: string; revenue: number; orders: number; fbsBuyouts: number; fbwBuyouts: number; fbsRevenue: number; fbwRevenue: number }> {
  const dailyData = new Map<string, { revenue: number; orders: number; fbsBuyouts: number; fbwBuyouts: number; fbsRevenue: number; fbwRevenue: number }>();
  
  // Фильтруем ТОЛЬКО записи о продажах/возвратах (не логистику, хранение и т.д.)
  // docTypeName: "Продажа", "Возврат", "Корректировка продаж" - это продажи
  // docTypeName: "Логистика", "Хранение", "Приёмка" - это НЕ продажи
  const salesRecords = detailedReport.filter(item => {
    const docType = (item.docTypeName || '').toLowerCase();
    // Только продажи и возвраты товаров
    return docType.includes('продажа') || docType.includes('возврат') || 
           docType.includes('реализация') || docType.includes('выкуп');
  });
  
  console.log(`📊 Агрегация ВЫКУПОВ: ${salesRecords.length} продаж из ${detailedReport.length} записей`);
  
  // Определяем FBS склады по названию (склады продавца обычно содержат "FBS" или имеют специфические названия)
  const isFBSWarehouse = (warehouseName: string): boolean => {
    const name = (warehouseName || '').toLowerCase();
    // FBS склады обычно содержат "fbs" в названии или это склады продавца
    // FBW склады - это склады WB (Коледино, Подольск, Электросталь и т.д.)
    const fbwWarehouses = ['коледино', 'подольск', 'электросталь', 'казань', 'екатеринбург', 
                          'новосибирск', 'белая дача', 'тула', 'санкт-петербург', 'краснодар',
                          'хабаровск', 'пушкино', 'внуково', 'домодедово', 'шушары'];
    return !fbwWarehouses.some(w => name.includes(w)) && name.length > 0;
  };
  
  salesRecords.forEach(item => {
    // Используем saleDt (дата продажи/выкупа) - основное поле в детализированном отчете WB
    const dateStr = item.saleDt || item.sale_dt || item.orderDt || item.order_dt;
    if (!dateStr) {
      return;
    }
    
    const date = new Date(dateStr).toISOString().split('T')[0];
    const current = dailyData.get(date) || { revenue: 0, orders: 0, fbsBuyouts: 0, fbwBuyouts: 0, fbsRevenue: 0, fbwRevenue: 0 };
    
    // Для возвратов вычитаем
    const docType = (item.docTypeName || '').toLowerCase();
    const isReturn = docType.includes('возврат');
    const multiplier = isReturn ? -1 : 1;
    
    // Выручка = цена × количество единиц
    const revenue = (item.retailPriceWithDisc || item.retailPrice || 0) * (item.quantity || 1);
    const quantity = (item.quantity || 1) * multiplier;
    
    current.revenue += revenue * multiplier;
    current.orders += quantity;
    
    // Разбивка по FBS/FBW
    const warehouseName = item.warehouseName || item.warehouse_name || '';
    if (isFBSWarehouse(warehouseName)) {
      current.fbsBuyouts += quantity;
      current.fbsRevenue += revenue * multiplier;
    } else {
      current.fbwBuyouts += quantity;
      current.fbwRevenue += revenue * multiplier;
    }
    
    dailyData.set(date, current);
  });

  const result = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders,  // Это выкупы, не заказы!
      fbsBuyouts: data.fbsBuyouts,
      fbwBuyouts: data.fbwBuyouts,
      fbsRevenue: Math.round(data.fbsRevenue),
      fbwRevenue: Math.round(data.fbwRevenue)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const totalBuyouts = result.reduce((sum, d) => sum + d.orders, 0);
  const totalFBS = result.reduce((sum, d) => sum + d.fbsBuyouts, 0);
  const totalFBW = result.reduce((sum, d) => sum + d.fbwBuyouts, 0);
  console.log(`✅ Агрегировано ${result.length} дней, всего ${totalBuyouts} выкупов (FBS: ${totalFBS}, FBW: ${totalFBW})`);
  
  return result;
}

/**
 * Агрегация продаж по дням из старого API
 */
function aggregateSalesByDay(salesData: any[]): Array<{ date: string; revenue: number; orders: number }> {
  const dailyData = new Map<string, { revenue: number; orders: number }>();
  
  salesData.forEach(sale => {
    const date = sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const current = dailyData.get(date) || { revenue: 0, orders: 0 };
    current.revenue += sale.finishedPrice || 0;
    current.orders += 1;
    dailyData.set(date, current);
  });

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Агрегация ЗАКАЗОВ по дням из /api/v1/supplier/orders
 * ВАЖНО: Это реальные заказы (когда клиент оформил заказ), а не выкупы
 * Исключаем отмененные заказы (isCancel = true)
 */
function aggregateOrdersByDay(ordersData: any[]): Array<{ date: string; orderCount: number; orderSum: number }> {
  const dailyData = new Map<string, { orderCount: number; orderSum: number }>();
  
  console.log(`📊 Агрегация ЗАКАЗОВ по дням из ${ordersData.length} записей`);
  
  // Логируем сегодняшние заказы для отладки
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = ordersData.filter(o => {
    const dateStr = o.date || o.lastChangeDate;
    if (!dateStr) return false;
    const orderDate = new Date(dateStr).toISOString().split('T')[0];
    return orderDate === todayStr && !o.isCancel;
  });
  console.log(`📊 Сегодняшних заказов (${todayStr}): ${todayOrders.length} из ${ordersData.length}`);
  if (todayOrders.length > 0) {
    console.log(`📊 Первые 3 сегодняшних заказа:`, todayOrders.slice(0, 3).map(o => ({
      date: o.date,
      nmId: o.nmId,
      finishedPrice: o.finishedPrice,
      isCancel: o.isCancel
    })));
  }
  
  ordersData.forEach(order => {
    // Пропускаем отмененные заказы
    if (order.isCancel) return;
    
    const dateStr = order.date || order.lastChangeDate;
    if (!dateStr) return;
    
    const date = new Date(dateStr).toISOString().split('T')[0];
    const current = dailyData.get(date) || { orderCount: 0, orderSum: 0 };
    
    // finishedPrice - цена после скидок (что платит покупатель)
    const orderPrice = order.finishedPrice || order.priceWithDisc || order.totalPrice || 0;
    current.orderCount += 1;
    current.orderSum += orderPrice;
    
    dailyData.set(date, current);
  });

  const result = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      orderCount: data.orderCount,
      orderSum: Math.round(data.orderSum)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const totalOrders = result.reduce((sum, day) => sum + day.orderCount, 0);
  const totalSum = result.reduce((sum, day) => sum + day.orderSum, 0);
  
  console.log(`✅ Агрегировано ${result.length} дней ЗАКАЗОВ: ${totalOrders} заказов на ${totalSum}₽`);
  if (result.length > 0) {
    console.log(`  📅 Первый день: ${result[0].date}, заказов: ${result[0].orderCount}, сумма: ${result[0].orderSum}₽`);
    console.log(`  📅 Последний день: ${result[result.length - 1].date}, заказов: ${result[result.length - 1].orderCount}, сумма: ${result[result.length - 1].orderSum}₽`);
    
    // Логируем сегодняшние заказы отдельно
    const todayStr = new Date().toISOString().split('T')[0];
    const todayData = result.find(d => d.date === todayStr);
    if (todayData) {
      console.log(`  📅 СЕГОДНЯ (${todayStr}): ${todayData.orderCount} заказов на ${todayData.orderSum}₽`);
    } else {
      console.log(`  ⚠️ СЕГОДНЯ (${todayStr}): нет заказов в данных`);
    }
  }
  
  return result;
}

/**
 * Извлечение поисковых запросов из данных
 * ВАЖНО: Возвращаем пустой массив, так как реальные поисковые запросы 
 * доступны только через WB Analytics API (POST /api/v2/search-report/product/search-texts)
 * Не используем фейковые данные из названий товаров
 */
function extractSearchQueries(salesData: any[]): Array<{ query: string; frequency: number; orders: number; revenue: number }> {
  // TODO: Интегрировать с WB Analytics API для получения реальных поисковых запросов
  // Пока возвращаем пустой массив вместо фейковых данных
  return [];
}

/**
 * Агрегация по категориям
 * Использует поле subject из WB API (это реальная категория товара)
 */
function aggregateByCategory(salesData: any[]): Array<{ category: string; revenue: number; orders: number; avgPrice: number }> {
  const categories = new Map<string, { revenue: number; orders: number }>();
  
  salesData.forEach(sale => {
    // subject - это реальная категория товара из WB (например "Платья", "Балаклавы")
    // Не используем если нет subject - не добавляем "Без категории"
    const category = sale.subject;
    if (!category) return;
    
    const current = categories.get(category) || { revenue: 0, orders: 0 };
    current.revenue += sale.finishedPrice || sale.retailPriceWithDisc || 0;
    current.orders += 1;
    categories.set(category, current);
  });

  // Возвращаем только если есть реальные данные
  if (categories.size === 0) {
    return [];
  }

  return Array.from(categories.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([category, data]) => ({
      category,
      revenue: Math.round(data.revenue),
      orders: data.orders,
      avgPrice: Math.round(data.revenue / data.orders)
    }));
}

/**
 * Генерация URL изображения товара
 * Используем CDN Wildberries basket для получения изображений
 * 
 * Правильная формула определения basket:
 * vol 0-143 → basket-01
 * vol 144-287 → basket-02
 * vol 288-431 → basket-03
 * vol 432-719 → basket-04
 * vol 720-1007 → basket-05
 * vol 1008-1061 → basket-06
 * vol 1062-1115 → basket-07
 * vol 1116-1169 → basket-08
 * vol 1170-1313 → basket-09
 * vol 1314-1601 → basket-10
 * vol 1602-1655 → basket-11
 * vol 1656-1919 → basket-12
 * vol 1920-2045 → basket-13
 * vol 2046+ → basket-14
 */
function generateWBImageUrl(nmID: number): string {
  const vol = Math.floor(nmID / 100000);
  const part = Math.floor(nmID / 1000);
  
  // Определяем номер basket по диапазону vol
  let basketNum: number;
  if (vol <= 143) basketNum = 1;
  else if (vol <= 287) basketNum = 2;
  else if (vol <= 431) basketNum = 3;
  else if (vol <= 719) basketNum = 4;
  else if (vol <= 1007) basketNum = 5;
  else if (vol <= 1061) basketNum = 6;
  else if (vol <= 1115) basketNum = 7;
  else if (vol <= 1169) basketNum = 8;
  else if (vol <= 1313) basketNum = 9;
  else if (vol <= 1601) basketNum = 10;
  else if (vol <= 1655) basketNum = 11;
  else if (vol <= 1919) basketNum = 12;
  else if (vol <= 2045) basketNum = 13;
  else basketNum = 14;
  
  // Формат WB CDN: https://basket-{01-14}.wbbasket.ru/vol{vol}/part{part}/{nmID}/images/big/1.webp
  return `https://basket-${String(basketNum).padStart(2, '0')}.wbbasket.ru/vol${vol}/part${part}/${nmID}/images/big/1.webp`;
}
