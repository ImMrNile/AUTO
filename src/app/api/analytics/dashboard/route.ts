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
import { AnalyticsCalculator } from '@/lib/services/analyticsCalculator'; // ✅ Новый расчет из БД
import { WbAnalyticsEngine } from '@/lib/services/wbAnalyticsEngine'; // ✅ Комплексный движок аналитики

// НАСТРОЙКИ КЕШИРОВАНИЯ И RATE LIMITING
const CACHE_CONFIG = {
  CACHE_TTL: 6 * 60 * 60 * 1000, // 6 часов
  DELAY_BETWEEN_REQUESTS: 1000, // 1000ms между запросами (увеличено для безопасности)
  MIN_DELAY_BETWEEN_REQUESTS: 200, // Минимальная задержка согласно WB API
  RETRY_DELAYS: [2000, 5000, 10000, 20000], // 2с, 5с, 10с, 20с (увеличено)
  MAX_RETRIES: 3
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
      totalOtherDeductions: number; // Штрафы, корректировки и прочие вычеты WB
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
      revenue: number;
      orders: number;
    }>;
  };
  
  // Остатки и логистика
  inventory: {
    totalProducts: number;
    totalStock: number;
    lowStockProducts: number;
    inTransit: number; // В пути к клиенту
    inReturn: number; // В пути от клиента (возвраты)
    reserved: number;
    stockValue: number;
    fbwStock: number; // Остатки на складах WB (FBW)
    fbsStock: number; // Остатки на складах продавца (FBS)
    warehouseDetails: Array<{
      name: string;
      quantity: number;
      inWayToClient: number;
      inWayFromClient: number;
      isFBW: boolean;
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

    console.log(`✅ Работаем с кабинетом: ${cabinet.name || cabinet.id}`);

    // ============ ПРОВЕРКА КЕША ============
    const cacheKey = `analytics_dashboard_${cabinet.id}_${days}`;
    
    // 🔄 ОЧИСТКА КЕША: Если изменилась логика (days >= 7 теперь используем детализированный отчет)
    // Удаляем старый кеш для дней 7-29 чтобы пересчитать с новой логикой
    if (days >= 7 && days < 30) {
      console.log(`🔄 Очищаем кеш для дней ${days} (изменилась логика на детализированный отчет)`);
      await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.deleteMany({
          where: { cacheKey }
        }),
        'очистка кеша при изменении логики'
      );
    }
    
    if (!forceRefresh) {
      const cachedData = await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.findUnique({
          where: { cacheKey }
        }),
        'проверка кеша'
      );

      if (cachedData && cachedData.expiresAt > new Date()) {
        const cacheAge = Date.now() - cachedData.createdAt.getTime();
        const cacheAgeMinutes = Math.floor(cacheAge / 60000);
        
        console.log(`✅ Аналитика взята из кеша (возраст: ${cacheAgeMinutes} мин)`);
        
        return NextResponse.json({
          ...(cachedData.data as any),
          fromCache: true,
          cacheAge: cacheAgeMinutes,
          cacheExpiresIn: Math.floor((cachedData.expiresAt.getTime() - Date.now()) / 60000)
        });
      } else {
        console.log('⚠️ Кеш устарел или отсутствует, загружаем свежие данные...');
      }
    } else {
      console.log('🔄 Принудительное обновление данных (forceRefresh=true)');
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
    
    // Получаем остатки, заказы и товары (для всех периодов)
    const stocksData = await getWBStocks(cabinet.apiToken);
    console.log(`✅ Получено остатков: ${stocksData.length}`);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    
    const ordersData = await getWBOrders(cabinet.apiToken, startDate, endDate);
    console.log(`✅ Получено заказов: ${ordersData.length}`);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
    
    const productsData = await getWBProducts(cabinet.apiToken);
    console.log(`✅ Получено товаров: ${productsData.length}`);

    // Синхронизируем товары в БД для корректного расчета аналитики
    // БАТЧИНГ: обрабатываем по 10 товаров за раз чтобы не перегружать БД
    console.log('🔄 Синхронизация товаров в БД (батчами по 10)...');
    let syncedCount = 0;
    let skippedCount = 0;
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 500; // 500мс между батчами
    
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
    const analyticsResult = await buildAnalyticsDashboard(
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

    // ============ СОХРАНЕНИЕ В КЕШ ============
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

    try {
      const expiresAt = new Date(Date.now() + CACHE_CONFIG.CACHE_TTL);
      
      await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            data: responseData as any,
            expiresAt,
            createdAt: new Date()
          },
          update: {
            data: responseData as any,
            expiresAt,
            createdAt: new Date()
          }
        }),
        'сохранение аналитики в кеш'
      );
      
      console.log(`✅ Аналитика сохранена в кеш на ${CACHE_CONFIG.CACHE_TTL / 60000} минут`);
    } catch (cacheError) {
      console.warn('⚠️ Не удалось сохранить аналитику в кеш:', cacheError);
      // Продолжаем работу даже если кеширование не удалось
    }

    return NextResponse.json(responseData);

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
 */
async function getWBStocks(apiToken: string): Promise<any[]> {
  try {
    const dateFrom = new Date().toISOString().split('T')[0];
    const url = `https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=${dateFrom}`;
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Не удалось получить остатки: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.warn('⚠️ Ошибка получения остатков:', error);
    return [];
  }
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
  
  // ✅ Получаем KTR (коэффициент логистики) для всех складов
  console.log('📊 Получаем коэффициенты логистики (KTR) для складов...');
  const warehouseKtrMap = await WbTariffService.getWarehouseKtrMap(apiToken, false);
  console.log(`✅ Получены KTR для ${warehouseKtrMap?.size || 0} складов`);
  
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
    // Получаем габариты товаров для расчетной логистики
    const nmIds = [...new Set(detailedReport!.map(item => item.nmId))];
    console.log(`📦 Ищем габариты для ${nmIds.length} уникальных товаров:`, nmIds.slice(0, 5));
    
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
      console.log(`📦 Загружаем габариты из WB API для ${missingNmIds.length} недостающих товаров...`);
      const dimensionsFromWB = await getProductDimensionsFromWB(apiToken, missingNmIds);
      
      // Объединяем с данными из БД
      dimensionsFromWB.forEach((dims, nmId) => {
        productDimensionsMap.set(nmId, dims);
      });
      
      console.log(`📦 ИТОГО габаритов: ${productDimensionsMap.size} из ${nmIds.length} товаров`);
    }
    
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

  // Агрегация продаж по дням (используем finishedPrice - база продавца)
  const salesByDay = aggregateSalesByDay(salesData);
  console.log(`📊 salesByDay: ${salesByDay.length} дней, первый: ${salesByDay[0]?.date}, последний: ${salesByDay[salesByDay.length-1]?.date}`);
  
  if (salesByDay.length === 0 && salesData.length > 0) {
    console.warn('⚠️ График пустой (salesByDay.length = 0), но есть данные продаж (salesData.length = ' + salesData.length + ')');
    console.log('🔍 Первая продажа:', salesData[0]);
  } else if (salesByDay.length === 0) {
    console.warn('⚠️ График пустой - нет данных о продажах за выбранный период');
  }
  
  // Топ товары по выручке
  const productRevenue = new Map<number, { revenue: number; orders: number; title: string }>();
  
  console.log(`📦 Формирование товаров: useDetailedReport=${useDetailedReport}, salesData=${salesData?.length || 0}, detailedReport=${detailedReport?.length || 0}`);
  
  if (useDetailedReport) {
    // ✅ Из детализированного отчета: учитываем ВСЕ типы документов
    const allItems = detailedReport!.filter((item: any) => item.quantity > 0);
    console.log(`📦 Отфильтровано товаров из detailedReport: ${allItems.length}`);
    allItems.forEach((item: any) => {
      const nmId = item.nmId;
      const current = productRevenue.get(nmId) || { revenue: 0, orders: 0, title: item.subject || `Товар ${nmId}` };
      
      // Для возвратов и отмен вычитаем выручку
      const multiplier = (item.docTypeName?.includes('возврат') || item.docTypeName?.includes('Возврат') || 
                         item.docTypeName?.includes('отмен') || item.docTypeName?.includes('Отмен')) ? -1 : 1;
      
      current.revenue += (item.retailPriceWithDisc || item.retailPrice || 0) * multiplier;
      current.orders += item.quantity * multiplier;
      productRevenue.set(nmId, current);
    });
  } else {
    // Из старого API
    salesData.forEach((sale: any) => {
      const nmId = sale.nmId;
      const current = productRevenue.get(nmId) || { revenue: 0, orders: 0, title: sale.subject || `Товар ${nmId}` };
      current.revenue += sale.finishedPrice || 0;
      current.orders += 1;
      productRevenue.set(nmId, current);
    });
  }

  // Получаем названия товаров из БД для тех, у кого нет названия
  const productIdsForTitles = Array.from(productRevenue.keys());
  const productsFromDb = await safePrismaOperation(
    () => prismaAnalytics.product.findMany({
      where: {
        wbNmId: { in: productIdsForTitles.map(String) },
        userId: user.id
      },
      select: {
        wbNmId: true,
        name: true
      }
    }),
    'получение названий товаров из БД'
  );

  const productTitlesMap = new Map<number, string>();
  (productsFromDb || []).forEach((p: any) => {
    productTitlesMap.set(Number(p.wbNmId), p.name);
  });

  console.log(`📦 productRevenue размер: ${productRevenue.size}`);
  
  const topProducts = Array.from(productRevenue.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([nmID, data]) => ({
      nmID,
      title: data.title || productTitlesMap.get(nmID) || `Товар ${nmID}`,
      revenue: Math.round(data.revenue),
      orders: data.orders,
      image: generateWBImageUrl(nmID)
    }));

  // ✅ ВСЕ товары (для поиска)
  const allProducts = Array.from(productRevenue.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([nmID, data]) => {
      const imageUrl = generateWBImageUrl(nmID);
      return {
        nmID,
        title: data.title || productTitlesMap.get(nmID) || `Товар ${nmID}`,
        revenue: Math.round(data.revenue),
        orders: data.orders,
        image: imageUrl
      };
    });

  console.log(`✅ topProducts: ${topProducts.length}, allProducts: ${allProducts.length}`);
  console.log(`📊 Товары для отправки (первые 3):`, topProducts.slice(0, 3).map(p => ({
    nmID: p.nmID,
    title: p.title,
    image: p.image
  })));
  
  console.log(`📊 ПЕРЕД ВОЗВРАТОМ: salesByDay.length=${salesByDay.length}, первый день: ${salesByDay[0]?.date}`);

  // РЕАЛЬНЫЕ остатки из WB API с детализацией по FBW/FBS
  const totalStock = stocksData.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
  const inWayToClient = stocksData.reduce((sum, stock) => sum + (stock.inWayToClient || 0), 0);
  const inWayFromClient = stocksData.reduce((sum, stock) => sum + (stock.inWayFromClient || 0), 0);
  const reserved = stocksData.reduce((sum, stock) => sum + (stock.quantityFull || 0) - (stock.quantity || 0), 0);
  const lowStockProducts = stocksData.filter(s => (s.quantity || 0) < 5).length;
  
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
  
  // Определяем FBW и FBS остатки (FBW - склады WB, FBS - склады продавца)
  let fbwStock = 0;
  let fbsStock = 0;
  
  console.log('🏭 Анализ складов для определения FBW/FBS:');
  stocksByWarehouse.forEach((data, warehouse) => {
    // Склады WB обычно содержат "Коледино", "Подольск", "Электросталь" и т.д.
    // Также проверяем на наличие "WB" в названии
    const isFBW = warehouse.includes('Коледино') || warehouse.includes('Подольск') || 
                  warehouse.includes('Электросталь') || warehouse.includes('Казань') ||
                  warehouse.includes('Екатеринбург') || warehouse.includes('Новосибирск') ||
                  warehouse.includes('Санкт-Петербург') || warehouse.includes('Краснодар') ||
                  warehouse.toLowerCase().includes('wb') || warehouse.toLowerCase().includes('wildberries');
    
    if (isFBW) {
      fbwStock += data.quantity;
      console.log(`  ✅ FBW склад "${warehouse}": ${data.quantity} шт (в пути к клиенту: ${data.inWayToClient}, от клиента: ${data.inWayFromClient})`);
    } else {
      fbsStock += data.quantity;
      console.log(`  📦 FBS склад "${warehouse}": ${data.quantity} шт (в пути к клиенту: ${data.inWayToClient}, от клиента: ${data.inWayFromClient})`);
    }
  });
  
  // Реальная стоимость остатков на основе цен из продаж
  const priceMap = new Map<number, number>();
  salesData.forEach(sale => {
    if (sale.nmId && sale.finishedPrice) {
      priceMap.set(sale.nmId, sale.finishedPrice);
    }
  });
  
  const stockValue = stocksData.reduce((sum, stock) => {
    const price = priceMap.get(stock.nmId) || 1000; // Используем реальную цену или среднюю
    return sum + (stock.quantity || 0) * price;
  }, 0);
  
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

  // Топ поисковые запросы (извлекаем из названий товаров)
  const searchQueries = extractSearchQueries(salesData);

  // Производительность категорий
  const categoryPerformance = aggregateByCategory(salesData);

  // Период времени
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todaySales = salesData.filter(s => new Date(s.date) >= today).length;
  const weekSales = salesData.filter(s => new Date(s.date) >= weekAgo).length;
  const monthSales = salesData.filter(s => new Date(s.date) >= monthAgo).length;

  return {
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
        totalOtherDeductions: Math.round(totalOtherDeductions), // Штрафы, корректировки
        totalWbExpenses: Math.round(totalWbExpenses),
        totalCost: Math.round(totalCost),
        totalTaxes: Math.round(totalTaxes),
        totalAdvertising: Math.round(totalAdvertising)
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
      salesByDay
    },
    inventory: {
      totalProducts: productsData.length,
      totalStock,
      lowStockProducts,
      inTransit: inWayToClient,
      inReturn: inWayFromClient,
      reserved,
      stockValue: Math.round(stockValue),
      fbwStock,
      fbsStock,
      warehouseDetails: Array.from(stocksByWarehouse.entries()).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        inWayToClient: data.inWayToClient,
        inWayFromClient: data.inWayFromClient,
        isFBW: name.includes('Коледино') || name.includes('Подольск') || 
               name.includes('Электросталь') || name.includes('Казань') ||
               name.includes('Екатеринбург') || name.includes('Новосибирск') ||
               name.includes('Белая Дача') || name.includes('Тула') ||
               name.includes('Санкт-Петербург') || name.includes('Краснодар')
      })).sort((a, b) => b.quantity - a.quantity)
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
}

/**
 * Агрегация продаж по дням
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
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Последние 30 дней
}

/**
 * Извлечение поисковых запросов из данных
 */
function extractSearchQueries(salesData: any[]): Array<{ query: string; frequency: number; orders: number; revenue: number }> {
  const queries = new Map<string, { frequency: number; orders: number; revenue: number }>();
  
  salesData.forEach(sale => {
    if (sale.subject) {
      const words = sale.subject.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      words.forEach((word: string) => {
        const current = queries.get(word) || { frequency: 0, orders: 0, revenue: 0 };
        current.frequency += 1;
        current.orders += 1;
        current.revenue += sale.finishedPrice || 0;
        queries.set(word, current);
      });
    }
  });

  return Array.from(queries.entries())
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, 10)
    .map(([query, data]) => ({
      query,
      frequency: data.frequency,
      orders: data.orders,
      revenue: Math.round(data.revenue)
    }));
}

/**
 * Агрегация по категориям
 */
function aggregateByCategory(salesData: any[]): Array<{ category: string; revenue: number; orders: number; avgPrice: number }> {
  const categories = new Map<string, { revenue: number; orders: number }>();
  
  salesData.forEach(sale => {
    const category = sale.category || sale.subject || 'Без категории';
    const current = categories.get(category) || { revenue: 0, orders: 0 };
    current.revenue += sale.finishedPrice || 0;
    current.orders += 1;
    categories.set(category, current);
  });

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
 * Используем публичный CDN Wildberries для избежания CORS ошибок
 */
function generateWBImageUrl(nmID: number): string {
  const vol = Math.floor(nmID / 100000);
  const part = Math.floor(nmID / 1000);
  
  // Используем публичный CDN вместо basket (избегаем CORS)
  // Формат: https://images.wbstatic.net/big/new/{первые 4 цифры артикула}0000/{артикул}-1.jpg
  // Или используем tm вместо basket для публичного доступа
  return `https://images.wbstatic.net/big/new/${Math.floor(nmID / 10000)}0000/${nmID}-1.jpg`;
}
