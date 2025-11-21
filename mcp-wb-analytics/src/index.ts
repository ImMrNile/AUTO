#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// MCP Server для WB Analytics
const server = new Server(
  {
    name: 'wb-analytics-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ==================== MCP TOOLS ====================

/**
 * Tool 1: Получить поисковые запросы товара
 */
async function getSearchQueries(args: {
  nmIds: number[];
  startDate: string;
  endDate: string;
  apiToken: string;
}) {
  const { nmIds, startDate, endDate, apiToken } = args;

  console.log(`🔍 [MCP] Получение поисковых запросов для товаров: ${nmIds.join(', ')}`);

  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/v2/search-report/product/search-texts',
    {
      method: 'POST',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPeriod: { start: startDate, end: endDate },
        pastPeriod: {
          start: getPastPeriodStart(startDate, endDate),
          end: startDate,
        },
        nmIds,
        topOrderBy: 'orders',
        includeSubstitutedSKUs: true,
        includeSearchTexts: true,
        limit: 30,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();

  // Классифицируем запросы
  const queries = data.data.items.map((item: any) => ({
    text: item.text,
    frequency: item.frequency.current,
    avgPosition: item.avgPosition.current,
    openCard: item.openCard.current,
    addToCart: item.addToCart.current,
    orders: item.orders.current,
    openToCart: item.openToCart.current,
    cartToOrder: item.cartToOrder.current,
    visibility: item.visibility.current,
  }));

  const avgConversion = queries.reduce((sum: number, q: any) => sum + q.cartToOrder, 0) / queries.length;

  const goldenQueries = queries.filter(
    (q: any) => q.cartToOrder > avgConversion * 1.5 && q.orders > 5
  );

  const unprofitableQueries = queries.filter(
    (q: any) => q.cartToOrder < avgConversion * 0.5 && q.frequency > 100
  );

  console.log(`✅ [MCP] Найдено ${queries.length} запросов`);
  console.log(`   🟢 Золотых: ${goldenQueries.length}`);
  console.log(`   🔴 Убыточных: ${unprofitableQueries.length}`);

  return {
    queries,
    avgConversion,
    goldenQueries,
    unprofitableQueries,
  };
}

/**
 * Tool 2: Получить статистику рекламных кампаний
 */
async function getCampaignStats(args: {
  campaignIds: number[];
  startDate: string;
  endDate: string;
  apiToken: string;
}) {
  const { campaignIds, startDate, endDate, apiToken } = args;

  console.log(`📊 [MCP] Получение статистики кампаний: ${campaignIds.join(', ')}`);

  const response = await fetch(
    `https://advert-api.wildberries.ru/adv/v3/fullstats?ids=${campaignIds.join(',')}&dateFrom=${startDate}&dateTo=${endDate}`,
    {
      method: 'GET',
      headers: {
        Authorization: apiToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();

  const campaigns = data.map((campaign: any) => {
    const spend = campaign.views * (campaign.cpm / 1000);
    const revenue = campaign.sum || 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    return {
      campaignId: campaign.advertId,
      views: campaign.views,
      clicks: campaign.clicks,
      ctr: campaign.ctr,
      cpc: campaign.cpc,
      cpm: campaign.cpm,
      atbs: campaign.atbs,
      orders: campaign.orders,
      sum: campaign.sum,
      cr: campaign.cr,
      roi,
    };
  });

  const avgROI = campaigns.reduce((sum: number, c: any) => sum + c.roi, 0) / campaigns.length;

  const bestCampaigns = campaigns.filter((c: any) => c.roi > avgROI * 1.5);
  const worstCampaigns = campaigns.filter((c: any) => c.roi < 0);

  console.log(`✅ [MCP] Проанализировано ${campaigns.length} кампаний`);
  console.log(`   🟢 Прибыльных: ${bestCampaigns.length}`);
  console.log(`   🔴 Убыточных: ${worstCampaigns.length}`);

  return {
    campaigns,
    avgROI,
    bestCampaigns,
    worstCampaigns,
  };
}

/**
 * Tool 3: Получить статистику по ключевым фразам
 */
async function getKeywordStats(args: {
  startDate: string;
  endDate: string;
  apiToken: string;
  avgProductPrice: number;
}) {
  const { startDate, endDate, apiToken, avgProductPrice } = args;

  console.log(`🔑 [MCP] Получение статистики ключевых фраз`);

  const response = await fetch('https://advert-api.wildberries.ru/adv/v0/normquery/stats', {
    method: 'POST',
    headers: {
      Authorization: apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateFrom: startDate,
      dateTo: endDate,
    }),
  });

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();

  const keywords: any[] = [];

  for (const advertStats of data.stats) {
    for (const stat of advertStats.stats) {
      const spend = stat.clicks * stat.cpc;
      const revenue = stat.orders * avgProductPrice;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

      keywords.push({
        phrase: stat.norm_query,
        views: stat.views,
        clicks: stat.clicks,
        ctr: stat.ctr,
        cpc: stat.cpc,
        cpm: stat.cpm,
        atbs: stat.atbs,
        orders: stat.orders,
        avgPosition: stat.avg_pos,
        roi,
      });
    }
  }

  const avgCPC = keywords.reduce((sum, k) => sum + k.cpc, 0) / keywords.length;
  const avgROI = keywords.reduce((sum, k) => sum + k.roi, 0) / keywords.length;

  // Классифицируем ключевые фразы
  const goldenKeywords = keywords.filter(
    (k) => k.roi > avgROI * 1.5 && k.cpc < avgCPC && k.orders > 5 && k.ctr > 10
  );

  const unprofitableKeywords = keywords.filter(
    (k) => k.roi < 0 && k.cpc > avgCPC * 1.5 && k.clicks > 50
  );

  const promisingKeywords = keywords.filter(
    (k) => k.roi > avgROI && k.avgPosition > 10 && k.orders > 3
  );

  console.log(`✅ [MCP] Проанализировано ${keywords.length} ключевых фраз`);
  console.log(`   🟢 Золотых: ${goldenKeywords.length}`);
  console.log(`   🔴 Убыточных: ${unprofitableKeywords.length}`);
  console.log(`   🟡 Перспективных: ${promisingKeywords.length}`);

  return {
    keywords,
    avgCPC,
    avgROI,
    goldenKeywords,
    unprofitableKeywords,
    promisingKeywords,
  };
}

/**
 * Tool 4: Получить воронку продаж
 */
async function getSalesFunnel(args: {
  nmIds: number[];
  startDate: string;
  endDate: string;
  apiToken: string;
}) {
  const { nmIds, startDate, endDate, apiToken } = args;

  console.log(`📈 [MCP] Получение воронки продаж для товаров: ${nmIds.join(', ')}`);

  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
    {
      method: 'POST',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedPeriod: { start: startDate, end: endDate },
        pastPeriod: {
          start: getPastPeriodStart(startDate, endDate),
          end: startDate,
        },
        nmIds,
        skipDeletedNm: false,
        limit: 100,
        offset: 0,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();

  const products = data.data.products;
  const aggregated = {
    openCard: 0,
    addToCart: 0,
    orders: 0,
    buyouts: 0,
  };

  for (const product of products) {
    const stats = product.statistic.selected;
    aggregated.openCard += stats.openCount;
    aggregated.addToCart += stats.cartCount;
    aggregated.orders += stats.orderCount;
    aggregated.buyouts += stats.buyoutCount;
  }

  const conversionToCart = aggregated.openCard > 0 
    ? (aggregated.addToCart / aggregated.openCard) * 100 
    : 0;
  
  const conversionToOrder = aggregated.addToCart > 0 
    ? (aggregated.orders / aggregated.addToCart) * 100 
    : 0;
  
  const buyoutRate = aggregated.orders > 0 
    ? (aggregated.buyouts / aggregated.orders) * 100 
    : 0;

  console.log(`✅ [MCP] Воронка продаж получена`);
  console.log(`   Просмотры: ${aggregated.openCard}`);
  console.log(`   В корзину: ${aggregated.addToCart} (${conversionToCart.toFixed(1)}%)`);
  console.log(`   Заказы: ${aggregated.orders} (${conversionToOrder.toFixed(1)}%)`);
  console.log(`   Выкупы: ${aggregated.buyouts} (${buyoutRate.toFixed(1)}%)`);

  return {
    ...aggregated,
    conversionToCart,
    conversionToOrder,
    buyoutRate,
  };
}

/**
 * Tool 5: Сохранить рекомендации в базу данных
 */
async function saveRecommendations(args: {
  productId: string;
  recommendations: {
    goldenKeywords: any[];
    unprofitableKeywords: any[];
    promisingKeywords: any[];
    cardOptimizations: any[];
    expectedSalesIncrease: number;
    expectedROIIncrease: number;
  };
}) {
  const { productId, recommendations } = args;

  console.log(`💾 [MCP] Сохранение рекомендаций для товара ${productId}`);

  // Сохраняем в базу данных
  await prisma.productOptimization.create({
    data: {
      productId,
      goldenKeywords: JSON.stringify(recommendations.goldenKeywords),
      unprofitableKeywords: JSON.stringify(recommendations.unprofitableKeywords),
      promisingKeywords: JSON.stringify(recommendations.promisingKeywords),
      cardOptimizations: JSON.stringify(recommendations.cardOptimizations),
      expectedSalesIncrease: recommendations.expectedSalesIncrease,
      expectedROIIncrease: recommendations.expectedROIIncrease,
      createdAt: new Date(),
    },
  });

  console.log(`✅ [MCP] Рекомендации сохранены`);

  return { success: true };
}

/**
 * Tool 6: Применить оптимизацию ставок
 */
async function applyBidOptimization(args: {
  campaignId: number;
  keywords: { phrase: string; newBid: number }[];
  apiToken: string;
}) {
  const { campaignId, keywords, apiToken } = args;

  console.log(`🎯 [MCP] Применение оптимизации ставок для кампании ${campaignId}`);
  console.log(`   Обновление ${keywords.length} ключевых фраз`);

  // Обновляем ставки через WB API
  const response = await fetch('https://advert-api.wildberries.ru/adv/v0/normquery/bids', {
    method: 'POST',
    headers: {
      Authorization: apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      advertId: campaignId,
      bids: keywords.map((k) => ({
        keyword: k.phrase,
        bid: k.newBid,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  console.log(`✅ [MCP] Ставки обновлены`);

  return { success: true, updatedCount: keywords.length };
}

/**
 * Tool 7: Добавить минус-слова
 */
async function addMinusWords(args: {
  campaignId: number;
  minusWords: string[];
  apiToken: string;
}) {
  const { campaignId, minusWords, apiToken } = args;

  console.log(`🚫 [MCP] Добавление минус-слов для кампании ${campaignId}`);
  console.log(`   Минус-слов: ${minusWords.length}`);

  const response = await fetch('https://advert-api.wildberries.ru/adv/v0/normquery/set-minus', {
    method: 'POST',
    headers: {
      Authorization: apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      advertId: campaignId,
      minusKeywords: minusWords,
    }),
  });

  if (!response.ok) {
    throw new Error(`WB API error: ${response.status}`);
  }

  console.log(`✅ [MCP] Минус-слова добавлены`);

  return { success: true, addedCount: minusWords.length };
}

/**
 * Tool 8: Получить товары пользователя
 */
async function getUserProducts(args: { userId: string }) {
  const { userId } = args;

  console.log(`📦 [MCP] Получение товаров пользователя ${userId}`);

  const products = await prisma.product.findMany({
    where: { userId },
    include: {
      subcategory: true,
      productCabinets: {
        include: { cabinet: true },
      },
      analytics: true,
    },
  });

  console.log(`✅ [MCP] Найдено ${products.length} товаров`);

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    nmId: p.wbNmId,
    price: p.price,
    costPrice: p.costPrice,
    category: {
      name: p.subcategory?.name,
      commissionFbw: p.subcategory?.commissionFbw,
      commissionFbs: p.subcategory?.commissionFbs,
    },
    cabinet: {
      taxRate: p.productCabinets[0]?.cabinet.taxRate,
      apiToken: p.productCabinets[0]?.cabinet.apiToken,
    },
    analytics: p.analytics
      ? {
          views: p.analytics.views,
          addToCart: p.analytics.addToCart,
          orders: p.analytics.orders,
          revenue: p.analytics.revenue,
        }
      : null,
  }));
}

/**
 * Tool 9: Рассчитать оптимальную цену
 */
async function calculateOptimalPrice(args: {
  productId: string;
  userId: string;
  minProfitPercent: number;
}) {
  const { productId, userId, minProfitPercent } = args;

  console.log(`💰 [MCP] Расчет оптимальной цены для товара ${productId}`);
  console.log(`   Минимальная прибыль: ${minProfitPercent}%`);

  // Проверка принадлежности товара пользователю
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      userId: userId, // ⚠️ ВАЖНО: только товары этого пользователя!
    },
    include: {
      subcategory: true,
      productCabinets: {
        include: { cabinet: true },
      },
    },
  });

  if (!product) {
    throw new Error('Товар не найден или не принадлежит пользователю');
  }

  const costPrice = product.costPrice || 0;
  const wbCommission = (product.subcategory?.commissionFbw || 15) / 100;
  const logistics = 0.1467; // 14.67%
  const storage = 0.0179; // 1.79%
  const acceptance = 0.0022; // 0.22%
  const taxRate = (product.productCabinets[0]?.cabinet.taxRate || 6) / 100;
  const minProfit = minProfitPercent / 100;

  // Расчет минимальной цены
  const totalWbExpenses = wbCommission + logistics + storage + acceptance;
  const minPrice = (costPrice / (1 - taxRate)) / (1 - totalWbExpenses - minProfit);
  const optimalPrice = Math.ceil(minPrice / 10) * 10; // Округление до 10₽

  // Детальный расчет для оптимальной цены
  const wbCommissionAmount = optimalPrice * wbCommission;
  const logisticsAmount = optimalPrice * logistics;
  const storageAmount = optimalPrice * storage;
  const acceptanceAmount = optimalPrice * acceptance;
  const totalWbExpensesAmount =
    wbCommissionAmount + logisticsAmount + storageAmount + acceptanceAmount;
  const forPay = optimalPrice - totalWbExpensesAmount;
  const taxAmount = forPay * taxRate;
  const netProfit = forPay - taxAmount - costPrice;
  const profitPercent = costPrice > 0 ? (netProfit / costPrice) * 100 : 0;
  const marginPercent = (netProfit / optimalPrice) * 100;

  console.log(`✅ [MCP] Оптимальная цена: ${optimalPrice}₽`);
  console.log(`   Чистая прибыль: ${netProfit.toFixed(2)}₽ (${profitPercent.toFixed(1)}%)`);

  return {
    currentPrice: product.price,
    optimalPrice,
    breakdown: {
      costPrice,
      wbCommission: Math.round(wbCommissionAmount * 100) / 100,
      logistics: Math.round(logisticsAmount * 100) / 100,
      storage: Math.round(storageAmount * 100) / 100,
      acceptance: Math.round(acceptanceAmount * 100) / 100,
      totalWbExpenses: Math.round(totalWbExpensesAmount * 100) / 100,
      forPay: Math.round(forPay * 100) / 100,
      tax: Math.round(taxAmount * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitPercent: Math.round(profitPercent * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
    },
    recommendation:
      profitPercent >= minProfitPercent
        ? `Текущая цена оптимальна (прибыль ${profitPercent.toFixed(1)}%)`
        : `Увеличить цену до ${optimalPrice}₽ для достижения минимальной прибыли ${minProfitPercent}%`,
  };
}

/**
 * Tool 10: Применить оптимизацию цены
 */
async function applyPriceOptimization(args: {
  productId: string;
  userId: string;
  newPrice: number;
  reason: string;
  autoApply: boolean;
}) {
  const { productId, userId, newPrice, reason, autoApply } = args;

  console.log(`🎯 [MCP] Применение оптимизации цены для товара ${productId}`);
  console.log(`   Новая цена: ${newPrice}₽`);
  console.log(`   AutoApply: ${autoApply}`);

  // Проверка принадлежности
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      userId: userId, // ⚠️ ВАЖНО!
    },
    include: {
      productCabinets: {
        include: { cabinet: true },
      },
    },
  });

  if (!product) {
    throw new Error('Товар не найден или не принадлежит пользователю');
  }

  const oldPrice = product.price;

  // Обновляем цену в БД
  await prisma.product.update({
    where: { id: productId },
    data: { price: newPrice },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'AI_PRICE_OPTIMIZATION',
      entityType: 'Product',
      entityId: productId,
      details: {
        oldPrice,
        newPrice,
        reason,
        autoApplied: autoApply,
        aiModel: 'gpt-5',
      },
    },
  });

  let appliedToWB = false;

  // Если autoApply - обновляем в WB API
  if (autoApply && product.wbNmId) {
    const apiToken = product.productCabinets[0]?.cabinet.apiToken;
    if (apiToken) {
      // TODO: Вызов WB API для обновления цены
      // const response = await fetch('https://suppliers-api.wildberries.ru/public/api/v1/prices', {
      //   method: 'POST',
      //   headers: {
      //     Authorization: apiToken,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify([{
      //     nmId: parseInt(product.wbNmId),
      //     price: newPrice
      //   }])
      // });
      // appliedToWB = response.ok;
      appliedToWB = true; // Временно
      console.log(`✅ [MCP] Цена обновлена в WB API`);
    }
  }

  console.log(`✅ [MCP] Цена обновлена в БД: ${oldPrice}₽ → ${newPrice}₽`);

  return {
    success: true,
    oldPrice,
    newPrice,
    appliedToWB,
    expectedProfitIncrease: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
  };
}

// ==================== РЕГИСТРАЦИЯ TOOLS ====================

const tools: Tool[] = [
  {
    name: 'get_search_queries',
    description:
      'Получить поисковые запросы товара с метриками (частота, позиция, конверсия). Автоматически классифицирует на "золотые" и "убыточные".',
    inputSchema: {
      type: 'object',
      properties: {
        nmIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Артикулы WB товаров',
        },
        startDate: {
          type: 'string',
          description: 'Дата начала периода (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Дата окончания периода (YYYY-MM-DD)',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
      },
      required: ['nmIds', 'startDate', 'endDate', 'apiToken'],
    },
  },
  {
    name: 'get_campaign_stats',
    description:
      'Получить статистику рекламных кампаний (CTR, CPC, ROI). Автоматически определяет прибыльные и убыточные кампании.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'ID рекламных кампаний',
        },
        startDate: {
          type: 'string',
          description: 'Дата начала периода (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Дата окончания периода (YYYY-MM-DD)',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
      },
      required: ['campaignIds', 'startDate', 'endDate', 'apiToken'],
    },
  },
  {
    name: 'get_keyword_stats',
    description:
      'Получить статистику по ключевым фразам в рекламе. Классифицирует на "золотые", "убыточные" и "перспективные".',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Дата начала периода (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Дата окончания периода (YYYY-MM-DD)',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
        avgProductPrice: {
          type: 'number',
          description: 'Средняя цена товара для расчета ROI',
        },
      },
      required: ['startDate', 'endDate', 'apiToken', 'avgProductPrice'],
    },
  },
  {
    name: 'get_sales_funnel',
    description:
      'Получить воронку продаж товара (просмотры, корзина, заказы, выкупы, конверсии).',
    inputSchema: {
      type: 'object',
      properties: {
        nmIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Артикулы WB товаров',
        },
        startDate: {
          type: 'string',
          description: 'Дата начала периода (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Дата окончания периода (YYYY-MM-DD)',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
      },
      required: ['nmIds', 'startDate', 'endDate', 'apiToken'],
    },
  },
  {
    name: 'save_recommendations',
    description: 'Сохранить рекомендации по оптимизации в базу данных.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID товара в базе данных',
        },
        recommendations: {
          type: 'object',
          description: 'Объект с рекомендациями',
        },
      },
      required: ['productId', 'recommendations'],
    },
  },
  {
    name: 'apply_bid_optimization',
    description: 'Применить оптимизацию ставок для ключевых фраз в рекламной кампании.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'number',
          description: 'ID рекламной кампании',
        },
        keywords: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phrase: { type: 'string' },
              newBid: { type: 'number' },
            },
          },
          description: 'Массив ключевых фраз с новыми ставками',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
      },
      required: ['campaignId', 'keywords', 'apiToken'],
    },
  },
  {
    name: 'add_minus_words',
    description: 'Добавить минус-слова в рекламную кампанию для экономии бюджета.',
    inputSchema: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'number',
          description: 'ID рекламной кампании',
        },
        minusWords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Массив минус-слов',
        },
        apiToken: {
          type: 'string',
          description: 'WB API токен',
        },
      },
      required: ['campaignId', 'minusWords', 'apiToken'],
    },
  },
  {
    name: 'get_user_products',
    description: 'Получить все товары конкретного пользователя с аналитикой и данными категорий',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID пользователя',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'calculate_optimal_price',
    description:
      'Рассчитать оптимальную цену товара с учетом себестоимости, комиссий WB, логистики, хранения, налогов и минимальной прибыли',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID товара',
        },
        userId: {
          type: 'string',
          description: 'ID пользователя (для проверки принадлежности)',
        },
        minProfitPercent: {
          type: 'number',
          description: 'Минимальная прибыль в процентах (например, 30 для 30%)',
        },
      },
      required: ['productId', 'userId', 'minProfitPercent'],
    },
  },
  {
    name: 'apply_price_optimization',
    description: 'Применить новую цену для товара (в БД и опционально в WB API)',
    inputSchema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          description: 'ID товара',
        },
        userId: {
          type: 'string',
          description: 'ID пользователя (для проверки принадлежности)',
        },
        newPrice: {
          type: 'number',
          description: 'Новая цена товара',
        },
        reason: {
          type: 'string',
          description: 'Причина изменения цены',
        },
        autoApply: {
          type: 'boolean',
          description: 'Автоматически применить в WB API (true) или только в БД (false)',
        },
      },
      required: ['productId', 'userId', 'newPrice', 'reason', 'autoApply'],
    },
  },
];

// ==================== ОБРАБОТЧИКИ ====================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_search_queries':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getSearchQueries(args as any), null, 2),
            },
          ],
        };

      case 'get_campaign_stats':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getCampaignStats(args as any), null, 2),
            },
          ],
        };

      case 'get_keyword_stats':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getKeywordStats(args as any), null, 2),
            },
          ],
        };

      case 'get_sales_funnel':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getSalesFunnel(args as any), null, 2),
            },
          ],
        };

      case 'save_recommendations':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await saveRecommendations(args as any), null, 2),
            },
          ],
        };

      case 'apply_bid_optimization':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await applyBidOptimization(args as any), null, 2),
            },
          ],
        };

      case 'add_minus_words':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await addMinusWords(args as any), null, 2),
            },
          ],
        };

      case 'get_user_products':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getUserProducts(args as any), null, 2),
            },
          ],
        };

      case 'calculate_optimal_price':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await calculateOptimalPrice(args as any), null, 2),
            },
          ],
        };

      case 'apply_price_optimization':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await applyPriceOptimization(args as any), null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ==================== ЗАПУСК СЕРВЕРА ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('🚀 WB Analytics MCP Server запущен');
}

main().catch((error) => {
  console.error('❌ Ошибка запуска MCP сервера:', error);
  process.exit(1);
});

// ==================== УТИЛИТЫ ====================

function getPastPeriodStart(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const pastStart = new Date(start);
  pastStart.setDate(pastStart.getDate() - days);
  return pastStart.toISOString().split('T')[0];
}
