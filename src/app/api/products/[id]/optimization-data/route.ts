// API Router для получения всех данных оптимизации товара с WB
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 [Optimization Data] Запрос для товара: ${params.id}`);
    
    // Получаем параметры периода из query
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30; // По умолчанию 30 дней
    
    console.log(`📅 [Optimization Data] Запрошен период: ${days} дней`);
    
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      console.log('❌ [Optimization Data] Пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    console.log(`✅ [Optimization Data] Пользователь: ${user.email}`);

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        productCabinets: {
          include: {
            cabinet: true
          }
        }
      }
    });

    if (!product) {
      console.log(`❌ [Optimization Data] Товар не найден: ${params.id}`);
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    console.log(`📦 [Optimization Data] Товар найден: ${product.name} (nmID: ${product.wbNmId})`);
    console.log(`🔗 [Optimization Data] Привязок к кабинетам: ${product.productCabinets?.length || 0}`);

    const cabinet = product.productCabinets?.[0]?.cabinet;
    if (!cabinet?.apiToken) {
      console.log(`❌ [Optimization Data] Токен WB API не найден`);
      console.log(`   Кабинет: ${cabinet ? cabinet.name : 'не привязан'}`);
      console.log(`   Токен: ${cabinet?.apiToken ? 'есть' : 'отсутствует'}`);
      return NextResponse.json({ error: 'Токен WB API не найден' }, { status: 400 });
    }

    console.log(`✅ [Optimization Data] Кабинет: ${cabinet.name}, токен найден`);

    if (!product.wbNmId) {
      console.log(`❌ [Optimization Data] Товар не опубликован на WB`);
      return NextResponse.json({ error: 'Товар не опубликован на WB' }, { status: 400 });
    }

    const apiToken = cabinet.apiToken;
    const nmId = parseInt(product.wbNmId);

    console.log(`🚀 [Optimization Data] Запрос данных для nmID: ${nmId}`);

    // Получаем все данные параллельно
    const [
      searchQueries,
      conversionData,
      campaignStats,
      salesFunnel,
      keywordStats
    ] = await Promise.allSettled([
      fetchSearchQueries(apiToken, nmId),
      fetchConversionData(apiToken, nmId),
      fetchCampaignStats(apiToken, nmId),
      fetchSalesFunnel(apiToken, nmId),
      fetchKeywordStats(apiToken, nmId)
    ]);

    // Логируем результаты
    console.log(`📊 [Optimization Data] Результаты запросов:`);
    console.log(`   🔍 Поисковые запросы: ${searchQueries.status === 'fulfilled' ? '✅' : '❌'}`);
    if (searchQueries.status === 'rejected') {
      console.log(`      Ошибка: ${searchQueries.reason?.message}`);
    }
    console.log(`   📊 Конверсия: ${conversionData.status === 'fulfilled' ? '✅' : '❌'}`);
    if (conversionData.status === 'rejected') {
      console.log(`      Ошибка: ${conversionData.reason?.message}`);
    }
    console.log(`   📢 Кампании: ${campaignStats.status === 'fulfilled' ? '✅' : '❌'}`);
    if (campaignStats.status === 'rejected') {
      console.log(`      Ошибка: ${campaignStats.reason?.message}`);
    }
    console.log(`   🛒 Воронка: ${salesFunnel.status === 'fulfilled' ? '✅' : '❌'}`);
    if (salesFunnel.status === 'rejected') {
      console.log(`      Ошибка: ${salesFunnel.reason?.message}`);
    }
    console.log(`   🔑 Ключевые слова: ${keywordStats.status === 'fulfilled' ? '✅' : '❌'}`);
    if (keywordStats.status === 'rejected') {
      console.log(`      Ошибка: ${keywordStats.reason?.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        nmId: product.wbNmId,
        searchQueries: searchQueries.status === 'fulfilled' ? searchQueries.value : null,
        conversion: conversionData.status === 'fulfilled' ? conversionData.value : null,
        campaigns: campaignStats.status === 'fulfilled' ? campaignStats.value : null,
        salesFunnel: salesFunnel.status === 'fulfilled' ? salesFunnel.value : null,
        keywords: keywordStats.status === 'fulfilled' ? keywordStats.value : null,
        errors: {
          searchQueries: searchQueries.status === 'rejected' ? searchQueries.reason?.message : null,
          conversion: conversionData.status === 'rejected' ? conversionData.reason?.message : null,
          campaigns: campaignStats.status === 'rejected' ? campaignStats.reason?.message : null,
          salesFunnel: salesFunnel.status === 'rejected' ? salesFunnel.reason?.message : null,
          keywords: keywordStats.status === 'rejected' ? keywordStats.reason?.message : null
        }
      }
    });

  } catch (error) {
    console.error('❌ [Optimization Data] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка получения данных оптимизации' },
      { status: 500 }
    );
  }
}

// Функция получения поисковых запросов
async function fetchSearchQueries(apiToken: string, nmId: number) {
  console.log(`🔍 [Search Queries] Запрос для nmID: ${nmId}`);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/v2/search-report/product/search-texts',
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
        nmIds: [nmId],
        topOrderBy: 'orders',
        limit: 30,
        includeSubstitutedSKUs: true,
        includeSearchTexts: true,
        orderBy: {
          field: 'avgPosition',
          mode: 'asc'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ [Search Queries] Ошибка ${response.status}: ${errorText}`);
    throw new Error(`WB API error: ${response.status}`);
  }

  console.log(`✅ [Search Queries] Данные получены`);
  return await response.json();
}

// Функция получения данных конверсии
async function fetchConversionData(apiToken: string, nmId: number) {
  console.log(`📊 [Conversion] Запрос для nmID: ${nmId}`);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const pastEndDate = new Date(startDate);
  pastEndDate.setDate(pastEndDate.getDate() - 1);
  const pastStartDate = new Date(pastEndDate);
  pastStartDate.setDate(pastStartDate.getDate() - 30);

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
          start: pastStartDate.toISOString().split('T')[0],
          end: pastEndDate.toISOString().split('T')[0]
        },
        nmIds: [nmId],
        orderBy: {
          field: 'openCard',
          mode: 'desc'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ [Conversion] Ошибка ${response.status}: ${errorText}`);
    throw new Error(`WB API error: ${response.status}`);
  }

  console.log(`✅ [Conversion] Данные получены`);
  return await response.json();
}

// Функция получения статистики кампаний
async function fetchCampaignStats(apiToken: string, nmId: number) {
  console.log(`📢 [Campaign Stats] Запрос для nmID: ${nmId}`);
  
  // Сначала получаем количество кампаний
  const countResponse = await fetch(
    'https://advert-api.wildberries.ru/adv/v1/promotion/count',
    {
      method: 'GET',
      headers: {
        'Authorization': apiToken
      }
    }
  );

  if (!countResponse.ok) {
    const errorText = await countResponse.text();
    console.log(`❌ [Campaign Stats] Ошибка получения количества: ${countResponse.status}: ${errorText}`);
    throw new Error(`WB API error: ${countResponse.status}`);
  }

  const countData = await countResponse.json();
  console.log(`📊 [Campaign Stats] Всего кампаний: ${countData.all || 0}`);

  if (!countData.all || countData.all === 0) {
    console.log(`ℹ️ [Campaign Stats] Нет кампаний`);
    return { campaigns: [], message: 'Нет рекламных кампаний' };
  }

  // Получаем список всех кампаний через правильный endpoint
  const campaignsResponse = await fetch(
    'https://advert-api.wildberries.ru/adv/v1/promotion/adverts',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([])
    }
  );

  if (!campaignsResponse.ok) {
    const errorText = await campaignsResponse.text();
    console.log(`❌ [Campaign Stats] Ошибка получения кампаний ${campaignsResponse.status}: ${errorText}`);
    throw new Error(`WB API error: ${campaignsResponse.status}`);
  }

  const campaigns = await campaignsResponse.json();
  console.log(`📊 [Campaign Stats] Получено кампаний: ${campaigns.length}`);
  
  // Фильтруем кампании с нашим товаром
  const relevantCampaigns = campaigns.filter((c: any) => {
    // Проверяем autoParams.nms
    const nms = c.autoParams?.nms || [];
    return nms.includes(nmId);
  });

  console.log(`🎯 [Campaign Stats] Кампаний с товаром ${nmId}: ${relevantCampaigns.length}`);

  if (relevantCampaigns.length === 0) {
    return { campaigns: [], message: 'Нет активных кампаний для товара' };
  }

  // Получаем статистику для каждой кампании
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Вчера
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29); // 30 дней

  const campaignIds = relevantCampaigns.map((c: any) => c.advertId);
  const from = startDate.toISOString().split('T')[0];
  const to = endDate.toISOString().split('T')[0];

  console.log(`📅 [Campaign Stats] Период: ${from} - ${to}, IDs: ${campaignIds.join(',')}`);

  const statsResponse = await fetch(
    'https://advert-api.wildberries.ru/adv/v3/fullstats',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignIds.map((id: number) => ({
        id: id,
        dates: {
          from: from,
          to: to
        }
      })))
    }
  );

  if (!statsResponse.ok) {
    const errorText = await statsResponse.text();
    console.log(`❌ [Campaign Stats] Ошибка статистики ${statsResponse.status}: ${errorText}`);
    throw new Error(`WB API error: ${statsResponse.status}`);
  }

  console.log(`✅ [Campaign Stats] Статистика получена`);
  return await statsResponse.json();
}

// Функция получения воронки продаж
async function fetchSalesFunnel(apiToken: string, nmId: number) {
  console.log(`🛒 [Sales Funnel] Запрос для nmID: ${nmId}`);
  // WB API позволяет максимум 7 дней для history endpoint
  // Используем вчерашний день как конец периода
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Вчера
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 7 дней (включая оба конца)

  console.log(`📅 [Sales Funnel] Период: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

  const response = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history',
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
        nmIds: [nmId],
        skipDeletedNm: true,
        aggregationLevel: 'day'
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ [Sales Funnel] Ошибка ${response.status}: ${errorText}`);
    throw new Error(`WB API error: ${response.status}`);
  }

  console.log(`✅ [Sales Funnel] Данные получены`);
  return await response.json();
}

// Функция получения статистики по ключевым словам
async function fetchKeywordStats(apiToken: string, nmId: number) {
  console.log(`🔑 [Keyword Stats] Запрос для nmID: ${nmId}`);
  
  // Сначала получаем кампании через правильный endpoint
  const campaignsResponse = await fetch(
    'https://advert-api.wildberries.ru/adv/v1/promotion/adverts',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([])
    }
  );

  if (!campaignsResponse.ok) {
    const errorText = await campaignsResponse.text();
    console.log(`❌ [Keyword Stats] Ошибка получения кампаний ${campaignsResponse.status}: ${errorText}`);
    throw new Error(`WB API error: ${campaignsResponse.status}`);
  }

  const campaigns = await campaignsResponse.json();
  console.log(`📊 [Keyword Stats] Получено кампаний: ${campaigns.length}`);
  
  // Фильтруем кампании с нашим товаром
  const relevantCampaigns = campaigns.filter((c: any) => {
    const nms = c.autoParams?.nms || [];
    return nms.includes(nmId);
  });

  console.log(`🎯 [Keyword Stats] Кампаний с товаром ${nmId}: ${relevantCampaigns.length}`);

  if (relevantCampaigns.length === 0) {
    return { keywords: [], message: 'Нет кампаний для анализа ключевых слов' };
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Вчера
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29); // 30 дней

  // Получаем статистику по ключевым фразам для каждой кампании
  const keywordPromises = relevantCampaigns.map(async (campaign: any) => {
    try {
      const from = startDate.toISOString().split('T')[0];
      const to = endDate.toISOString().split('T')[0];
      
      console.log(`🔑 [Keyword Stats] Запрос для кампании ${campaign.advertId}`);
      
      const response = await fetch(
        'https://advert-api.wildberries.ru/adv/v0/normquery/stats',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: campaign.advertId,
            dates: {
              from: from,
              to: to
            }
          })
        }
      );

      if (response.ok) {
        console.log(`✅ [Keyword Stats] Данные получены для кампании ${campaign.advertId}`);
        return await response.json();
      } else {
        const errorText = await response.text();
        console.log(`❌ [Keyword Stats] Ошибка ${response.status} для кампании ${campaign.advertId}: ${errorText}`);
      }
      return null;
    } catch (error) {
      console.log(`❌ [Keyword Stats] Exception для кампании ${campaign.advertId}:`, error);
      return null;
    }
  });

  const keywordResults = await Promise.all(keywordPromises);
  const validResults = keywordResults.filter(r => r !== null);
  console.log(`✅ [Keyword Stats] Получено результатов: ${validResults.length}`);
  return validResults;
}
