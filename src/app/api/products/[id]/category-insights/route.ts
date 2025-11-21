// API для получения инсайтов по категории для НОВОГО товара
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🆕 [Category Insights] Анализ категории для нового товара: ${params.id}`);
    
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        subcategory: true,
        productCabinets: {
          include: {
            cabinet: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    const cabinet = product.productCabinets?.[0]?.cabinet;
    if (!cabinet?.apiToken) {
      return NextResponse.json({ error: 'Токен WB API не найден' }, { status: 400 });
    }

    const apiToken = cabinet.apiToken;
    const subjectId = product.subcategory?.wbSubjectId;
    const categoryName = product.subcategory?.name || 'Неизвестная категория';

    console.log(`📂 [Category Insights] Категория: ${categoryName} (ID: ${subjectId})`);

    // Проверяем есть ли у товара история
    const hasHistory = product.wbNmId && product.status === 'PUBLISHED';
    
    if (!hasHistory) {
      console.log(`🆕 [Category Insights] Товар новый, без истории продаж`);
      console.log(`📊 [Category Insights] Получаем данные по категории...`);
    }

    // Получаем данные параллельно
    const [
      categorySearchQueries,
      competitorAnalysis,
      categoryTrends
    ] = await Promise.allSettled([
      fetchCategorySearchQueries(apiToken, subjectId ?? undefined, categoryName),
      fetchCompetitorAnalysis(apiToken, subjectId ?? undefined, product),
      fetchCategoryTrends(apiToken, subjectId ?? undefined)
    ]);

    // Формируем рекомендации
    const recommendations = generateRecommendations(
      categorySearchQueries.status === 'fulfilled' ? categorySearchQueries.value : null,
      competitorAnalysis.status === 'fulfilled' ? competitorAnalysis.value : null,
      categoryTrends.status === 'fulfilled' ? categoryTrends.value : null,
      product
    );

    return NextResponse.json({
      success: true,
      productId: product.id,
      isNewProduct: !hasHistory,
      category: {
        id: subjectId,
        name: categoryName
      },
      insights: {
        searchQueries: categorySearchQueries.status === 'fulfilled' ? categorySearchQueries.value : null,
        competitors: competitorAnalysis.status === 'fulfilled' ? competitorAnalysis.value : null,
        trends: categoryTrends.status === 'fulfilled' ? categoryTrends.value : null
      },
      recommendations: recommendations,
      errors: {
        searchQueries: categorySearchQueries.status === 'rejected' ? categorySearchQueries.reason?.message : null,
        competitors: competitorAnalysis.status === 'rejected' ? competitorAnalysis.reason?.message : null,
        trends: categoryTrends.status === 'rejected' ? categoryTrends.reason?.message : null
      }
    });

  } catch (error) {
    console.error('❌ [Category Insights] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка получения инсайтов категории' },
      { status: 500 }
    );
  }
}

// Получает топ поисковые запросы по категории
async function fetchCategorySearchQueries(apiToken: string, subjectId: number | undefined, categoryName: string) {
  if (!subjectId) {
    console.log(`⚠️ [Category Insights] Нет ID категории, используем поиск по названию`);
    // Можно попробовать поиск по названию категории
    return {
      method: 'name_search',
      categoryName: categoryName,
      queries: []
    };
  }

  console.log(`🔍 [Category Search] Запрос топ запросов для категории ${subjectId}`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Используем поиск по всей категории (без конкретного nmId)
  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/v2/search-report/report',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        subjectIds: [subjectId],
        topOrderBy: 'orders',
        limit: 50,
        includeSearchTexts: true
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ [Category Search] Ошибка ${response.status}: ${errorText}`);
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ [Category Search] Получено запросов: ${data.data?.items?.length || 0}`);
  
  return {
    method: 'subject_search',
    subjectId: subjectId,
    queries: data.data?.items || [],
    topQueries: (data.data?.items || []).slice(0, 20) // Топ-20 запросов
  };
}

// Анализирует конкурентов в категории
async function fetchCompetitorAnalysis(apiToken: string, subjectId: number | undefined, product: any) {
  if (!subjectId) {
    return { competitors: [], message: 'Нет ID категории для анализа конкурентов' };
  }

  console.log(`🎯 [Competitor Analysis] Поиск конкурентов в категории ${subjectId}`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  // Получаем топ товары в категории
  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selectedPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        pastPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        subjectIds: [subjectId],
        orderBy: {
          field: 'orderCount',
          mode: 'desc'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ [Competitor Analysis] Ошибка ${response.status}: ${errorText}`);
    throw new Error(`WB API error: ${response.status}`);
  }

  const data = await response.json();
  const products = data.data?.products || [];
  
  console.log(`✅ [Competitor Analysis] Найдено товаров в категории: ${products.length}`);
  
  // Анализируем топ-10 конкурентов
  const topCompetitors = products.slice(0, 10).map((p: any) => ({
    nmId: p.product?.nmId,
    title: p.product?.title,
    price: p.statistic?.selected?.avgPrice || 0,
    orders: p.statistic?.selected?.orderCount || 0,
    views: p.statistic?.selected?.openCount || 0,
    conversion: p.statistic?.selected?.conversions?.addToCartPercent || 0,
    rating: p.product?.productRating || 0
  }));

  // Средние показатели по категории
  const avgPrice = topCompetitors.reduce((sum: number, c: any) => sum + c.price, 0) / topCompetitors.length;
  const avgConversion = topCompetitors.reduce((sum: number, c: any) => sum + c.conversion, 0) / topCompetitors.length;
  const avgRating = topCompetitors.reduce((sum: number, c: any) => sum + c.rating, 0) / topCompetitors.length;

  return {
    topCompetitors,
    categoryAverages: {
      avgPrice: Math.round(avgPrice),
      avgConversion: parseFloat(avgConversion.toFixed(2)),
      avgRating: parseFloat(avgRating.toFixed(1))
    }
  };
}

// Получает тренды в категории
async function fetchCategoryTrends(apiToken: string, subjectId: number | undefined) {
  if (!subjectId) {
    return { trends: [], message: 'Нет ID категории для анализа трендов' };
  }

  console.log(`📈 [Category Trends] Анализ трендов категории ${subjectId}`);
  
  // Получаем данные за последние 4 недели
  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (i * 7));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    
    weeks.push({
      week: 4 - i,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }

  // Запрашиваем данные для каждой недели
  const weeklyData = [];
  for (const week of weeks) {
    try {
      const response = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            selectedPeriod: {
              start: week.startDate,
              end: week.endDate
            },
            pastPeriod: {
              start: week.startDate,
              end: week.endDate
            },
            subjectIds: [subjectId],
            orderBy: {
              field: 'orderCount',
              mode: 'desc'
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const products = data.data?.products || [];
        
        // Агрегируем данные по неделе
        const totalOrders = products.reduce((sum: number, p: any) => 
          sum + (p.statistic?.selected?.orderCount || 0), 0
        );
        const totalViews = products.reduce((sum: number, p: any) => 
          sum + (p.statistic?.selected?.openCount || 0), 0
        );
        
        weeklyData.push({
          week: week.week,
          totalOrders,
          totalViews,
          avgConversion: totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(2) : '0'
        });
      }
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`⚠️ [Category Trends] Ошибка для недели ${week.week}`);
    }
  }

  console.log(`✅ [Category Trends] Получено данных за ${weeklyData.length} недель`);
  
  return {
    weeklyData,
    trend: weeklyData.length >= 2 
      ? weeklyData[weeklyData.length - 1].totalOrders > weeklyData[0].totalOrders 
        ? 'growing' 
        : 'declining'
      : 'stable'
  };
}

// Генерирует рекомендации на основе анализа
function generateRecommendations(
  searchQueries: any,
  competitors: any,
  trends: any,
  product: any
) {
  const recommendations = [];

  // 1. Рекомендации по ключевым словам
  if (searchQueries?.topQueries && searchQueries.topQueries.length > 0) {
    const topKeywords = searchQueries.topQueries.slice(0, 10).map((q: any) => q.text || q.searchText);
    recommendations.push({
      type: 'keywords',
      priority: 'high',
      title: 'Используйте популярные запросы категории',
      description: `Добавьте эти ключевые слова в название и описание товара`,
      keywords: topKeywords,
      action: 'Обновите SEO товара с этими запросами'
    });
  }

  // 2. Рекомендации по цене
  if (competitors?.categoryAverages?.avgPrice) {
    const currentPrice = product.price || 0;
    const avgPrice = competitors.categoryAverages.avgPrice;
    
    if (currentPrice === 0) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        title: 'Установите конкурентную цену',
        description: `Средняя цена в категории: ${avgPrice}₽`,
        suggestedPrice: avgPrice,
        priceRange: {
          min: Math.round(avgPrice * 0.8),
          max: Math.round(avgPrice * 1.2)
        },
        action: `Установите цену в диапазоне ${Math.round(avgPrice * 0.8)}-${Math.round(avgPrice * 1.2)}₽`
      });
    } else if (currentPrice > avgPrice * 1.3) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        title: 'Цена выше среднего по категории',
        description: `Ваша цена ${currentPrice}₽ выше средней ${avgPrice}₽ на ${Math.round(((currentPrice - avgPrice) / avgPrice) * 100)}%`,
        suggestedPrice: avgPrice,
        action: 'Рассмотрите снижение цены для конкурентоспособности'
      });
    }
  }

  // 3. Рекомендации по конверсии
  if (competitors?.categoryAverages?.avgConversion) {
    recommendations.push({
      type: 'conversion',
      priority: 'medium',
      title: 'Целевая конверсия категории',
      description: `Средняя конверсия в категории: ${competitors.categoryAverages.avgConversion}%`,
      targetConversion: competitors.categoryAverages.avgConversion,
      action: 'Стремитесь к этому показателю через качественные фото и описание'
    });
  }

  // 4. Рекомендации по трендам
  if (trends?.trend) {
    const trendMessages = {
      growing: 'Категория растет! Хорошее время для запуска товара',
      declining: 'Категория в спаде. Усильте маркетинг и уникальное предложение',
      stable: 'Категория стабильна. Фокус на качестве и отзывах'
    };
    
    recommendations.push({
      type: 'trends',
      priority: 'low',
      title: `Тренд категории: ${trends.trend}`,
      description: trendMessages[trends.trend as keyof typeof trendMessages],
      weeklyData: trends.weeklyData,
      action: trends.trend === 'growing' ? 'Запускайте рекламу активно' : 'Фокус на органическом продвижении'
    });
  }

  // 5. Общие рекомендации для нового товара
  if (!product.wbNmId) {
    recommendations.push({
      type: 'general',
      priority: 'high',
      title: 'Подготовка к запуску',
      description: 'Товар еще не опубликован на WB',
      checklist: [
        'Добавьте минимум 5 качественных фото',
        'Заполните все характеристики категории',
        'Используйте ключевые слова из топ-запросов',
        'Установите конкурентную цену',
        'Подготовьте остатки минимум на 2 недели продаж'
      ],
      action: 'Завершите подготовку перед публикацией'
    });
  }

  return recommendations;
}
