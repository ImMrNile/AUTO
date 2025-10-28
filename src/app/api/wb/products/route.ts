// Правильная система загрузки товаров WB на основе официальной документации
// https://dev.wildberries.ru/en/openapi/work-with-products

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../lib/config/wbApiConfig';

// Rate limits согласно документации
const RATE_LIMIT = {
  DELAY_BETWEEN_REQUESTS: 200, // 200ms между запросами
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

// Задержка
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// ОСНОВНЫЕ ENDPOINTS
// ============================================================================

/**
 * GET /api/wb/products?source=db - Загрузка из БД
 * POST /api/wb/products - Загрузка с WB и синхронизация
 */

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'db';

    if (source === 'db') {
      return await getProductsFromDB(user.id);
    } else {
      return await getProductsFromWB(user.id, true);
    }
  } catch (error) {
    console.error('❌ Ошибка в GET /api/wb/products:', error);
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'get-products', syncToDb = true } = body;

    if (action === 'get-products' || action === 'sync-products') {
      return await getProductsFromWB(user.id, syncToDb);
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error) {
    console.error('❌ Ошибка в POST /api/wb/products:', error);
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// ============================================================================
// ЗАГРУЗКА ИЗ БД
// ============================================================================

async function getProductsFromDB(userId: string) {
  console.log('📦 Загрузка товаров из БД для пользователя:', userId);

  try {
    console.log('🔍 Начинаем запрос к БД (БЕЗ сортировки)...');
    
    // ОПТИМИЗАЦИЯ: Убираем сортировку - она занимала 31 секунду
    const products = await safePrismaOperation(
      () => prisma.product.findMany({
        where: {
          userId: userId,
          wbNmId: {
            not: null // ТОЛЬКО товары с WB (исключаем тестовые)
          }
        },
        select: {
          id: true,
          wbNmId: true,
          name: true,
          vendorCode: true,
          price: true,
          stock: true,
          status: true,
          updatedAt: true,
          generatedName: true,
          seoDescription: true,
          brand: true,
          discountPrice: true,
          discount: true,
          costPrice: true,
          reserved: true,
          inTransit: true,
          inReturn: true,
          createdAt: true,
          wbData: true, // JSON с фотками и категорией
        }
        // Убрали лимит - загружаем ВСЕ товары
      }),
      'получение товаров из БД'
    );
    
    // Сортируем на уровне приложения (быстро для сотен записей)
    products.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    console.log(`✅ Загружено ${products.length} товаров из БД (без лимита)`);

    // АВТОСИНХРОНИЗАЦИЯ: Если товаров нет, предлагаем синхронизацию
    const needsSync = products.length === 0;

    return NextResponse.json({
      success: true,
      products: products,
      total: products.length,
      source: 'database',
      needsSync, // Флаг для фронтенда
      syncMessage: needsSync ? 
        (products.length === 0 ? 
          'Товары не найдены. Нажмите "Обновить" для загрузки с Wildberries.' : 
          'Данные устарели. Рекомендуем обновить.') : 
        null
    });
  } catch (error) {
    console.error('❌ Ошибка при загрузке товаров из БД:', error);
    return NextResponse.json({
      error: 'Ошибка загрузки товаров из базы данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// ============================================================================
// ЗАГРУЗКА С WB
// ============================================================================

async function getProductsFromWB(userId: string, syncToDb: boolean) {
  console.log('📦 Загрузка товаров с Wildberries для пользователя:', userId);

  const cabinet = await getActiveCabinet(userId);
  if (!cabinet) {
    console.error('❌ Нет активного кабинета для пользователя');
    return NextResponse.json({
      error: 'Не найден активный кабинет',
      details: 'Добавьте кабинет Wildberries в настройках аккаунта'
    }, { status: 400 });
  }
  
  if (!cabinet.apiToken) {
    console.error('❌ У кабинета нет API токена');
    return NextResponse.json({
      error: 'Не указан API токен',
      details: 'Добавьте API токен в настройках кабинета'
    }, { status: 400 });
  }
  
  console.log('✅ Кабинет найден:', cabinet.name);

  try {
    // ШАГ 1: Получаем карточки товаров
    console.log('📋 Шаг 1/3: Получение карточек товаров...');
    const cards = await fetchProductCards(cabinet.apiToken);
    console.log(`✅ Получено ${cards.length} карточек товаров`);

    if (cards.length === 0) {
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
        message: 'У вас нет товаров'
      });
    }

    await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);

    // ШАГ 2: Получаем цены товаров
    console.log('💰 Шаг 2/4: Получение цен товаров...');
    const prices = await fetchProductPrices(cabinet.apiToken);
    console.log(`✅ Получено цен для ${prices.length} товаров`);

    await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);

    // ШАГ 3: Получаем остатки товаров
    console.log('📦 Шаг 3/4: Получение остатков товаров...');
    const stocks = await fetchProductStocks(cabinet.apiToken);
    console.log(`✅ Получено остатков для ${stocks.length} товаров`);

    await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);

    // ШАГ 4: Обрабатываем карточки товаров с ценами и остатками
    console.log('🔄 Шаг 4/4: Обработка данных товаров...');
    const enrichedProducts = processProductCards(cards, prices, stocks);
    console.log(`✅ Обработано ${enrichedProducts.length} товаров`);

    // Синхронизация с БД
    if (syncToDb) {
      console.log('💾 Синхронизация с базой данных...');
      const syncResult = await syncProductsToDB(enrichedProducts, userId);
      console.log('✅ Синхронизация завершена');
      
      return NextResponse.json({
        success: true,
        products: enrichedProducts,
        total: enrichedProducts.length,
        synced: true,
        syncResult: syncResult,
        message: `Синхронизировано ${syncResult.synced} товаров из ${enrichedProducts.length}`
      });
    }

    return NextResponse.json({
      success: true,
      products: enrichedProducts,
      total: enrichedProducts.length,
      synced: false
    });

  } catch (error) {
    console.error('❌ Ошибка загрузки товаров с WB:', error);
    throw error;
  }
}

// ============================================================================
// API ФУНКЦИИ
// ============================================================================

/**
 * Получение цен товаров с WB
 * Endpoint: GET /api/v2/list/goods/filter
 * Документация: https://dev.wildberries.ru/en/openapi/work-with-products#tag/Prices-and-Discounts
 */
async function fetchProductPrices(apiToken: string, limit = 1000, offset = 0): Promise<any[]> {
  try {
    const response = await fetchWithRetry(
      `${WB_API_CONFIG.BASE_URLS.PRICES}/api/v2/list/goods/filter?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Ошибка API цен WB:', data.errorText);
      return [];
    }
    
    return data.data?.listGoods || [];
  } catch (error) {
    console.error('❌ Ошибка получения цен:', error);
    return [];
  }
}

/**
 * Получение остатков товаров с WB
 * Endpoint: GET /api/v3/stocks/{warehouseId}
 * Документация: https://dev.wildberries.ru/en/openapi/work-with-products#tag/Inventory
 */
async function fetchProductStocks(apiToken: string): Promise<any[]> {
  try {
    // Сначала получаем список складов
    const warehousesResponse = await fetchWithRetry(
      `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/warehouses`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        }
      }
    );

    const warehousesData = await warehousesResponse.json();
    
    if (!warehousesData || warehousesData.length === 0) {
      console.log('⚠️ Нет складов для получения остатков');
      return [];
    }

    // Получаем остатки со всех складов
    const allStocks: any[] = [];
    
    for (const warehouse of warehousesData) {
      try {
        // Используем обычный fetch без retry для складов (некоторые склады могут быть недоступны)
        const stocksResponse = await fetch(
          `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${warehouse.id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ skus: [] }) // Пустой массив = все товары
          }
        );

        if (!stocksResponse.ok) {
          console.warn(`⚠️ Склад ${warehouse.id} (${warehouse.name}) недоступен: ${stocksResponse.status}`);
          continue; // Пропускаем этот склад и продолжаем
        }

        const stocksData = await stocksResponse.json();
        
        if (stocksData.stocks && Array.isArray(stocksData.stocks)) {
          allStocks.push(...stocksData.stocks);
          console.log(`✅ Получено ${stocksData.stocks.length} позиций со склада ${warehouse.name}`);
        }
        
        await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
      } catch (error) {
        console.warn(`⚠️ Пропускаем склад ${warehouse.id}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        // Продолжаем работу с другими складами
      }
    }

    console.log(`📊 Всего получено ${allStocks.length} записей остатков с ${warehousesData.length} складов`);

    // Группируем остатки по nmID
    const stocksByNmId = new Map();
    allStocks.forEach(stock => {
      const nmId = stock.nmId;
      if (!stocksByNmId.has(nmId)) {
        stocksByNmId.set(nmId, {
          nmId: nmId,
          stock: 0,
          reserved: 0
        });
      }
      const current = stocksByNmId.get(nmId);
      current.stock += stock.amount || 0;
      current.reserved += stock.reservedAmount || 0;
    });

    const result = Array.from(stocksByNmId.values());
    console.log(`✅ Сгруппировано остатков для ${result.length} уникальных товаров`);
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения остатков:', error);
    return [];
  }
}

/**
 * Получение карточек товаров
 * Endpoint: POST /content/v2/get/cards/list
 * Документация: https://dev.wildberries.ru/en/openapi/work-with-products#tag/Product-Management/paths/~1content~1v2~1get~1cards~1list/post
 */
async function fetchProductCards(apiToken: string): Promise<any[]> {
  const allCards: any[] = [];
  let hasMore = true;
  let cursor: any = {
    limit: 100
  };
  let pageCount = 0;
  const MAX_PAGES = 50; // Защита от бесконечного цикла (макс 5000 товаров)

  console.log('📋 Начинаем загрузку карточек товаров с пагинацией...');

  while (hasMore && pageCount < MAX_PAGES) {
    pageCount++;
    console.log(`📄 Страница ${pageCount}: запрос карточек...`);
    
    try {
      const response = await fetchWithRetry(
        `${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/get/cards/list`,
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            settings: {
              cursor: cursor,
              filter: {
                withPhoto: -1 // Все товары (с фото и без)
              }
            }
          })
        }
      );

      const data = await response.json();
      
      if (data.cards && Array.isArray(data.cards)) {
        const newCards = data.cards.length;
        allCards.push(...data.cards);
        console.log(`📦 Загружено ${newCards} карточек, всего: ${allCards.length}`);
        
        // Проверяем, есть ли еще товары
        // Если получили меньше чем limit, значит это последняя страница
        if (newCards >= 100 && data.cursor) {
          // Есть еще товары, продолжаем
          cursor = {
            limit: 100,
            updatedAt: data.cursor.updatedAt,
            nmID: data.cursor.nmID
          };
          console.log(`➡️ Переход к следующей странице (cursor: nmID=${cursor.nmID})`);
          await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
        } else {
          // Это последняя страница
          console.log(`✅ Загрузка завершена: получено ${allCards.length} карточек`);
          hasMore = false;
        }
      } else {
        console.log('⚠️ Нет карточек в ответе API');
        hasMore = false;
      }
    } catch (error) {
      console.error('❌ Ошибка получения карточек:', error);
      hasMore = false;
    }
  }

  return allCards;
}

/**
 * Обработка карточек товаров с ценами и остатками из API
 * Объединяем данные карточек с актуальными ценами и остатками
 */
function processProductCards(cards: any[], pricesData: any[], stocksData: any[]): any[] {
  console.log(`🔄 Обработка ${cards.length} карточек товаров с ценами и остатками...`);
  
  // Создаем мапу цен по nmID для быстрого поиска
  const pricesMap = new Map();
  pricesData.forEach(priceItem => {
    pricesMap.set(priceItem.nmID, priceItem);
  });
  
  // Создаем мапу остатков по nmID
  const stocksMap = new Map();
  stocksData.forEach(stockItem => {
    stocksMap.set(stockItem.nmId, stockItem);
  });
  
  return cards.map(card => {
    // Получаем цены из API цен
    const priceData = pricesMap.get(card.nmID);
    const stockData = stocksMap.get(card.nmID);
    
    let price = 0;
    let discountPrice = 0;
    let discount = 0;
    let clubDiscount = 0;
    let clubDiscountedPrice = 0;
    let stock = 0;
    let reserved = 0;

    if (priceData) {
      // Используем данные из API цен (самые актуальные)
      if (priceData.sizes && priceData.sizes.length > 0) {
        const firstSize = priceData.sizes[0];
        price = firstSize.price || 0;
        discountPrice = firstSize.discountedPrice || 0;
        clubDiscountedPrice = firstSize.clubDiscountedPrice || 0;
        
        // Если discountPrice = 0, используем price
        if (discountPrice === 0 && price > 0) {
          discountPrice = price;
        }
      }
      
      // Скидки из API
      discount = priceData.discount || 0;
      clubDiscount = priceData.clubDiscount || 0;
    } else {
      // Fallback: пытаемся получить цену из карточки
      if (card.sizes && card.sizes.length > 0) {
        const firstSize = card.sizes[0];
        price = firstSize.price || firstSize.priceU || 0;
        discountPrice = firstSize.discountedPrice || firstSize.discountPriceU || 0;
        
        // Если discountPrice = 0, используем price
        if (discountPrice === 0 && price > 0) {
          discountPrice = price;
        }
      }
      
      // Рассчитываем скидку
      if (price > 0 && discountPrice > 0 && discountPrice < price) {
        discount = Math.round(((price - discountPrice) / price) * 100);
      }
    }

    // Получаем остатки из API остатков
    if (stockData) {
      stock = stockData.stock || 0;
      reserved = stockData.reserved || 0;
    }
    
    // Логируем данные товара
    console.log(`📊 Товар ${card.nmID}: цена=${price}₽, скидка=${discountPrice}₽ (-${discount}%), остаток=${stock}, резерв=${reserved}`);

    // Себестоимость (60% от цены - настраивается)
    const costPrice = Math.floor(price * 0.6);

    // Логируем товары без цен
    if (price === 0) {
      console.log(`⚠️ Товар ${card.nmID} (${card.vendorCode}): цена = 0 (возможно не опубликован)`);
    }

    return {
      // Основные данные
      nmID: card.nmID,
      imtID: card.imtID,
      vendorCode: card.vendorCode,
      brand: card.brand || 'Не указан',
      title: card.title,
      description: card.description || '',
      category: card.subjectName || '',
      
      // Цены (из API цен WB)
      price: price,
      discountPrice: discountPrice,
      discount: discount,
      clubDiscount: clubDiscount,
      clubDiscountedPrice: clubDiscountedPrice,
      costPrice: costPrice,
      
      // Остатки
      stock: stock,
      reserved: reserved,
      inTransit: 0,
      inReturn: 0,
      
      // Изображения
      images: card.photos?.map((p: any) => p.big || p.c516x688) || [],
      
      // Характеристики
      characteristics: card.characteristics || [],
      
      // Размеры
      sizes: card.sizes?.map((s: any) => ({
        chrtID: s.chrtID,
        techSize: s.techSize,
        skus: s.skus || [],
        price: s.price || s.priceU || 0,
        discountPrice: s.discountedPrice || s.discountPriceU || 0
      })) || [],
      
      // Метаданные
      createdAt: card.createdAt,
      updatedAt: card.updatedAt
    };
  });
}

/**
 * Синхронизация товаров с БД
 */
async function syncProductsToDB(products: any[], userId: string) {
  console.log(`💾 Начинаем синхронизацию ${products.length} товаров в БД...`);
  let synced = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const uniqueId = `wb_${product.nmID}_${userId}`;
      console.log(`💾 Синхронизация товара: ${product.nmID} - ${product.title}`);
      
      // Проверяем, существует ли товар и есть ли у него себестоимость
      const existingProduct = await safePrismaOperation(
        () => prisma.product.findUnique({
          where: { id: uniqueId },
          select: { costPrice: true }
        })
      );
      
      // Если товар существует и у него есть себестоимость - сохраняем её
      const costPriceToUse = existingProduct?.costPrice ?? product.costPrice;
      
      if (existingProduct?.costPrice) {
        console.log(`💰 Сохраняем существующую себестоимость: ${existingProduct.costPrice}₽`);
      }
      
      await safePrismaOperation(
        () => prisma.product.upsert({
          where: { id: uniqueId },
          update: {
            name: product.title,
            generatedName: product.title,
            price: product.price,
            wbNmId: product.nmID?.toString(), // Сохраняем nmID в отдельное поле
            wbImtId: product.imtID?.toString(),
            vendorCode: product.vendorCode,
            brand: product.brand,
            seoDescription: product.description,
            discountPrice: product.discountPrice,
            discount: product.discount,
            costPrice: costPriceToUse, // Используем сохраненную себестоимость
            stock: product.stock,
            reserved: product.reserved,
            inTransit: product.inTransit,
            inReturn: product.inReturn,
            wbData: {
              nmID: product.nmID,
              imtID: product.imtID,
              vendorCode: product.vendorCode,
              brand: product.brand,
              category: product.category,
              description: product.description,
              
              price: product.price,
              discountPrice: product.discountPrice,
              discount: product.discount,
              clubDiscount: product.clubDiscount,
              clubDiscountedPrice: product.clubDiscountedPrice,
              costPrice: product.costPrice,
              
              stock: product.stock,
              reserved: product.reserved,
              inTransit: product.inTransit,
              inReturn: product.inReturn,
              
              images: product.images,
              characteristics: product.characteristics,
              sizes: product.sizes,
              
              lastSync: new Date().toISOString()
            },
            updatedAt: new Date()
          },
          create: {
            id: uniqueId,
            userId: userId,
            name: product.title,
            generatedName: product.title,
            price: product.price,
            status: 'PUBLISHED',
            wbNmId: product.nmID?.toString(), // Сохраняем nmID в отдельное поле
            wbImtId: product.imtID?.toString(),
            vendorCode: product.vendorCode,
            brand: product.brand,
            seoDescription: product.description,
            discountPrice: product.discountPrice,
            discount: product.discount,
            costPrice: product.costPrice,
            stock: product.stock,
            reserved: product.reserved,
            inTransit: product.inTransit,
            inReturn: product.inReturn,
            wbData: {
              nmID: product.nmID,
              imtID: product.imtID,
              vendorCode: product.vendorCode,
              brand: product.brand,
              category: product.category,
              description: product.description,
              
              price: product.price,
              discountPrice: product.discountPrice,
              discount: product.discount,
              clubDiscount: product.clubDiscount,
              clubDiscountedPrice: product.clubDiscountedPrice,
              costPrice: product.costPrice,
              
              stock: product.stock,
              reserved: product.reserved,
              inTransit: product.inTransit,
              inReturn: product.inReturn,
              
              images: product.images,
              characteristics: product.characteristics,
              sizes: product.sizes,
              
              lastSync: new Date().toISOString()
            }
          }
        }),
        `синхронизация товара ${product.nmID}`
      );

      synced++;
      await delay(50); // Небольшая задержка между записями

    } catch (error) {
      console.error(`❌ Ошибка синхронизации товара ${product.nmID}:`, error);
      errors++;
    }
  }

  console.log(`✅ Синхронизировано: ${synced}, ошибок: ${errors}`);
  
  return {
    synced,
    errors,
    total: products.length
  };
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

async function getActiveCabinet(userId: string) {
  const cabinets = await safePrismaOperation(
    () => prisma.cabinet.findMany({
      where: {
        userId: userId,
        isActive: true,
        apiToken: { not: null }
      }
    }),
    'получение активного кабинета'
  );

  return cabinets && cabinets.length > 0 ? cabinets[0] : null;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = RATE_LIMIT.MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        console.log(`⚠️ Rate limit, ожидание ${RATE_LIMIT.RETRY_DELAY}ms...`);
        await delay(RATE_LIMIT.RETRY_DELAY);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;

    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      console.log(`⚠️ Попытка ${attempt + 1} не удалась, повтор через ${RATE_LIMIT.RETRY_DELAY}ms...`);
      await delay(RATE_LIMIT.RETRY_DELAY);
    }
  }

  throw new Error('Превышено количество попыток запроса');
}
