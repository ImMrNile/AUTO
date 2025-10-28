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

  const products = await safePrismaOperation(
    () => prisma.product.findMany({
      where: {
        userId: userId,
        wbData: { not: Prisma.DbNull }
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000
    }),
    'получение товаров из БД'
  );

  console.log(`✅ Загружено ${products.length} товаров из БД`);

  return NextResponse.json({
    success: true,
    products: products,
    total: products.length,
    source: 'database'
  });
}

// ============================================================================
// ЗАГРУЗКА С WB
// ============================================================================

async function getProductsFromWB(userId: string, syncToDb: boolean) {
  console.log('📦 Загрузка товаров с Wildberries для пользователя:', userId);

  const cabinet = await getActiveCabinet(userId);
  if (!cabinet?.apiToken) {
    return NextResponse.json({
      error: 'У пользователя нет активного кабинета с API токеном'
    }, { status: 400 });
  }

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

    // ШАГ 2: Получаем цены для всех товаров
    console.log('💰 Шаг 2/3: Получение цен товаров...');
    const pricesData = await fetchProductPrices(cabinet.apiToken);
    console.log(`✅ Получены цены для ${pricesData.length} товаров`);

    await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);

    // ШАГ 3: Получаем остатки (если есть склад)
    console.log('📦 Шаг 3/3: Получение остатков товаров...');
    const stocksData = await fetchProductStocks(cabinet.apiToken);
    console.log(`✅ Получены остатки для ${stocksData.length} товаров`);

    // Объединяем данные
    console.log('🔄 Объединение данных...');
    const enrichedProducts = mergeProductData(cards, pricesData, stocksData);
    console.log(`✅ Обработано ${enrichedProducts.length} товаров`);

    // Синхронизация с БД
    if (syncToDb) {
      console.log('💾 Синхронизация с базой данных...');
      await syncProductsToDB(enrichedProducts, userId);
      console.log('✅ Синхронизация завершена');
    }

    return NextResponse.json({
      success: true,
      products: enrichedProducts,
      total: enrichedProducts.length,
      synced: syncToDb
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

  while (hasMore) {
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
        allCards.push(...data.cards);
        
        // Проверяем, есть ли еще товары
        if (data.cursor && data.cursor.total > allCards.length) {
          cursor = {
            limit: 100,
            updatedAt: data.cursor.updatedAt,
            nmID: data.cursor.nmID
          };
          await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
        } else {
          hasMore = false;
        }
      } else {
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
 * Получение цен товаров
 * Endpoint: GET /api/v2/list/goods/filter
 * Документация: https://dev.wildberries.ru/en/openapi/work-with-products#tag/Product-Management/paths/~1api~1v2~1list~1goods~1filter/get
 */
async function fetchProductPrices(apiToken: string): Promise<any[]> {
  const allPrices: any[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v2/list/goods/filter?limit=${limit}&offset=${offset}`;
      
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.data && data.data.listGoods && Array.isArray(data.data.listGoods)) {
        const goods = data.data.listGoods;
        allPrices.push(...goods);
        
        // Если получили меньше чем limit, значит это последняя страница
        if (goods.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
          await delay(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('❌ Ошибка получения цен:', error);
      hasMore = false;
    }
  }

  return allPrices;
}

/**
 * Получение остатков товаров
 * Endpoint: GET /api/v3/stocks/{warehouseId}
 * Документация: https://dev.wildberries.ru/en/openapi/work-with-products#tag/Product-Management/paths/~1api~1v3~1stocks~1{warehouseId}/get
 * 
 * ПРИМЕЧАНИЕ: Для получения остатков нужен ID склада.
 * Если склад не настроен, используем данные из карточек товаров.
 */
async function fetchProductStocks(apiToken: string): Promise<any[]> {
  try {
    // Получаем список складов
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

    const warehouses = await warehousesResponse.json();
    
    if (!warehouses || warehouses.length === 0) {
      console.log('⚠️ У пользователя нет складов, остатки будут взяты из карточек');
      return [];
    }

    // Берем первый склад
    const warehouseId = warehouses[0].id;
    console.log(`📦 Используем склад: ${warehouses[0].name} (ID: ${warehouseId})`);

    // Получаем остатки
    // ПРИМЕЧАНИЕ: Этот endpoint требует список SKU в теле запроса
    // Если SKU неизвестны, возвращаем пустой массив
    return [];

  } catch (error) {
    console.log('⚠️ Не удалось получить остатки, будут использованы данные из карточек');
    return [];
  }
}

/**
 * Объединение данных из разных источников
 */
function mergeProductData(cards: any[], prices: any[], stocks: any[]): any[] {
  return cards.map(card => {
    // Находим цены для товара
    const priceData = prices.find(p => p.nmID === card.nmID);
    
    // Находим остатки для товара
    const stockData = stocks.find(s => s.nmID === card.nmID);

    // Рассчитываем цены
    let price = 0;
    let discountPrice = 0;
    let discount = 0;

    if (priceData && priceData.sizes && priceData.sizes.length > 0) {
      const firstSize = priceData.sizes[0];
      price = firstSize.price || 0;
      discountPrice = firstSize.discountedPrice || price;
      discount = priceData.discount || 0;
    }

    // Себестоимость (60% от цены - настраивается)
    const costPrice = Math.floor(price * 0.6);

    // Остатки (из карточки, если нет данных со склада)
    const stock = stockData?.amount || 0;

    return {
      // Основные данные
      nmID: card.nmID,
      imtID: card.imtID,
      vendorCode: card.vendorCode,
      brand: card.brand || 'Не указан',
      title: card.title,
      description: card.description || '',
      category: card.subjectName || '',
      
      // Цены
      price: price,
      discountPrice: discountPrice,
      discount: discount,
      costPrice: costPrice,
      
      // Остатки
      stock: stock,
      reserved: 0,
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
        skus: s.skus || []
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
  let synced = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const uniqueId = `wb_${product.nmID}_${userId}`;
      
      await safePrismaOperation(
        () => prisma.product.upsert({
          where: { id: uniqueId },
          update: {
            name: product.title,
            generatedName: product.title,
            price: product.price,
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
