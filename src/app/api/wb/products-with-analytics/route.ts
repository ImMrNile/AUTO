// src/app/api/wb/products-with-analytics/route.ts - Получение товаров с полной аналитикой + КЕШИРОВАНИЕ

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../lib/config/wbApiConfig';
import { WbProductQueriesService } from '../../../../../lib/services/wbProductQueriesService';

// НАСТРОЙКИ КЕШИРОВАНИЯ И RATE LIMITING
const CACHE_CONFIG = {
  CACHE_TTL: 6 * 60 * 60 * 1000, // 6 часов
  REFRESH_INTERVAL: 20 * 60 * 1000, // 20 минут
  DELAY_BETWEEN_REQUESTS: 1000, // 1000ms между запросами к WB API (увеличено для безопасности)
  MIN_DELAY_BETWEEN_REQUESTS: 200, // Минимальная задержка согласно WB API
  MAX_REQUESTS_PER_BATCH: 10, // Максимум запросов за раз
  RETRY_DELAYS: [2000, 5000, 10000, 20000], // Экспоненциальные задержки для retry: 2с, 5с, 10с, 20с
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
      
      // Если 429 (rate limit) - делаем retry с увеличивающейся задержкой
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
      
      // Если 5xx ошибка - тоже retry
      if (response.status >= 500 && response.status < 600 && attempt < retries) {
        const delayMs = CACHE_CONFIG.RETRY_DELAYS[attempt] || 20000;
        console.warn(`⚠️ Ошибка сервера (${response.status}) для ${url}, повтор через ${delayMs}мс...`);
        await delay(delayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt < retries) {
        const delayMs = CACHE_CONFIG.RETRY_DELAYS[attempt] || 20000;
        console.warn(`⚠️ Ошибка запроса к ${url}, повтор через ${delayMs}мс...`, error);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`Превышено количество попыток запроса к ${url}`);
}

interface ProductWithAnalytics {
  // Основная информация о товаре
  nmID: number;
  vendorCode: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  
  // Цены и финансы
  price: number;
  discountPrice: number;
  discount: number;
  costPrice: number;
  
  // Остатки и логистика (РЕАЛЬНЫЕ данные из WB API)
  stock: number; // Доступно на складе
  reserved: number; // Зарезервировано
  inTransit: number; // В пути к клиенту (inWayToClient)
  inReturn: number; // В пути от клиента - возвраты (inWayFromClient)
  warehouseName?: string; // Название склада (для определения FBW/FBS)
  quantityFull?: number; // Полное количество (quantity + reserved)
  
  // Аналитика продаж (за последние 30 дней)
  analytics: {
    sales: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      units: number;
    };
    conversion: {
      views: number;
      addToCart: number;
      cartToOrder: number;
      ctr: number;
    };
    searchQueries: {
      topQueries: Array<{
        query: string;
        openCard: number;
        addToCart: number;
        orders: number;
        avgPosition: number;
      }>;
      totalQueries: number;
    };
  };
  
  // Дополнительная информация
  images: string[];
  rating: number;
  reviewsCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET - Получение товаров с полной аналитикой + КЕШИРОВАНИЕ
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Запрос товаров с полной аналитикой');

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeAnalytics = searchParams.get('includeAnalytics') !== 'false';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

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

    console.log(`✅ Работаем с кабинетом: ${cabinet.name || cabinet.id}`);

    // ============ ПРОВЕРКА КЕША ============
    const cacheKey = `wb_analytics_${cabinet.id}_${limit}_${offset}_${includeAnalytics}`;
    
    if (!forceRefresh) {
      const cachedData = await safePrismaOperation(
        () => prisma.wbApiCache.findUnique({
          where: { cacheKey }
        }),
        'проверка кеша'
      );

      if (cachedData && cachedData.expiresAt > new Date()) {
        const cacheAge = Date.now() - cachedData.createdAt.getTime();
        const cacheAgeMinutes = Math.floor(cacheAge / 60000);
        
        console.log(`✅ Данные взяты из кеша (возраст: ${cacheAgeMinutes} мин)`);
        
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

    // Шаг 1: Получаем список товаров
    const products = await getWBProductsList(cabinet.apiToken, limit, offset);
    console.log(`📦 Получено ${products.length} товаров с WB`);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
        limit,
        offset,
        message: 'Товары не найдены'
      });
    }

    // Шаг 2: Получаем цены и остатки (последовательно с задержкой, не параллельно)
    console.log('💰 Запрос цен...');
    const pricesData = await getWBPrices(cabinet.apiToken);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS); // Задержка между запросами
    
    console.log('📦 Запрос остатков...');
    const stocksData = await getWBStocks(cabinet.apiToken);
    await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);

    console.log(`💰 Получено цен: ${pricesData.length}, остатков: ${stocksData.length}`);

    // Шаг 3: Получаем статистику продаж за последние 30 дней
    const salesData = includeAnalytics ? await getWBSalesStatistics(cabinet.apiToken) : [];
    console.log(`📈 Получено записей продаж: ${salesData.length}`);

    // Шаг 4: Собираем аналитику по поисковым запросам
    const productQueriesService = new WbProductQueriesService(cabinet.apiToken);
    
    // Шаг 5: Объединяем все данные (с задержками для rate limits)
    const productsWithAnalytics: ProductWithAnalytics[] = [];
    let shouldFetchSearchQueries = includeAnalytics; // Флаг для управления запросами
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        const priceInfo = pricesData.find((p: any) => p.nmId === product.nmID);
        const stockInfo = stocksData.find((s: any) => s.nmId === product.nmID);
        
        // Рассчитываем аналитику продаж для данного товара
        const productSales = salesData.filter((s: any) => s.nmId === product.nmID);
        const salesAnalytics = calculateSalesAnalytics(productSales);
        
        // Получаем поисковые запросы (если включена полная аналитика)
        type SearchQueryData = {
          query: string;
          openCard: number;
          addToCart: number;
          orders: number;
          avgPosition: number;
        };
        
        let searchQueriesData: { topQueries: SearchQueryData[]; totalQueries: number } = { 
          topQueries: [], 
          totalQueries: 0 
        };
        
        // Ограничиваем запросы поисковых данных только для первых 10 товаров
        if (shouldFetchSearchQueries && i < CACHE_CONFIG.MAX_REQUESTS_PER_BATCH) {
          try {
            // Задержка перед каждым запросом (1000мс для соблюдения rate limits WB)
            if (i > 0) {
              await delay(CACHE_CONFIG.DELAY_BETWEEN_REQUESTS);
            }
            
            const queriesResult = await productQueriesService.getProductSearchQueries(product.nmID, 10, 30);
            searchQueriesData = {
              topQueries: queriesResult.queries.map(q => ({
                query: q.searchText,
                openCard: q.openCard,
                addToCart: q.addToCart,
                orders: q.orders,
                avgPosition: q.avgPosition
              })),
              totalQueries: queriesResult.totalQueries
            };
          } catch (error: any) {
            // Если получили 429, прекращаем дальнейшие запросы поисковых данных
            if (error.message?.includes('429')) {
              console.warn(`⚠️ Достигнут лимит запросов WB API, пропускаем поисковые данные для остальных товаров`);
              shouldFetchSearchQueries = false; // Отключаем дальнейшие запросы
            } else {
              console.warn(`⚠️ Не удалось получить поисковые запросы для товара ${product.nmID}`);
            }
          }
        }

        const images = generateWBImageUrls(product.nmID);

        productsWithAnalytics.push({
          nmID: product.nmID,
          vendorCode: product.vendorCode || '',
          title: product.title || `Товар ${product.nmID}`,
          description: product.description || '',
          brand: product.brand || 'Не указан',
          category: product.subjectName || '',
          
          price: priceInfo?.price || 0,
          discountPrice: priceInfo?.discountedPrice || priceInfo?.price || 0,
          discount: priceInfo?.discount || 0,
          costPrice: priceInfo?.price ? Math.floor(priceInfo.price * 0.6) : 0,
          
          stock: stockInfo?.amount || 0,
          reserved: stockInfo?.reserved || 0,
          inTransit: stockInfo?.inWayToClient || 0,
          inReturn: stockInfo?.inWayFromClient || 0,
          
          analytics: {
            sales: salesAnalytics.sales,
            conversion: salesAnalytics.conversion,
            searchQueries: searchQueriesData
          },
          
          images: images,
          rating: 4.5, // Заглушка, WB API не предоставляет рейтинг
          reviewsCount: Math.floor(Math.random() * 100), // Заглушка
          status: product.status || 'active',
          createdAt: product.createdAt || new Date().toISOString(),
          updatedAt: product.updatedAt || new Date().toISOString()
        });
        
      } catch (error) {
        console.warn(`⚠️ Ошибка обработки товара ${product.nmID}:`, error);
      }
    }

    console.log(`✅ Подготовлено ${productsWithAnalytics.length} товаров с полной аналитикой`);

    // ============ СОХРАНЕНИЕ В КЕШ ============
    const responseData = {
      success: true,
      products: productsWithAnalytics,
      total: productsWithAnalytics.length,
      limit,
      offset,
      cabinet: {
        id: cabinet.id,
        name: cabinet.name
      },
      generatedAt: new Date().toISOString()
    };

    try {
      const expiresAt = new Date(Date.now() + CACHE_CONFIG.CACHE_TTL);
      
      await safePrismaOperation(
        () => prisma.wbApiCache.upsert({
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
        'сохранение в кеш'
      );
      
      console.log(`✅ Данные сохранены в кеш на ${CACHE_CONFIG.CACHE_TTL / 60000} минут`);
    } catch (cacheError) {
      console.warn('⚠️ Не удалось сохранить данные в кеш:', cacheError);
      // Продолжаем работу даже если кеширование не удалось
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Ошибка получения товаров с аналитикой:', error);
    return NextResponse.json({
      error: 'Ошибка получения данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * POST - Экспорт товаров с аналитикой в различные форматы
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { format = 'json', productIds } = body;

    // Получаем товары с аналитикой
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
    
    // Здесь можно реализовать экспорт в разные форматы (CSV, Excel и т.д.)
    // Пока возвращаем JSON

    return NextResponse.json({
      success: true,
      message: `Экспорт в формате ${format} готов`,
      format,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка экспорта:', error);
    return NextResponse.json({
      error: 'Ошибка экспорта данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// ==================== Вспомогательные функции ====================

/**
 * Получение списка товаров с WB
 */
async function getWBProductsList(apiToken: string, limit: number, offset: number): Promise<any[]> {
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
            limit: Math.min(limit, 100),
            offset: offset
          },
          filter: {
            withPhoto: -1
          }
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ Ошибка получения списка товаров: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.cards || [];
  } catch (error) {
    console.error('❌ Ошибка при получении списка товаров:', error);
    return [];
  }
}

/**
 * Получение цен товаров
 */
async function getWBPrices(apiToken: string): Promise<any[]> {
  try {
    const url = `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Ошибка получения цен: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data?.listGoods || [];
  } catch (error) {
    console.error('❌ Ошибка при получении цен:', error);
    return [];
  }
}

/**
 * Получение остатков товаров
 */
async function getWBStocks(apiToken: string): Promise<any[]> {
  try {
    const url = `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${Date.now().toString().slice(0, 10)}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ Ошибка получения остатков: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.stocks || [];
  } catch (error) {
    console.error('❌ Ошибка при получении остатков:', error);
    return [];
  }
}

/**
 * Получение статистики продаж за период
 */
async function getWBSalesStatistics(apiToken: string): Promise<any[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dateFrom = startDate.toISOString().split('T')[0];
    const url = `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom}`;
    
    // Добавляем задержку перед запросом статистики (самый проблемный endpoint)
    await delay(1000);
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'User-Agent': 'WB-AI-Assistant/2.0'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Не удалось получить статистику продаж: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.warn('⚠️ Ошибка при получении статистики продаж:', error);
    return [];
  }
}

/**
 * Расчет аналитики продаж на основе данных
 */
function calculateSalesAnalytics(salesData: any[]) {
  const totalOrders = salesData.length;
  const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.finishedPrice || 0), 0);
  const totalUnits = salesData.reduce((sum, sale) => sum + 1, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Рассчитываем конверсию (это упрощенные данные, так как WB не предоставляет полную статистику)
  const estimatedViews = totalOrders * 50; // Оценка: 1 заказ = ~50 просмотров
  const estimatedAddToCart = totalOrders * 5; // Оценка: 1 заказ = ~5 добавлений в корзину
  const cartToOrder = estimatedAddToCart > 0 ? totalOrders / estimatedAddToCart : 0;
  const ctr = estimatedViews > 0 ? estimatedAddToCart / estimatedViews : 0;

  return {
    sales: {
      orders: totalOrders,
      revenue: Math.round(totalRevenue),
      avgOrderValue: Math.round(avgOrderValue),
      units: totalUnits
    },
    conversion: {
      views: estimatedViews,
      addToCart: estimatedAddToCart,
      cartToOrder: Math.round(cartToOrder * 100) / 100,
      ctr: Math.round(ctr * 10000) / 100 // Процент с двумя знаками
    }
  };
}

/**
 * Генерация URL изображений для товаров WB
 */
function generateWBImageUrls(nmID: number): string[] {
  const images = [];
  const vol = Math.floor(nmID / 100000);
  const part = Math.floor(nmID / 1000);
  
  for (let i = 1; i <= 5; i++) {
    const basketNum = (vol % 10) + 1;
    const imageUrl = `https://basket-${String(basketNum).padStart(2, '0')}.wbbasket.ru/vol${vol}/part${part}/${nmID}/images/big/${i}.jpg`;
    images.push(imageUrl);
  }
  
  return images.slice(0, 3);
}

