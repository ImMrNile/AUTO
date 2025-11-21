// src/app/api/wb/local-categories/route.ts - ПОЛНЫЙ API ENDPOINT

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET - получение категорий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const query = searchParams.get('query');
    const search = searchParams.get('search');
    const parentId = searchParams.get('parentId');
    const parent = searchParams.get('parent');
    const limit = searchParams.get('limit');
    const subcategoryId = searchParams.get('subcategoryId');
    const sellingPrice = searchParams.get('sellingPrice');
    const productCost = searchParams.get('productCost');
    const deliveryType = searchParams.get('deliveryType') || 'fbw';

    console.log('📂 API запрос локальных категорий:', { action, query, search, parent, parentId, limit });

    switch (action) {
      case 'search':
        const searchQuery = query || search;
        if (!searchQuery) {
          return NextResponse.json({
            success: false,
            error: 'Не указан поисковый запрос'
          }, { status: 400, headers: corsHeaders });
        }

        console.log(`🔍 Обычный поиск категорий: "${searchQuery}"`);

        const searchResults = await prisma.wbSubcategory.findMany({
          where: {
            OR: [
              {
                name: {
                  contains: searchQuery
                }
              },
              {
                parentCategory: {
                  name: {
                    contains: searchQuery
                  }
                }
              }
            ]
          },
          include: {
            parentCategory: true
          },
          take: limit ? parseInt(limit) : 20,
          orderBy: { name: 'asc' }
        });

        return NextResponse.json({
          success: true,
          data: searchResults.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentCategoryId,
            parentName: cat.parentCategory.name,
            displayName: `${cat.parentCategory.name} / ${cat.name}`,
            wbSubjectId: cat.wbSubjectId || undefined,
            parentCategory: cat.parentCategory,
            commissions: {
              fbw: cat.commissionFbw,
              fbs: cat.commissionFbs,
              dbs: cat.commissionDbs,
              cc: cat.commissionCc,
              edbs: cat.commissionEdbs,
              booking: cat.commissionBooking
            }
          })),
          meta: {
            query: searchQuery,
            total: searchResults.length,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      case 'parents':
        console.log('📂 Загрузка родительских категорий...');
        
        const parentCategories = await prisma.wbParentCategory.findMany({
          include: {
            _count: { select: { subcategories: true } }
          },
          orderBy: { name: 'asc' }
        });
        
        console.log(`✅ Загружено ${parentCategories.length} родительских категорий`);
        
        return NextResponse.json({
          success: true,
          data: parentCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat._count.subcategories
          })),
          meta: {
            total: parentCategories.length,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      case 'subcategories':
      case 'by-parent':
        const parentCategoryId = parentId || parent;
        if (!parentCategoryId) {
          return NextResponse.json({
            success: false,
            error: 'Не указан ID родительской категории'
          }, { status: 400, headers: corsHeaders });
        }

        console.log(`📱 Загрузка подкатегорий для родителя ${parentCategoryId}...`);

        const subcategories = await prisma.wbSubcategory.findMany({
          where: {
            parentCategoryId: parseInt(parentCategoryId)
          },
          include: {
            parentCategory: true
          },
          orderBy: { name: 'asc' }
        });

        console.log(`✅ Загружено ${subcategories.length} подкатегорий`);

        return NextResponse.json({
          success: true,
          data: subcategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentCategoryId,
            parentName: cat.parentCategory.name,
            displayName: `${cat.parentCategory.name} / ${cat.name}`,
            wbSubjectId: cat.wbSubjectId || undefined,
            parentCategory: cat.parentCategory,
            commissions: {
              fbw: cat.commissionFbw,
              fbs: cat.commissionFbs,
              dbs: cat.commissionDbs,
              cc: cat.commissionCc,
              edbs: cat.commissionEdbs,
              booking: cat.commissionBooking
            }
          })),
          meta: {
            parentId: parseInt(parentCategoryId),
            total: subcategories.length,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      case 'calculate-profit':
        if (!subcategoryId || !sellingPrice || !productCost) {
          return NextResponse.json({
            success: false,
            error: 'Не указаны обязательные параметры: subcategoryId, sellingPrice, productCost'
          }, { status: 400, headers: corsHeaders });
        }

        console.log(`💰 Расчет прибыли для категории ${subcategoryId}, цена: ${sellingPrice}, себестоимость: ${productCost}`);

        try {
          const profitCalculation = await calculateProfitWithCommissions(
            parseFloat(sellingPrice),
            parseFloat(productCost),
            parseInt(subcategoryId),
            deliveryType as 'fbw' | 'fbs' | 'dbs' | 'cc' | 'edbs' | 'booking'
          );

          console.log(`✅ Расчет завершен: прибыль ${profitCalculation.netProfit}₽ (${profitCalculation.profitMargin}%)`);

          return NextResponse.json({
            success: true,
            data: profitCalculation,
            meta: {
              subcategoryId: parseInt(subcategoryId),
              sellingPrice: parseFloat(sellingPrice),
              productCost: parseFloat(productCost),
              deliveryType,
              timestamp: new Date().toISOString()
            }
          }, { headers: corsHeaders });

        } catch (calcError) {
          console.error('❌ Ошибка расчета прибыли:', calcError);
          return NextResponse.json({
            success: false,
            error: calcError instanceof Error ? calcError.message : 'Ошибка расчета прибыли'
          }, { status: 400, headers: corsHeaders });
        }

      case 'by-id':
        if (!subcategoryId) {
          return NextResponse.json({
            success: false,
            error: 'Не указан ID подкатегории'
          }, { status: 400, headers: corsHeaders });
        }

        const categoryById = await prisma.wbSubcategory.findUnique({
          where: { id: parseInt(subcategoryId) },
          include: { parentCategory: true }
        });

        if (!categoryById) {
          return NextResponse.json({
            success: false,
            error: 'Категория не найдена'
          }, { status: 404, headers: corsHeaders });
        }

        return NextResponse.json({
          success: true,
          data: {
            id: categoryById.id,
            name: categoryById.name,
            slug: categoryById.slug,
            parentId: categoryById.parentCategoryId,
            parentName: categoryById.parentCategory.name,
            displayName: `${categoryById.parentCategory.name} / ${categoryById.name}`,
            wbSubjectId: categoryById.wbSubjectId || undefined,
            commissions: {
              fbw: categoryById.commissionFbw,
              fbs: categoryById.commissionFbs,
              dbs: categoryById.commissionDbs,
              cc: categoryById.commissionCc,
              edbs: categoryById.commissionEdbs,
              booking: categoryById.commissionBooking
            }
          }
        }, { headers: corsHeaders });

      case 'stats':
        console.log('📊 Получение статистики категорий...');
        
        const [totalParents, totalSubs, avgCommission] = await Promise.all([
          prisma.wbParentCategory.count(),
          prisma.wbSubcategory.count(),
          prisma.wbSubcategory.aggregate({
            _avg: { commissionFbw: true }
          })
        ]);

        const topParents = await prisma.wbParentCategory.findMany({
          include: {
            _count: { select: { subcategories: true } }
          },
          orderBy: {
            subcategories: { _count: 'desc' }
          },
          take: 5
        });

        console.log(`✅ Статистика: ${totalParents} родителей, ${totalSubs} подкатегорий`);

        return NextResponse.json({
          success: true,
          data: {
            totalParents,
            totalSubs,
            avgCommission: Number(avgCommission._avg.commissionFbw || 0),
            topCategories: topParents.map(cat => ({
              name: cat.name,
              count: cat._count.subcategories
            }))
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      default:
        // Получение всех категорий (action = 'all' или не указан)
        console.log(`📋 Загрузка всех категорий (лимит: ${limit || 100})...`);
        
        const allCategories = await prisma.wbSubcategory.findMany({
          include: {
            parentCategory: true
          },
          take: limit ? parseInt(limit) : 100,
          orderBy: { name: 'asc' }
        });

        console.log(`✅ Загружено ${allCategories.length} категорий`);

        return NextResponse.json({
          success: true,
          data: allCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentCategoryId,
            parentName: cat.parentCategory.name,
            displayName: `${cat.parentCategory.name} / ${cat.name}`,
            wbSubjectId: cat.wbSubjectId || undefined,
            parentCategory: cat.parentCategory,
            commissions: {
              fbw: cat.commissionFbw,
              fbs: cat.commissionFbs,
              dbs: cat.commissionDbs,
              cc: cat.commissionCc,
              edbs: cat.commissionEdbs,
              booking: cat.commissionBooking
            }
          })),
          meta: {
            total: allCategories.length,
            limit: limit ? parseInt(limit) : 100,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });
    }

  } catch (error) {
    console.error('❌ Ошибка API локальных категорий:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500, headers: corsHeaders });
  }
}

// POST - умный поиск и дополнительные операции
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    console.log('📝 POST запрос в API локальных категорий:', { action, data });

    switch (action) {
      case 'smart-search':
        if (!data?.query) {
          return NextResponse.json({
            success: false,
            error: 'Не указан поисковый запрос'
          }, { status: 400, headers: corsHeaders });
        }

        console.log(`🎯 Выполняем умный поиск: "${data.query}"`);
        
        const smartResults = await smartCategorySearch(data.query, data.limit || 20);

        console.log(`✅ Умный поиск завершен: найдено ${smartResults.length} категорий`);

        return NextResponse.json({
          success: true,
          data: smartResults,
          meta: {
            query: data.query,
            method: 'smart-search',
            total: smartResults.length,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      case 'find-best-category':
        if (!data?.productName) {
          return NextResponse.json({
            success: false,
            error: 'Не указано название товара'
          }, { status: 400, headers: corsHeaders });
        }

        console.log(`🎯 Поиск лучшей категории для товара: "${data.productName}"`);
        
        const bestCategory = await findBestCategoryForProduct(data.productName);
        
        if (bestCategory) {
          console.log(`✅ Найдена лучшая категория: ${bestCategory.displayName}`);
          return NextResponse.json({
            success: true,
            data: bestCategory,
            meta: {
              productName: data.productName,
              method: 'find-best-category',
              timestamp: new Date().toISOString()
            }
          }, { headers: corsHeaders });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Подходящая категория не найдена'
          }, { status: 404, headers: corsHeaders });
        }

      case 'calculate-profit':
        const { categoryId, price, cost, deliveryType = 'fbw' } = data;

        if (!categoryId || !price || !cost) {
          return NextResponse.json({
            success: false,
            error: 'Не указаны обязательные параметры: categoryId, price, cost'
          }, { status: 400, headers: corsHeaders });
        }

        const profitData = await calculateProfitWithCommissions(
          price,
          cost,
          categoryId,
          deliveryType
        );

        return NextResponse.json({
          success: true,
          data: profitData,
          meta: {
            categoryId,
            price,
            cost,
            deliveryType,
            timestamp: new Date().toISOString()
          }
        }, { headers: corsHeaders });

      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие'
        }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('❌ Ошибка POST API локальных категорий:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500, headers: corsHeaders });
  }
}

// УМНЫЙ ПОИСК КАТЕГОРИЙ
async function smartCategorySearch(query: string, limit: number = 20) {
  const queryLower = query.toLowerCase();
  
  // Расширенные ключевые слова с весами
  const categoryKeywords = {
    'электроника': {
      keywords: ['кабель', 'зарядка', 'адаптер', 'usb', 'провод', 'шнур', 'type-c', 'lightning', 'micro', 'зарядное', 'блок питания', 'переходник'],
      weight: 10,
      parentNames: ['Электроника', 'Электротехника', 'Аксессуары для телефонов']
    },
    'наушники': {
      keywords: ['наушники', 'гарнитура', 'airpods', 'bluetooth', 'беспроводные', 'вкладыши', 'накладные'],
      weight: 9,
      parentNames: ['Электроника', 'Аудиотехника']
    },
    'чехлы': {
      keywords: ['чехол', 'бампер', 'защита', 'стекло', 'пленка', 'для телефона', 'для смартфона', 'защитное'],
      weight: 8,
      parentNames: ['Аксессуары для телефонов', 'Защита для техники']
    },
    'авто': {
      keywords: ['автомобильный', 'авто', 'машина', 'в машину', 'автомагнитола', 'для авто', 'автоаксессуар', 'держатель в авто'],
      weight: 7,
      parentNames: ['Автотовары', 'Автомобильные аксессуары']
    },
    'дом': {
      keywords: ['для дома', 'домашний', 'кухня', 'ванна', 'спальня', 'бытовая техника', 'интерьер'],
      weight: 6,
      parentNames: ['Товары для дома', 'Кухня', 'Ванная', 'Бытовая техника', 'Интерьер']
    },
    'одежда': {
      keywords: ['футболка', 'рубашка', 'платье', 'джинсы', 'куртка', 'брюки', 'свитер', 'блузка'],
      weight: 5,
      parentNames: ['Одежда', 'Мужская одежда', 'Женская одежда', 'Детская одежда']
    },
    'обувь': {
      keywords: ['кроссовки', 'ботинки', 'туфли', 'сапоги', 'тапочки', 'сандалии', 'босоножки'],
      weight: 5,
      parentNames: ['Обувь', 'Мужская обувь', 'Женская обувь', 'Детская обувь']
    },
    'игрушки': {
      keywords: ['игрушка', 'игры', 'детская', 'развивающая', 'конструктор', 'кукла', 'машинка'],
      weight: 6,
      parentNames: ['Игрушки', 'Детские товары', 'Развивающие игрушки']
    },
    'мебель': {
      keywords: ['стол', 'стул', 'диван', 'кресло', 'шкаф', 'кровать', 'мебель', 'полка'],
      weight: 7,
      parentNames: ['Мебель', 'Мебель мягкая', 'Мебель для дома']
    },
    'косметика': {
      keywords: ['крем', 'маска', 'шампунь', 'косметика', 'уход', 'красота', 'макияж'],
      weight: 6,
      parentNames: ['Красота', 'Косметика', 'Уход за кожей', 'Парфюмерия']
    }
  };

  const matchedCategories = [];
  
  for (const [categoryType, config] of Object.entries(categoryKeywords)) {
    let matchScore = 0;
    const matchedKeywords = [];
    
    for (const keyword of config.keywords) {
      if (queryLower.includes(keyword)) {
        matchScore += config.weight;
        matchedKeywords.push(keyword);
        
        if (queryLower === keyword) {
          matchScore += 5;
        }
      }
    }
    
    if (matchScore > 0) {
      matchedCategories.push({ 
        categoryType, 
        matchScore, 
        config,
        matchedKeywords
      });
    }
  }

  // Сортируем по релевантности
  matchedCategories.sort((a, b) => b.matchScore - a.matchScore);
  
  const searchResults: any[] = [];
  
  // Сначала ищем по умным ключевым словам
  for (const match of matchedCategories.slice(0, 3)) {
    const categories = await prisma.wbSubcategory.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query
            }
          },
          {
            parentCategory: {
              name: {
                in: match.config.parentNames
              }
            }
          }
        ]
      },
      include: {
        parentCategory: true
      },
      take: 5,
      orderBy: { name: 'asc' }
    });
    
    // Добавляем с метаданными о релевантности
    for (const cat of categories) {
      if (!searchResults.some(r => r.id === cat.id)) {
        searchResults.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentCategoryId,
          parentName: cat.parentCategory.name,
          displayName: `${cat.parentCategory.name} / ${cat.name}`,
          wbSubjectId: cat.wbSubjectId || undefined,
          parentCategory: cat.parentCategory,
          relevanceScore: match.matchScore,
          matchReason: `Найдено по ключевым словам: ${match.matchedKeywords.join(', ')}`,
          commissions: {
            fbw: cat.commissionFbw,
            fbs: cat.commissionFbs,
            dbs: cat.commissionDbs,
            cc: cat.commissionCc,
            edbs: cat.commissionEdbs,
            booking: cat.commissionBooking
          }
        });
      }
    }
  }
  
  // Дополнительный обычный поиск если мало результатов
  if (searchResults.length < limit) {
    const additionalResults = await prisma.wbSubcategory.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query
            }
          },
          {
            parentCategory: {
              name: {
                contains: query
              }
            }
          }
        ]
      },
      include: {
        parentCategory: true
      },
      take: limit - searchResults.length,
      orderBy: { name: 'asc' }
    });
    
    for (const cat of additionalResults) {
      if (!searchResults.some(r => r.id === cat.id)) {
        searchResults.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentCategoryId,
          parentName: cat.parentCategory.name,
          displayName: `${cat.parentCategory.name} / ${cat.name}`,
          wbSubjectId: cat.wbSubjectId || undefined,
          parentCategory: cat.parentCategory,
          relevanceScore: 1,
          matchReason: 'Найдено по названию',
          commissions: {
            fbw: cat.commissionFbw,
            fbs: cat.commissionFbs,
            dbs: cat.commissionDbs,
            cc: cat.commissionCc,
            edbs: cat.commissionEdbs,
            booking: cat.commissionBooking
          }
        });
      }
    }
  }
  
  return searchResults
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, limit);
}

// ПОИСК ЛУЧШЕЙ КАТЕГОРИИ ДЛЯ ТОВАРА
async function findBestCategoryForProduct(productName: string) {
  // Используем умный поиск
  const smartResults = await smartCategorySearch(productName, 5);
  
  if (smartResults.length > 0) {
    const bestMatch = smartResults[0];
    console.log(`✅ Найдена лучшая категория: ${bestMatch.displayName} (релевантность: ${bestMatch.relevanceScore})`);
    return bestMatch;
  }

  // Fallback на обычный поиск
  const normalResults = await prisma.wbSubcategory.findMany({
    where: {
      name: {
        contains: productName
      }
    },
    include: {
      parentCategory: true
    },
    take: 5,
    orderBy: { name: 'asc' }
  });

  if (normalResults.length > 0) {
    const result = {
      id: normalResults[0].id,
      name: normalResults[0].name,
      slug: normalResults[0].slug,
      parentId: normalResults[0].parentCategoryId,
      parentName: normalResults[0].parentCategory.name,
      displayName: `${normalResults[0].parentCategory.name} / ${normalResults[0].name}`,
      wbSubjectId: normalResults[0].wbSubjectId || undefined,
      parentCategory: normalResults[0].parentCategory,
      commissions: {
        fbw: normalResults[0].commissionFbw,
        fbs: normalResults[0].commissionFbs,
        dbs: normalResults[0].commissionDbs,
        cc: normalResults[0].commissionCc,
        edbs: normalResults[0].commissionEdbs,
        booking: normalResults[0].commissionBooking
      }
    };

    console.log(`✅ Найдена категория через обычный поиск: ${result.displayName}`);
    return result;
  }

  // Последний fallback - первая доступная категория
  const defaultCategory = await prisma.wbSubcategory.findFirst({
    include: { parentCategory: true }
  });

  if (defaultCategory) {
    const result = {
      id: defaultCategory.id,
      name: defaultCategory.name,
      slug: defaultCategory.slug,
      parentId: defaultCategory.parentCategoryId,
      parentName: defaultCategory.parentCategory.name,
      displayName: `${defaultCategory.parentCategory.name} / ${defaultCategory.name}`,
      wbSubjectId: defaultCategory.wbSubjectId || undefined,
      parentCategory: defaultCategory.parentCategory,
      commissions: {
        fbw: defaultCategory.commissionFbw,
        fbs: defaultCategory.commissionFbs,
        dbs: defaultCategory.commissionDbs,
        cc: defaultCategory.commissionCc,
        edbs: defaultCategory.commissionEdbs,
        booking: defaultCategory.commissionBooking
      }
    };

    console.log(`⚠️ Используем дефолтную категорию: ${result.displayName}`);
    return result;
  }

  return null;
}

// РАСЧЕТ ПРИБЫЛИ
async function calculateProfitWithCommissions(
  price: number,
  cost: number,
  subcategoryId: number,
  deliveryType: 'fbw' | 'fbs' | 'dbs' | 'cc' | 'edbs' | 'booking' = 'fbw'
) {
  const category = await prisma.wbSubcategory.findUnique({
    where: { id: subcategoryId },
    include: { parentCategory: true }
  });

  if (!category) {
    throw new Error('Категория не найдена');
  }

  // Выбираем комиссию по типу доставки
  let commissionPercent = 0;
  switch (deliveryType) {
    case 'fbw': commissionPercent = category.commissionFbw; break;
    case 'fbs': commissionPercent = category.commissionFbs; break;
    case 'dbs': commissionPercent = category.commissionDbs; break;
    case 'cc': commissionPercent = category.commissionCc; break;
    case 'edbs': commissionPercent = category.commissionEdbs; break;
    case 'booking': commissionPercent = category.commissionBooking; break;
  }

  // Расчеты
  const commission = (price * commissionPercent) / 100;
  const revenue = price - commission;
  const grossProfit = revenue - cost;
  const netProfit = grossProfit;
  const profitMargin = (netProfit / price) * 100;

  return {
    revenue: Math.round(revenue * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    commissionRate: commissionPercent,
    logisticsCost: 0,
    productCost: cost,
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    category: {
      name: category.name,
      parentName: category.parentCategory.name
    }
  };
}
