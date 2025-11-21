// УМНАЯ система получения данных оптимизации
// Ищет данные в прошлом пока не найдет период с активностью
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🧠 [Smart Optimization] Умный поиск данных для товара: ${params.id}`);
    
    // Проверяем внутренний запрос
    const isInternalRequest = request.headers.get('x-internal-request') === 'true';
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    let user;
    
    if (isInternalRequest && cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Внутренний запрос - пропускаем проверку пользователя
      console.log(`🔓 [Smart Optimization] Внутренний запрос - пропускаем авторизацию`);
    } else {
      // Обычный запрос - проверяем пользователя
      user = await AuthService.getCurrentUser();
      if (!user?.id) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        ...(user?.id && { userId: user.id })
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

    if (!product.wbNmId) {
      return NextResponse.json({ error: 'Товар не опубликован на WB' }, { status: 400 });
    }

    const apiToken = cabinet.apiToken;
    const nmId = parseInt(product.wbNmId);
    const subjectId = product.subcategory?.wbSubjectId;
    const categoryName = product.subcategory?.name;

    console.log(`📊 [Smart Optimization] Товар: ${nmId}, Категория: ${categoryName || 'не указана'} (${subjectId || 'N/A'})`);

    // СТРАТЕГИЯ: Ищем данные пока не найдем
    const maxWeeksBack = 24; // Максимум 6 месяцев назад (до начала продаж)
    const targetDataPoints = 60; // Цель: 60 дней данных
    const minDataPoints = 14; // Минимум 2 недели данных для остановки
    
    let collectedData = {
      searchQueries: [] as any[],
      conversionData: [] as any[],
      campaignStats: [] as any[],
      salesFunnel: [] as any[],
      keywordStats: [] as any[],
      salesDetails: [] as any[], // Детальные данные о продажах
      searchQueryOrders: [] as any[]
    };

    let weeksSearched = 0;
    let totalDataPoints = 0;

    console.log(`🔍 [Smart Optimization] Начинаем поиск данных (цель: ${targetDataPoints} дней)`);

    // Получаем ВСЕ кампании один раз (не в каждой неделе!)
    const allCampaigns = await fetchAllCampaigns(apiToken);
    
    // Получаем статистику кампаний ОДИН РАЗ за весь период (максимум 31 день по API)
    console.log(`\n🎯 [Smart Optimization] Запрашиваем глобальную статистику кампаний...`);
    const campaignStatsGlobal = await fetchCampaignStatsOnce(apiToken, nmId, subjectId, allCampaigns);
    console.log(`✅ [Smart Optimization] Глобальная статистика получена: ${campaignStatsGlobal.length} кампаний`);

    // Ищем данные неделя за неделей назад
    while (weeksSearched < maxWeeksBack && totalDataPoints < targetDataPoints) {
      const weekOffset = weeksSearched;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (weekOffset * 7) - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 дней

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`\n📅 [Smart Optimization] Неделя ${weeksSearched + 1}: ${startDateStr} - ${endDateStr}`);

      try {
        // Получаем данные за эту неделю
        const weekData = await fetchWeekData(
          apiToken,
          nmId,
          subjectId,
          startDateStr,
          endDateStr,
          allCampaigns, // Передаем все кампании
          campaignStatsGlobal // Передаем глобальную статистику
        );

        // Логируем RAW данные для отладки
        console.log(`   📦 RAW данные:`, {
          searchQueries: weekData.searchQueries?.length || 0,
          conversionOrders: weekData.conversionData?.statistic?.selected?.orderCount || 0,
          conversionViews: weekData.conversionData?.statistic?.selected?.openCount || 0,
          funnelDays: weekData.salesFunnel?.history?.length || 0,
          campaigns: weekData.campaignStats?.length || 0
        });

        // Проверяем есть ли активность
        const hasActivity = checkHasActivity(weekData);
        
        if (hasActivity) {
          console.log(`✅ [Smart Optimization] Найдена активность в неделе ${weeksSearched + 1}`);
          
          // Добавляем данные
          if (weekData.searchQueries?.length > 0) {
            collectedData.searchQueries.push(...weekData.searchQueries);
          }
          if (weekData.conversionData) {
            collectedData.conversionData.push(weekData.conversionData);
          }
          if (weekData.campaignStats?.length > 0) {
            collectedData.campaignStats.push(...weekData.campaignStats);
          }
          if (weekData.salesFunnel) {
            collectedData.salesFunnel.push(weekData.salesFunnel);
          }
          if (weekData.keywordStats?.length > 0) {
            collectedData.keywordStats.push(...weekData.keywordStats);
          }
          if (weekData.salesDetails?.length > 0) {
            collectedData.salesDetails.push(...weekData.salesDetails);
          }
          if (weekData.searchQueryOrders?.length > 0) {
            collectedData.searchQueryOrders.push(...weekData.searchQueryOrders);
          }
          
          totalDataPoints += 7;
          
          // Если собрали достаточно данных - можем остановиться
          if (totalDataPoints >= minDataPoints) {
            console.log(`✅ [Smart Optimization] Собрано достаточно данных (${totalDataPoints} дней), можно остановиться`);
          }
        } else {
          console.log(`⚠️ [Smart Optimization] Нет активности в неделе ${weeksSearched + 1}`);
        }

      } catch (error: any) {
        console.log(`❌ [Smart Optimization] Ошибка в неделе ${weeksSearched + 1}: ${error.message}`);
      }

      weeksSearched++;
      
      // Задержка между запросами (увеличена для избежания 429)
      if (weeksSearched < maxWeeksBack && totalDataPoints < targetDataPoints) {
        await new Promise(resolve => setTimeout(resolve, 8000)); // 8 секунд для избежания rate limit
      }
    }

    console.log(`\n📊 [Smart Optimization] Поиск завершен:`);
    console.log(`   Недель проверено: ${weeksSearched}`);
    console.log(`   Дней данных собрано: ${totalDataPoints}`);

    // Если не нашли данные для товара - ищем по категории
    if (totalDataPoints === 0 && subjectId) {
      console.log(`\n🔄 [Smart Optimization] Нет данных для товара, ищем по категории...`);
      
      const categoryData = await fetchCategoryData(apiToken, subjectId, nmId);
      
      return NextResponse.json({
        success: true,
        strategy: 'category',
        message: 'Данные получены из анализа категории (товар не имеет собственной истории)',
        productId: product.id,
        nmId: product.wbNmId,
        category: {
          id: subjectId,
          name: categoryName
        },
        data: categoryData,
        weeksSearched: weeksSearched,
        dataPoints: 0
      });
    }

    // Агрегируем собранные данные
    console.log(`\n📊 [Smart Optimization] Агрегация и оптимизация данных:`);
    console.log(`   До дедупликации: ${collectedData.searchQueries.length} поисковых запросов`);
    
    // Подсчитываем сырые данные кампаний
    let rawCampaignCount = 0;
    collectedData.campaignStats.forEach((stats: any) => {
      if (Array.isArray(stats)) {
        rawCampaignCount += stats.length;
      } else if (stats) {
        rawCampaignCount += 1;
      }
    });
    console.log(`   Сырых данных кампаний: ${rawCampaignCount} записей из ${collectedData.campaignStats.length} недель`);
    
    const aggregated = aggregateCollectedData(collectedData);
    
    console.log(`   После дедупликации: ${aggregated.searchQueries.total} уникальных запросов`);
    console.log(`   ✂️ Оптимизировано для AI: топ-${aggregated.searchQueries.topQueries.length} запросов (вместо ${aggregated.searchQueries.total})`);
    console.log(`   Удалено дубликатов запросов: ${collectedData.searchQueries.length - aggregated.searchQueries.total}`);
    console.log(`   Уникальных кампаний: ${aggregated.campaigns.total}`);

    // Получаем кампании для этого товара
    console.log(`\n🎯 [Smart Optimization] Получение кампаний товара...`);
    const productCampaigns = await getCampaignsForProduct(apiToken, nmId, subjectId);

    return NextResponse.json({
      success: true,
      strategy: 'historical',
      message: `Данные собраны за ${totalDataPoints} дней из ${weeksSearched} недель`,
      productId: product.id,
      nmId: product.wbNmId,
      weeksSearched: weeksSearched,
      dataPoints: totalDataPoints,
      data: aggregated,
      productCampaigns: productCampaigns, // Добавляем кампании товара
      rawData: collectedData
    });

  } catch (error) {
    console.error('❌ [Smart Optimization] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка получения данных оптимизации' },
      { status: 500 }
    );
  }
}

// Получает ВСЕ кампании один раз (чтобы не запрашивать в каждой неделе)
async function fetchAllCampaigns(apiToken: string) {
  const allCampaigns: any[] = [];
  
  try {
    console.log(`🔍 [Campaigns] Запрос ВСЕХ кампаний через /promotion/count...`);
    
    // Используем AbortController для контроля таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
    
    const countResponse = await fetch(
      'https://advert-api.wildberries.ru/adv/v1/promotion/count',
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId));
    
    if (!countResponse.ok) {
      const errorText = await countResponse.text();
      console.log(`❌ [Campaigns] HTTP ${countResponse.status}: ${errorText}`);
      return allCampaigns; // Возвращаем пустой массив
    }
    
    if (countResponse.ok) {
      const countData = await countResponse.json();
      const campaignIds: number[] = [];
      const type9Ids: number[] = [];
      
      // Собираем все ID кампаний из всех групп
      if (countData.adverts && Array.isArray(countData.adverts)) {
        countData.adverts.forEach((group: any) => {
          const groupType = group.type;
          if (group.advert_list && Array.isArray(group.advert_list)) {
            group.advert_list.forEach((adv: any) => {
              if (adv.advertId) {
                if (groupType === 9) {
                  type9Ids.push(adv.advertId);
                } else {
                  campaignIds.push(adv.advertId);
                }
              }
            });
          }
        });
      }
      
      console.log(`✅ [Campaigns] Получено ID: ${campaignIds.length} (тип 4-8), ${type9Ids.length} (тип 9), всего: ${countData.all || 0}`);
      
      // 1. Получаем кампании с типом 4-8
      if (campaignIds.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < campaignIds.length; i += batchSize) {
          const batch = campaignIds.slice(i, i + batchSize);
          
          try {
            const detailsResponse = await fetch(
              'https://advert-api.wildberries.ru/adv/v1/promotion/adverts',
              {
                method: 'POST',
                headers: {
                  'Authorization': apiToken,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(batch)
              }
            );
            
            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              if (Array.isArray(details)) {
                allCampaigns.push(...details);
              }
            }
            
            if (i + batchSize < campaignIds.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (err: any) {
            console.log(`⚠️ [Campaigns] Ошибка батча ${Math.floor(i / batchSize) + 1}: ${err.message}`);
          }
        }
      }
      
      // 2. Получаем кампании с типом 9 (ручная ставка)
      if (type9Ids.length > 0) {
        try {
          const auctionResponse = await fetch(
            `https://advert-api.wildberries.ru/adv/v0/auction/adverts?ids=${type9Ids.join(',')}&statuses=-1,4,7,8,9,11`,
            {
              method: 'GET',
              headers: {
                'Authorization': apiToken,
                'Accept': 'application/json'
              }
            }
          );
          
          if (auctionResponse.ok) {
            const auctionData = await auctionResponse.json();
            const auctionAdverts = auctionData.adverts || [];
            
            // Нормализуем формат
            const normalizedAuction = auctionAdverts.map((adv: any) => ({
              advertId: adv.id,
              name: adv.settings?.name || 'Без названия',
              status: adv.status,
              type: 9,
              paymentType: adv.settings?.payment_type || 'cpc',
              startTime: adv.timestamps?.started,
              endTime: adv.timestamps?.deleted,
              createTime: adv.timestamps?.created,
              changeTime: adv.timestamps?.updated,
              autoParams: {
                nms: adv.nm_settings?.map((nm: any) => nm.nm_id) || [],
                subject: adv.nm_settings?.[0]?.subject || null
              }
            }));
            
            allCampaigns.push(...normalizedAuction);
          }
        } catch (err: any) {
          console.log(`⚠️ [Campaigns] Ошибка получения типа 9: ${err.message}`);
        }
      }
      
      console.log(`✅ [Campaigns] Всего загружено: ${allCampaigns.length} кампаний`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`❌ [Campaigns] Таймаут: запрос превысил 30 секунд`);
    } else if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.log(`❌ [Campaigns] Таймаут подключения к advert-api.wildberries.ru`);
      console.log(`💡 [Campaigns] Возможные причины: проблемы с интернетом, VPN, файрвол, или WB API недоступен`);
    } else {
      console.log(`❌ [Campaigns] Ошибка: ${error.message}`);
      console.log(`❌ [Campaigns] Детали ошибки:`, error);
    }
    // Возвращаем пустой массив, чтобы система продолжила работу без кампаний
  }
  
  return allCampaigns;
}

// Получает статистику кампаний ОДИН РАЗ за весь период существования (максимум 31 день по API)
async function fetchCampaignStatsOnce(
  apiToken: string,
  nmId: number,
  subjectId: number | null | undefined,
  allCampaigns: any[]
) {
  const campaignStats: any[] = [];
  
  if (allCampaigns.length === 0) {
    console.log(`\n📊 [Campaign Stats] Нет кампаний для запроса статистики`);
    return campaignStats;
  }
  
  // Фильтруем релевантные кампании (с нашим товаром или категорией)
  const relevantCampaigns = allCampaigns.filter((c: any) => {
    const nms = c.autoParams?.nms || [];
    const campaignSubjectId = c.autoParams?.subject?.id;
    const hasOurProduct = nms.includes(nmId);
    const subjectMatch = subjectId && campaignSubjectId === subjectId;
    
    return hasOurProduct || subjectMatch;
  });
  
  // Логируем статусы всех релевантных кампаний
  console.log(`\n📊 [Campaign Stats] Статусы релевантных кампаний:`);
  relevantCampaigns.forEach((c: any) => {
    const statusLabels: Record<number, string> = {
      4: 'готова к запуску',
      7: 'завершена',
      9: 'активна ✅',
      11: 'на паузе ⏸️'
    };
    const statusLabel = statusLabels[c.status] || `неизвестен (${c.status})`;
    console.log(`   🔍 Кампания ${c.advertId}: статус=${c.status} (${statusLabel}), тип=${c.type}`);
  });
  
  if (relevantCampaigns.length === 0) {
    console.log(`\n📊 [Campaign Stats] Нет релевантных кампаний`);
    return campaignStats;
  }
  
  // Используем /adv/v3/fullstats для получения статистики (работает для статусов 7, 9, 11)
  const endDate = new Date();
  const maxDaysBack = 31; // v3/fullstats поддерживает максимум 31 день
  
  console.log(`\n📊 [Campaign Stats] Запрос статистики через /adv/v3/fullstats для ${relevantCampaigns.length} кампаний`);
  
  // Фильтруем только активные кампании (статус 9) и завершенные (статус 7)
  // Статус 11 (пауза) может не работать с v3/fullstats
  const activeCampaigns = relevantCampaigns.filter((c: any) => c.status === 9 || c.status === 7);
  const pausedCampaigns = relevantCampaigns.filter((c: any) => c.status === 11);
  
  if (pausedCampaigns.length > 0) {
    console.log(`   ⚠️ Пропускаем ${pausedCampaigns.length} кампаний на паузе (статус 11): ${pausedCampaigns.map((c: any) => c.advertId).join(', ')}`);
  }
  
  if (activeCampaigns.length === 0) {
    console.log(`   ⚠️ Нет активных или завершенных кампаний для запроса статистики`);
    return campaignStats;
  }
  
  // Определяем период для каждой кампании (с даты создания до сегодня, максимум 31 день)
  // Находим самую раннюю дату создания среди активных кампаний
  let earliestDate = new Date();
  activeCampaigns.forEach((c: any) => {
    const createDate = new Date(c.createTime || c.startTime || endDate);
    console.log(`   📅 Кампания ${c.advertId}: создана ${createDate.toISOString().split('T')[0]}`);
    if (createDate < earliestDate) {
      earliestDate = createDate;
    }
  });
  
  // Ограничиваем максимум 31 днем назад
  const minAllowedDate = new Date();
  minAllowedDate.setDate(minAllowedDate.getDate() - maxDaysBack);
  
  const startDate = earliestDate < minAllowedDate ? minAllowedDate : earliestDate;
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Собираем ID только активных/завершенных кампаний
  const campaignIds = activeCampaigns.map((c: any) => c.advertId).join(',');
  
  console.log(`   📅 Период: ${startDateStr}..${endDateStr} (с даты создания кампаний, макс 31 день)`);
  console.log(`   🎯 Кампании: ${campaignIds}`);
  
  try {
    const v3Url = `https://advert-api.wildberries.ru/adv/v3/fullstats?ids=${campaignIds}&beginDate=${startDateStr}&endDate=${endDateStr}`;
    
    // Retry логика для обработки 429
    let retryCount = 0;
    const maxRetries = 3;
    let v3Response: Response | null = null;
    
    while (retryCount <= maxRetries) {
      v3Response = await fetch(v3Url, {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        }
      });
      
      if (v3Response.ok) {
        break; // Успешный запрос
      } else if (v3Response.status === 429 && retryCount < maxRetries) {
        // Rate limit - ждем 20 секунд (согласно документации WB)
        const waitTime = 20000; // 20 секунд
        console.log(`   ⏳ Rate limit (429), retry ${retryCount + 1}/${maxRetries} через ${waitTime}мс...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retryCount++;
      } else {
        break; // Другая ошибка или исчерпаны попытки
      }
    }
    
    if (v3Response && v3Response.ok) {
      const v3Data = await v3Response.json();
      
      if (Array.isArray(v3Data) && v3Data.length > 0) {
        v3Data.forEach((campaign: any) => {
          if (campaign.views > 0 || campaign.clicks > 0 || campaign.orders > 0) {
            campaignStats.push({
              advertId: campaign.advertId,
              views: campaign.views || 0,
              clicks: campaign.clicks || 0,
              sum: campaign.sum || 0,
              orders: campaign.orders || 0,
              atbs: campaign.atbs || 0,
              shks: campaign.shks || 0,
              ctr: campaign.ctr || 0,
              cpc: campaign.cpc || 0,
              cr: campaign.cr || 0,
              source: 'v3-fullstats'
            });
            
            console.log(`   ✅ Кампания ${campaign.advertId}: просмотры=${campaign.views}, клики=${campaign.clicks}, заказы=${campaign.orders}, затраты=${campaign.sum}₽`);
          }
        });
      }
      
      console.log(`   ✅ Получено через v3/fullstats: ${campaignStats.length} кампаний`);
    } else if (v3Response?.status === 400) {
      // Детальное логирование ошибки 400
      let errorDetails = '';
      try {
        const errorText = await v3Response?.text();
        errorDetails = errorText || 'Нет деталей ошибки';
        
        // Проверяем, нет ли статистики за этот период
        if (errorDetails.includes('no statistics')) {
          console.log(`   ⚠️ Нет статистики за период ${startDateStr}..${endDateStr}`);
          console.log(`   🔄 Пробуем запросить последние 7 дней...`);
          
          // Пробуем последние 7 дней
          const last7Days = new Date();
          last7Days.setDate(last7Days.getDate() - 7);
          const last7DaysStr = last7Days.toISOString().split('T')[0];
          
          const shortUrl = `https://advert-api.wildberries.ru/adv/v3/fullstats?ids=${campaignIds}&beginDate=${last7DaysStr}&endDate=${endDateStr}`;
          
          const shortResponse = await fetch(shortUrl, {
            method: 'GET',
            headers: {
              'Authorization': apiToken,
              'Accept': 'application/json'
            }
          });
          
          if (shortResponse.ok) {
            const shortData = await shortResponse.json();
            
            if (Array.isArray(shortData) && shortData.length > 0) {
              shortData.forEach((campaign: any) => {
                if (campaign.views > 0 || campaign.clicks > 0 || campaign.orders > 0) {
                  campaignStats.push({
                    advertId: campaign.advertId,
                    views: campaign.views || 0,
                    clicks: campaign.clicks || 0,
                    sum: campaign.sum || 0,
                    orders: campaign.orders || 0,
                    atbs: campaign.atbs || 0,
                    shks: campaign.shks || 0,
                    ctr: campaign.ctr || 0,
                    cpc: campaign.cpc || 0,
                    cr: campaign.cr || 0,
                    source: 'v3-fullstats-7days'
                  });
                  
                  console.log(`   ✅ Кампания ${campaign.advertId} (7 дней): просмотры=${campaign.views}, клики=${campaign.clicks}, заказы=${campaign.orders}, затраты=${campaign.sum}₽`);
                }
              });
              
              console.log(`   ✅ Получено через v3/fullstats (7 дней): ${campaignStats.length} кампаний`);
            } else {
              console.log(`   ⚠️ Нет статистики даже за последние 7 дней`);
            }
          } else {
            console.log(`   ⚠️ Ошибка при запросе последних 7 дней: ${shortResponse.status}`);
          }
        } else {
          console.log(`   ⚠️ v3/fullstats ошибка: ${v3Response?.status}`);
          console.log(`   📋 Детали ошибки: ${errorDetails}`);
          console.log(`   🔗 URL запроса: ${v3Url}`);
        }
      } catch (e) {
        errorDetails = 'Не удалось прочитать ответ';
        console.log(`   ⚠️ v3/fullstats ошибка: ${v3Response?.status} (после ${retryCount} попыток)`);
        console.log(`   📋 Детали ошибки: ${errorDetails}`);
      }
    } else {
      console.log(`   ⚠️ v3/fullstats ошибка: ${v3Response?.status} (после ${retryCount} попыток)`);
    }
  } catch (error: any) {
    console.log(`   ⚠️ Ошибка получения статистики через v3/fullstats: ${error.message}`);
  }
  
  return campaignStats;
}

// Получает полную историю кампании по неделям через /adv/v0/stats/keywords или альтернативные endpoints
async function fetchCampaignHistoryByWeeks(
  apiToken: string,
  campaign: any,
  startDate: string,
  endDate: string
) {
  const allStats: any[] = [];
  const campaignType = campaign.type;
  const campaignStatus = campaign.status;
  
  // Для кампаний на паузе используем альтернативные endpoints
  // Статусы: 4=готова, 7=завершена, 9=активна, 11=пауза
  const isPaused = campaignStatus === 7 || campaignStatus === 11;
  const isActive = campaignStatus === 9;
  
  // Разбиваем период на недели (максимум 7 дней за запрос)
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 6); // +6 дней = 7 дней всего
    
    if (weekEnd > end) {
      weekEnd.setTime(end.getTime());
    }
    
    const weekStart = start.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    try {
      let weekStats: any[] = [];
      
      // Для активных кампаний (статус 9) используем /adv/v2/fullstats
      if (isActive) {
        console.log(`      ▶️ Кампания ${campaign.advertId} активна - запрос через v2/fullstats`);
        
        // v2/fullstats требует массив дат
        const dates: string[] = [];
        const currentDate = new Date(weekStart);
        const weekEndDate = new Date(weekEndStr);
        
        while (currentDate <= weekEndDate) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const v2Url = `https://advert-api.wildberries.ru/adv/v2/fullstats`;
        
        // Retry логика для обработки 429 (rate limit)
        let retryCount = 0;
        const maxRetries = 3;
        let v2Response: Response | null = null;
        
        while (retryCount <= maxRetries) {
          v2Response = await fetch(v2Url, {
            method: 'POST',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
              id: campaign.advertId,
              dates: dates
            }])
          });
          
          if (v2Response.ok) {
            break; // Успешный запрос
          } else if (v2Response.status === 429 && retryCount < maxRetries) {
            // Rate limit - ждем и повторяем
            const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
            console.log(`      ⏳ Rate limit (429), retry ${retryCount + 1}/${maxRetries} через ${waitTime}мс...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else {
            break; // Другая ошибка или исчерпаны попытки
          }
        }
        
        if (v2Response && v2Response.ok) {
          const v2Data = await v2Response.json();
          
          if (Array.isArray(v2Data) && v2Data.length > 0) {
            const campaignData = v2Data[0];
            
            // Извлекаем статистику по дням
            if (campaignData.days && Array.isArray(campaignData.days)) {
              campaignData.days.forEach((day: any) => {
                if (day.apps && Array.isArray(day.apps)) {
                  day.apps.forEach((app: any) => {
                    weekStats.push({
                      date: day.date,
                      views: app.views || 0,
                      clicks: app.clicks || 0,
                      sum: app.sum || 0,
                      orders: app.orders || 0
                    });
                  });
                }
              });
            }
            
            console.log(`      ✅ v2/fullstats: получено ${weekStats.length} записей`);
          }
        } else {
          console.log(`      ⚠️ v2/fullstats ошибка: ${v2Response?.status} (после ${retryCount} попыток)`);
        }
      } 
      // Для неактивных кампаний пробуем /adv/v0/stats/keywords
      else if (!isPaused) {
        const url = `https://advert-api.wildberries.ru/adv/v0/stats/keywords?advert_id=${campaign.advertId}&from=${weekStart}&to=${weekEndStr}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.keywords && Array.isArray(data.keywords)) {
            weekStats = data.keywords;
          }
        }
      } else {
        // Для кампаний на паузе API не предоставляет исторические данные по ключевым словам
        console.log(`      ⏸️ Кампания ${campaign.advertId} на паузе - исторические данные недоступны`);
        // Не запрашиваем данные для паузных кампаний
      }
      
      if (weekStats.length > 0) {
        allStats.push(...weekStats);
      }
      
      // Увеличенная задержка между запросами для избежания rate limit
      // Для активных кампаний (v2/fullstats) - 1 секунда
      // Для остальных - 300мс
      const delayMs = isActive ? 1000 : 300;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error: any) {
      console.log(`      ⚠️ Ошибка для недели ${weekStart}..${weekEndStr}: ${error.message}`);
    }
    
    // Переходим к следующей неделе
    start.setDate(start.getDate() + 7);
  }
  
  return allStats;
}

// Получает статистику через v2/fullstats для кампаний (работает для всех кампаний включая паузу)
async function fetchFullstatsV2ForCampaigns(
  apiToken: string,
  campaigns: any[],
  startDate: string,
  endDate: string,
  campaignStats: any[]
) {
  console.log(`   📊 Запрашиваем статистику через v2/fullstats для ${campaigns.length} кампаний...`);
  
  // API /adv/v2/fullstats поддерживает до 31 дня
  const campaignIds = campaigns.map((c: any) => c.advertId);
  
  try {
    // v2/fullstats использует POST с массивом объектов {id, dates}
    const v2Url = `https://advert-api.wildberries.ru/adv/v2/fullstats`;
    
    // Генерируем массив дат для периода
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Формируем запрос: массив объектов с id и dates
    const requestBody = campaigns.map((c: any) => ({
      id: c.advertId,
      dates: dates
    }));
    
    console.log(`   📤 Тело запроса v2/fullstats (${campaigns.length} кампаний, ${dates.length} дней): ${JSON.stringify(requestBody).substring(0, 200)}`);
    
    const v2Response = await fetch(v2Url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (v2Response.ok) {
      const v2Data = await v2Response.json();
      console.log(`   📋 Структура ответа v2/fullstats: ${v2Data === null ? 'null' : typeof v2Data}`);
      
      // Если v2/fullstats вернул null (кампании неактивны), используем альтернативный метод
      if (v2Data === null || !Array.isArray(v2Data)) {
        console.log(`   ⚠️ v2/fullstats вернул null, используем /adv/v0/stats/keywords для каждой кампании...`);
        
        // Запрашиваем статистику через /adv/v0/stats/keywords (работает для неактивных кампаний)
        for (const campaign of campaigns) {
          try {
            console.log(`   🔍 Запрос статистики для кампании ${campaign.advertId} через keywords API...`);
            const keywordStats = await fetchCampaignHistoryByWeeks(
              apiToken,
              campaign,
              startDate,
              endDate
            );
            
            if (keywordStats.length > 0) {
              // Агрегируем статистику по дням
              const aggregated: any = {
                advertId: campaign.advertId,
                days: []
              };
              
              // Группируем по дням
              const dayMap = new Map();
              keywordStats.forEach((kw: any) => {
                if (!kw.date) return;
                
                if (!dayMap.has(kw.date)) {
                  dayMap.set(kw.date, {
                    date: kw.date,
                    views: 0,
                    clicks: 0,
                    sum: 0,
                    orders: 0
                  });
                }
                
                const day = dayMap.get(kw.date);
                day.views += kw.views || 0;
                day.clicks += kw.clicks || 0;
                day.sum += kw.sum || 0;
                day.orders += kw.orders || 0;
              });
              
              aggregated.days = Array.from(dayMap.values());
              
              // Добавляем агрегированные данные в campaignStats
              let totalViews = 0;
              let totalClicks = 0;
              let totalSum = 0;
              let totalOrders = 0;
              
              aggregated.days.forEach((day: any) => {
                totalViews += day.views || 0;
                totalClicks += day.clicks || 0;
                totalSum += day.sum || 0;
                totalOrders += day.orders || 0;
              });
              
              campaignStats.push({
                advertId: campaign.advertId,
                views: totalViews,
                clicks: totalClicks,
                sum: totalSum,
                orders: totalOrders,
                ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0,
                cpc: totalClicks > 0 ? (totalSum / totalClicks).toFixed(2) : 0,
                days: aggregated.days
              });
              
              console.log(`   ✅ Получено через keywords API: кампания ${campaign.advertId}, просмотры=${totalViews}, клики=${totalClicks}, заказы=${totalOrders}`);
            }
          } catch (error: any) {
            console.log(`   ⚠️ Ошибка получения статистики для кампании ${campaign.advertId}: ${error.message}`);
          }
          
          // Задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`   ✅ Получено через keywords API: ${campaignStats.length} кампаний`);
        return campaignStats;
      } else if (Array.isArray(v2Data)) {
        v2Data.forEach((campaign: any) => {
          // Фильтруем данные по датам
          let totalViews = 0;
          let totalClicks = 0;
          let totalSum = 0;
          let totalOrders = 0;
          
          if (campaign.days && Array.isArray(campaign.days)) {
            const periodStart = new Date(startDate);
            const periodEnd = new Date(endDate);
            
            campaign.days.forEach((day: any) => {
              const dayDate = new Date(day.date);
              if (dayDate >= periodStart && dayDate <= periodEnd) {
                totalViews += day.views || 0;
                totalClicks += day.clicks || 0;
                totalSum += day.sum || 0;
                totalOrders += day.orders || 0;
              }
            });
          }
          
          // Добавляем в общий массив
          campaignStats.push({
            advertId: campaign.advertId,
            views: totalViews,
            clicks: totalClicks,
            sum: totalSum,
            orders: totalOrders,
            ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0,
            cpc: totalClicks > 0 ? (totalSum / totalClicks).toFixed(2) : 0,
            days: campaign.days, // Сохраняем детализацию по дням
            source: 'v2fullstats' // Помечаем источник
          });
          
          console.log(`      ✅ Кампания ${campaign.advertId}: просмотры=${totalViews}, клики=${totalClicks}, заказы=${totalOrders}, затраты=${totalSum}₽`);
        });
        
        console.log(`   ✅ Получено через v2/fullstats: ${campaignStats.length} кампаний`);
      }
    } else {
      const body = await v2Response.text();
      console.log(`   ⚠️ v2/fullstats: ${v2Response.status} ${body.slice(0,200)}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Ошибка v2/fullstats: ${error.message}`);
  }
  
  return campaignStats;
}

// Получает данные за одну неделю
async function fetchWeekData(
  apiToken: string,
  nmId: number,
  subjectId: number | null | undefined,
  startDate: string,
  endDate: string,
  allCampaigns: any[], // Передаем все кампании как параметр
  campaignStatsGlobal: any[] // Передаем глобальную статистику кампаний
) {
  const data: any = {
    searchQueries: [],
    conversionData: null,
    campaignStats: [],
    salesFunnel: null,
    keywordStats: [],
    salesDetails: [], // Детальные данные о продажах из Statistics API
    searchQueryOrders: []
  };

  // Проверяем возраст данных
  const daysAgo = Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const isRecentData = daysAgo <= 90; // Analytics API: 90 дней
  const isWithinYear = daysAgo <= 365; // Sales Funnel API: 365 дней
  console.log(`   ⏱️ Окно: ${startDate}..${endDate} | daysAgo=${daysAgo} | <=90=${isRecentData} | <=365=${isWithinYear}`);

  // 1. Поисковые запросы для товара (только для последних 90 дней)
  if (isRecentData) {
    try {
      let searchOk = false;
      let items: any[] = [];

      let primaryResp: Response | undefined;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries <= maxRetries) {
        primaryResp = await fetch('https://seller-analytics-api.wildberries.ru/api/v2/search-report/product/search-texts', {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            currentPeriod: { start: startDate, end: endDate },
            nmIds: [nmId],
            limit: 30,
            topOrderBy: 'openCard',
            orderBy: { field: 'openCard', mode: 'desc' }
          })
        });
        
        if (primaryResp.status === 503 && retries < maxRetries) {
          const delay = (retries + 1) * 2000;
          console.log(`   ⏳ Search texts: retry ${retries + 1} после ${delay}мс (status=503)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          break;
        }
      }

      if (primaryResp && primaryResp.ok) {
        const j = await primaryResp.json();
        items = j.data?.items || [];
        console.log(`   🔍 Поисковые запросы (product/search-texts): ${items.length}`);
        searchOk = items.length > 0;
        if (!searchOk) {
          console.log(`   ↪️ product/search-texts вернул 0 — пробуем fallback отчёты`);
        }
      } else {
        let body = '';
        try { body = primaryResp ? await primaryResp.text() : ''; } catch {}
        console.log(`   ❌ Поисковые запросы (product/search-texts): ${primaryResp?.status || 'no response'} ${body?.slice(0,300)}`);

        // Fallback 1: aggregated report by nmIds
        // compute past period for report requirement
        const _s = new Date(startDate);
        const _e = new Date(endDate);
        const _ms = 24*60*60*1000;
        const _dur = Math.max(1, Math.floor((_e.getTime()-_s.getTime())/_ms)+1);
        const _pEnd = new Date(_s.getTime()-_ms);
        const _pStart = new Date(_pEnd.getTime()-(_dur-1)*_ms);
        const _pStartStr = _pStart.toISOString().split('T')[0];
        const _pEndStr = _pEnd.toISOString().split('T')[0];

        let fb1: Response | undefined;
        let fb1Retries = 0;
        while (fb1Retries <= 2) {
          fb1 = await fetch('https://seller-analytics-api.wildberries.ru/api/v2/search-report/report', {
            method: 'POST',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              currentPeriod: { start: startDate, end: endDate },
              pastPeriod: { start: _pStartStr, end: _pEndStr },
              nmIds: [nmId],
              positionCluster: 'all',
              orderBy: { field: 'openCard', mode: 'desc' },
              includeSubstitutedSKUs: true,
              includeSearchTexts: false,
              limit: 50,
              offset: 0
            })
          });
          if (fb1.status === 503 && fb1Retries < 2) {
            await new Promise(resolve => setTimeout(resolve, (fb1Retries + 1) * 2000));
            fb1Retries++;
          } else {
            break;
          }
        }
        if (fb1 && fb1.ok) {
          const j1 = await fb1.json();
          const i1 = j1.data?.items || (j1.data?.groups || []);
          items = Array.isArray(i1) ? i1 : [];
          searchOk = items.length > 0;
          console.log(`   🔍 Поисковые запросы (fallback: report by nmIds): ${items.length}`);
        } else {
          let b1 = '';
          try { b1 = fb1 ? await fb1.text() : ''; } catch {}
          console.log(`   ❌ Поисковые запросы (report by nmIds): ${fb1?.status || 'no response'} ${b1?.slice(0,300)}`);

          // Fallback 2: aggregated report by subjectId (если есть)
          if (subjectId) {
            let fb2: Response | undefined;
            let fb2Retries = 0;
            while (fb2Retries <= 2) {
              fb2 = await fetch('https://seller-analytics-api.wildberries.ru/api/v2/search-report/report', {
                method: 'POST',
                headers: {
                  'Authorization': apiToken,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  currentPeriod: { start: startDate, end: endDate },
                  pastPeriod: { start: _pStartStr, end: _pEndStr },
                  subjectIds: [subjectId],
                  positionCluster: 'all',
                  orderBy: { field: 'openCard', mode: 'desc' },
                  includeSubstitutedSKUs: true,
                  includeSearchTexts: false,
                  limit: 50,
                  offset: 0
                })
              });
              if (fb2.status === 503 && fb2Retries < 2) {
                await new Promise(resolve => setTimeout(resolve, (fb2Retries + 1) * 2000));
                fb2Retries++;
              } else {
                break;
              }
            }
            if (fb2 && fb2.ok) {
              const j2 = await fb2.json();
              const i2 = j2.data?.items || (j2.data?.groups || []);
              items = Array.isArray(i2) ? i2 : [];
              searchOk = items.length > 0;
              console.log(`   🔍 Поисковые запросы (fallback: report by subjectId): ${items.length}`);
            } else {
              let b2 = '';
              try { b2 = fb2 ? await fb2.text() : ''; } catch {}
              console.log(`   ❌ Поисковые запросы (report by subjectId): ${fb2?.status || 'no response'} ${b2?.slice(0,300)}`);
            }
          }
        }
      }

      if (searchOk) {
        data.searchQueries = items;
        const texts = items.map((x: any) => x.searchText).filter(Boolean);
        if (texts.length > 0) {
          try {
            const ordersResp = await fetch('https://seller-analytics-api.wildberries.ru/api/v2/search-report/product/orders', {
              method: 'POST',
              headers: {
                'Authorization': apiToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                period: { start: startDate, end: endDate },
                nmId: nmId,
                searchTexts: texts.slice(0, 30)
              })
            });
            if (ordersResp.ok) {
              const ord = await ordersResp.json();
              data.searchQueryOrders = ord.data?.items || ord.data?.total || [];
              console.log(`   🧾 Заказы по запросам: ${data.searchQueryOrders.length}`);
            } else {
              let b4 = '';
              try { b4 = await ordersResp.text(); } catch {}
              console.log(`   ❌ Заказы по запросам: ${ordersResp.status} ${b4?.slice(0,300)}`);
            }
          } catch (err: any) {
            console.log(`   ⚠️ Заказы по запросам: ${err.message}`);
          }
        }
      } else {
        console.log(`   ℹ️ Search Report API требует подписку Jam. Используем альтернативные источники (реклама, grouped history)`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ Поисковые запросы: ${error.message}`);
    }
  } else {
    console.log(`   ⏭️ Поисковые запросы: пропущено (данные старше 90 дней)`);
  }

  // 1.5. V3 Analytics: продукты по дням (ТОЛЬКО для последних 7 дней!)
  const isWithinWeek = daysAgo <= 7;
  if (isWithinWeek) {
    try {
      const detailResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            nmIds: [nmId],
            selectedPeriod: {
              start: startDate,
              end: endDate
            },
            skipDeletedNm: false,
            aggregationLevel: 'day'
          })
        }
      );

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        // V3 API возвращает массив продуктов, каждый с history
        const products = Array.isArray(detailData) ? detailData : [detailData];
        const product = products.find((p: any) => p.product?.nmId === nmId) || products[0];
        
        if (product?.history?.length > 0) {
          const totalViews = product.history.reduce((sum: number, day: any) => sum + (day.openCount || 0), 0);
          const totalOrders = product.history.reduce((sum: number, day: any) => sum + (day.orderCount || 0), 0);
          console.log(`   📈 V3 Analytics (history): просмотры=${totalViews}, заказы=${totalOrders}, дней=${product.history.length}`);
          // Сохраняем для проверки активности
          if (!data.conversionData) {
            data.conversionData = {
              statistic: {
                selected: {
                  orderCount: totalOrders,
                  openCount: totalViews,
                  cartCount: product.history.reduce((sum: number, day: any) => sum + (day.cartCount || 0), 0)
                }
              }
            };
          }
        }
      } else {
        let body = '';
        try { body = await detailResponse.text(); } catch {}
        console.log(`   ❌ V3 Analytics (history): ${detailResponse.status} ${body?.slice(0,300)}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ V3 Analytics (history): ${error.message}`);
    }
  } else {
    console.log(`   ⏭️ V3 Analytics (history): пропущено (данные старше 7 дней, API лимит)`);
  }

  // Задержка между запросами к разным API
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Данные конверсии (работает для последних 365 дней!)
  if (isWithinYear) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const msPerDay = 24*60*60*1000;
      const duration = Math.max(1, Math.floor((e.getTime() - s.getTime())/msPerDay) + 1);
      const pastEnd = new Date(s.getTime() - msPerDay);
      const pastStart = new Date(pastEnd.getTime() - (duration-1)*msPerDay);
      const pastStartStr = pastStart.toISOString().split('T')[0];
      const pastEndStr = pastEnd.toISOString().split('T')[0];
      console.log(`   ⏮️ Пара прошл. периода: ${pastStartStr}..${pastEndStr} (длительность ${duration}дн)`);
      
      let conversionResponse: Response | undefined;
      let convRetries = 0;
      const maxConvRetries = 3;
      
      while (convRetries <= maxConvRetries) {
        conversionResponse = await fetch(
          'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
          {
            method: 'POST',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              selectedPeriod: {
                start: startDate,
                end: endDate
              },
              pastPeriod: {
                start: pastStartStr,
                end: pastEndStr
              },
              nmIds: [nmId],
              skipDeletedNm: false
            })
          }
        );
        
        if ((conversionResponse.status === 500 || conversionResponse.status === 503) && convRetries < maxConvRetries) {
          const delay = (convRetries + 1) * 2000;
          console.log(`   ⏳ Конверсия: retry ${convRetries + 1} после ${delay}мс (status=${conversionResponse.status})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          convRetries++;
        } else {
          break;
        }
      }

      if (conversionResponse && conversionResponse.ok) {
        const conversionData = await conversionResponse.json();
        data.conversionData = conversionData.data?.products?.[0] || null;
        
        if (data.conversionData) {
          const selected = data.conversionData.statistic?.selected;
          const product = data.conversionData.product;
          
          console.log(`   📊 V3 Summary (БЕЗ Jam!):`);
          console.log(`      Товар: ${product?.title || 'N/A'}`);
          console.log(`      Просмотры: ${selected?.openCount || 0}`);
          console.log(`      В корзину: ${selected?.cartCount || 0}`);
          console.log(`      Заказы: ${selected?.orderCount || 0}`);
          console.log(`      Выкупы: ${selected?.buyoutCount || 0}`);
          console.log(`      Конверсия в корзину: ${selected?.conversions?.addToCartPercent || 0}%`);
          console.log(`      Конверсия в заказ: ${selected?.conversions?.cartToOrderPercent || 0}%`);
          console.log(`      Процент выкупа: ${selected?.conversions?.buyoutPercent || 0}%`);
          console.log(`      Рейтинг: ${product?.productRating || 0}`);
          console.log(`      Остатки: WB=${product?.stocks?.wb || 0}, MP=${product?.stocks?.mp || 0}`);
        }
      } else {
        let body = '';
        try { body = conversionResponse ? await conversionResponse.text() : ''; } catch {}
        console.log(`   ❌ Конверсия: ${conversionResponse?.status || 'no response'} ${body?.slice(0,300)}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ Конверсия: ${error.message}`);
    }
  } else {
    console.log(`   ⏭️ Конверсия: пропущено (данные старше 365 дней)`);
  }

  // Задержка между запросами
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2.5. Альтернативный метод: отчет о продажах (statistics API - хранит всю историю)
  try {
    // Retry для statistics API (часто 429)
    let salesResponse: Response | null = null;
    let attempt = 0;
    let lastStatus = 0;
    while (attempt < 3) {
      attempt++;
      salesResponse = await fetch(
        `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${startDate}&flag=0`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Accept': 'application/json'
          }
        }
      );
      lastStatus = salesResponse.status;
      if (salesResponse.ok) break;
      if (salesResponse.status === 429 || salesResponse.status >= 500) {
        const wait = attempt === 1 ? 3000 : attempt === 2 ? 6000 : 10000;
        console.log(`   ⏳ Продажи (statistics): retry ${attempt} после ${wait}мс (status=${salesResponse.status})`);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      break;
    }

    if (salesResponse && salesResponse.ok) {
      const salesData = await salesResponse.json();
      // Фильтруем по nmId
      const productSales = salesData.filter((sale: any) => sale.nmId === nmId);
      if (productSales.length > 0) {
        const totalOrders = productSales.length;
        const totalSum = productSales.reduce((sum: number, sale: any) => sum + (sale.finishedPrice || 0), 0);
        console.log(`   💰 Продажи (statistics): заказов=${totalOrders}, сумма=${totalSum}₽`);
        
        // Сохраняем детальные данные о продажах
        data.salesDetails = productSales;
        
        // Обновляем данные конверсии если их нет
        if (!data.conversionData || !data.conversionData.statistic?.selected?.orderCount) {
          data.conversionData = {
            statistic: {
              selected: {
                orderCount: totalOrders,
                openCount: 0,
                cartCount: 0,
                orderSum: totalSum
              }
            }
          };
        }
      }
    } else {
      let body = '';
      try { body = await (salesResponse as Response).text(); } catch {}
      console.log(`   ❌ Продажи (statistics): ${lastStatus} ${body?.slice(0,300)}`);
    }
  } catch (error: any) {
    console.log(`   ⚠️ Продажи (statistics): ${error.message}`);
  }

  // 3. Кампании (используем глобальную статистику, полученную ОДИН РАЗ)
  try {
    if (campaignStatsGlobal.length > 0) {
      // Фильтруем статистику по датам этой недели
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      
      // Берем статистику кампаний за эту неделю из глобальных данных
      const weekCampaignStats = campaignStatsGlobal.filter((stat: any) => {
        // Для v2fullstats и v3fullstats проверяем есть ли данные за дни этой недели
        if (stat.days && Array.isArray(stat.days)) {
          return stat.days.some((day: any) => {
            const dayDate = new Date(day.date);
            return dayDate >= periodStart && dayDate <= periodEnd;
          });
        }
        
        return false;
      });
      
      data.campaignStats = weekCampaignStats;
      console.log(`   📊 Статистика кампаний (из глобальных данных): ${weekCampaignStats.length} кампаний за период ${startDate}..${endDate}`);
      
      if (weekCampaignStats.length > 0) {
        weekCampaignStats.forEach((stat: any) => {
          const source = stat.source === 'v2fullstats' ? ' [v2]' : '';
          console.log(`      Кампания ${stat.advertId}: просмотры=${stat.views || 0}, клики=${stat.clicks || 0}, заказы=${stat.orders || 0}${source}`);
        });
      }
    } else {
      console.log(`   ℹ️ Нет глобальной статистики кампаний`);
      data.campaignStats = [];
    }
  } catch (error) {
    console.log(`   ⚠️ Кампании: ошибка фильтрации`);
    data.campaignStats = [];
  }

  // 4. Воронка продаж (ТОЛЬКО для последних 7 дней!)
  if (isWithinWeek) {
    try {
      const funnelResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            selectedPeriod: { start: startDate, end: endDate },
            nmIds: [nmId],
            skipDeletedNm: true,
            aggregationLevel: 'day'
          })
        }
      );

      if (funnelResponse.ok) {
        const funnelData = await funnelResponse.json();
        data.salesFunnel = funnelData[0] || null;
        const days = data.salesFunnel?.history?.length || 0;
        console.log(`   🛒 Воронка: ${days} дней`);
      } else {
        let body = '';
        try { body = await funnelResponse.text(); } catch {}
        console.log(`   ❌ Воронка: ${funnelResponse.status} ${body?.slice(0,300)}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Воронка: ошибка`);
    }
  } else {
    console.log(`   ⏭️ Воронка: пропущено (данные старше 7 дней, API лимит)`);
  }

  // 5. Ключевые слова из кампаний (БЕЗ Jam!)
  if (data.campaignStats?.length > 0) {
    try {
      for (const campaign of data.campaignStats) {
        const keywordResponse = await fetch(
          'https://advert-api.wildberries.ru/adv/v0/normquery/stats',
          {
            method: 'POST',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: campaign.advertId,
              dates: { from: startDate, to: endDate }
            })
          }
        );

        if (keywordResponse.ok) {
          const keywords = await keywordResponse.json();
          data.keywordStats.push(...keywords);
        } else {
          let body = '';
          try { body = await keywordResponse.text(); } catch {}
          console.log(`   ❌ Ключевые слова (adv): ${keywordResponse.status} ${body?.slice(0,300)}`);
        }
      }
      console.log(`   🔑 Ключевые слова из рекламы: ${data.keywordStats.length}`);
      
      // Если нет поисковых запросов из Search Report, используем ключевые слова как прокси
      if (data.searchQueries.length === 0 && data.keywordStats.length > 0) {
        console.log(`   💡 Используем ключевые слова из рекламы как поисковые запросы (NO JAM fallback)`);
        data.searchQueries = data.keywordStats.map((kw: any) => ({
          searchText: kw.keyword || kw.query,
          orders: kw.orders || 0,
          openCard: kw.views || 0,
          source: 'advert'
        }));
      }
    } catch (error) {
      console.log(`   ⚠️ Ключевые слова: ошибка`);
    }
  }

  // 6. V3 Analytics: grouped funnel (ТОЛЬКО для последних 7 дней!)
  if (data.searchQueries.length === 0 && subjectId && isWithinWeek) {
    try {
      console.log(`   🔄 V3 Analytics: grouped funnel по категории`);
      const groupedResp = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/grouped/history',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            subjectIds: [subjectId],
            selectedPeriod: {
              start: startDate,
              end: endDate
            },
            skipDeletedNm: false,
            aggregationLevel: 'day'
          })
        }
      );
      if (groupedResp.ok) {
        const grouped = await groupedResp.json();
        console.log(`   📊 V3 Analytics (grouped): получены данные по категории`);
        // Эти данные не содержат прямых поисковых запросов, но дают статистику по категории
      } else {
        let gb = '';
        try { gb = await groupedResp.text(); } catch {}
        console.log(`   ❌ V3 Analytics (grouped): ${groupedResp.status} ${gb?.slice(0,300)}`);
      }
    } catch (err: any) {
      console.log(`   ⚠️ V3 Analytics (grouped): ${err.message}`);
    }
  } else if (data.searchQueries.length === 0 && subjectId && !isWithinWeek) {
    console.log(`   ⏭️ V3 Analytics (grouped): пропущено (данные старше 7 дней, API лимит)`);
  }

  return data;
}

// Проверяет есть ли активность в данных
function checkHasActivity(weekData: any): boolean {
  // Проверяем разные источники активности
  const hasSearchQueries = weekData.searchQueries?.length > 0;
  const hasOrders = weekData.conversionData?.statistic?.selected?.orderCount > 0;
  const hasViews = weekData.conversionData?.statistic?.selected?.openCount > 0;
  const hasCampaigns = weekData.campaignStats?.length > 0;
  const hasFunnelData = weekData.salesFunnel?.history?.some((h: any) => h.openCount > 0);

  // Детальное логирование для отладки
  const orderCount = weekData.conversionData?.statistic?.selected?.orderCount || 0;
  const viewCount = weekData.conversionData?.statistic?.selected?.openCount || 0;
  const cartCount = weekData.conversionData?.statistic?.selected?.cartCount || 0;
  
  if (hasSearchQueries || hasOrders || hasViews || hasCampaigns || hasFunnelData) {
    console.log(`   ✅ АКТИВНОСТЬ: запросы=${hasSearchQueries}, заказы=${orderCount}, просмотры=${viewCount}, корзина=${cartCount}, кампании=${hasCampaigns}`);
  } else {
    console.log(`   ⚪ Нет активности: запросы=0, заказы=0, просмотры=0, корзина=0, кампании=0`);
  }

  return hasSearchQueries || hasOrders || hasViews || hasCampaigns || hasFunnelData;
}

// Получает данные по категории (если нет данных для товара)
async function fetchCategoryData(apiToken: string, subjectId: number, nmId: number) {
  console.log(`📂 [Category Data] Получение данных категории ${subjectId}`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const data: any = {
    searchQueries: [],
    categoryStats: null,
    topCompetitors: [],
    categoryKeywords: []
  };

  // 1. Топ поисковые запросы категории
  try {
    const searchResponse = await fetch(
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
          limit: 100,
          includeSearchTexts: true
        })
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      data.searchQueries = searchData.data?.items || [];
      console.log(`   🔍 Поисковые запросы категории: ${data.searchQueries.length}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Поисковые запросы категории: ошибка`);
  }

  // 2. Топ товары категории (конкуренты)
  try {
    const competitorsResponse = await fetch(
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

    if (competitorsResponse.ok) {
      const competitorsData = await competitorsResponse.json();
      data.topCompetitors = competitorsData.data?.products?.slice(0, 20) || [];
      console.log(`   🎯 Топ конкуренты: ${data.topCompetitors.length}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Топ конкуренты: ошибка`);
  }

  // 3. Кампании категории
  try {
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

    if (campaignsResponse.ok) {
      const campaigns = await campaignsResponse.json();
      const categoryCampaigns = campaigns.filter((c: any) => 
        c.autoParams?.subject?.id === subjectId
      );

      // Получаем ключевые слова из кампаний категории
      for (const campaign of categoryCampaigns.slice(0, 10)) {
        try {
          const keywordResponse = await fetch(
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
                  from: startDate.toISOString().split('T')[0],
                  to: endDate.toISOString().split('T')[0]
                }
              })
            }
          );

          if (keywordResponse.ok) {
            const keywords = await keywordResponse.json();
            data.categoryKeywords.push(...keywords);
          }
        } catch (error) {
          // Игнорируем ошибки отдельных кампаний
        }
      }
      console.log(`   🔑 Ключевые слова категории: ${data.categoryKeywords.length}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Ключевые слова категории: ошибка`);
  }

  return data;
}

// Агрегирует собранные данные
function aggregateCollectedData(collectedData: any) {
  // Дедуплицируем поисковые запросы по полю text
  const queryMap = new Map<string, any>();
  
  collectedData.searchQueries.forEach((query: any) => {
    const key = query.text;
    if (!queryMap.has(key)) {
      queryMap.set(key, query);
    } else {
      // Если запрос уже есть, суммируем метрики
      const existing = queryMap.get(key);
      existing.frequency.current = (existing.frequency.current || 0) + (query.frequency.current || 0);
      existing.weekFrequency = (existing.weekFrequency || 0) + (query.weekFrequency || 0);
      existing.openCard.current = (existing.openCard.current || 0) + (query.openCard.current || 0);
      existing.addToCart.current = (existing.addToCart.current || 0) + (query.addToCart.current || 0);
      existing.orders.current = (existing.orders.current || 0) + (query.orders.current || 0);
    }
  });
  
  // Сортируем по частоте и берем топ-20 для AI анализа
  const allSearchQueries = Array.from(queryMap.values())
    .sort((a, b) => (b.frequency?.current || 0) - (a.frequency?.current || 0))
    .slice(0, 20)
    .map(query => ({
      // Убираем дублирующиеся поля товара (они одинаковые для всех запросов)
      text: query.text,
      frequency: query.frequency?.current || 0,
      position: query.medianPosition?.current || 0,
      openCard: query.openCard?.current || 0,
      addToCart: query.addToCart?.current || 0,
      orders: query.orders?.current || 0,
      visibility: query.visibility?.current || 0
    }));
  
  // Агрегируем конверсию
  let totalViews = 0;
  let totalCart = 0;
  let totalOrders = 0;
  let totalBuyouts = 0;
  
  collectedData.conversionData.forEach((data: any) => {
    const stats = data?.statistic?.selected;
    if (stats) {
      totalViews += stats.openCount || 0;
      totalCart += stats.cartCount || 0;
      totalOrders += stats.orderCount || 0;
      totalBuyouts += stats.buyoutCount || 0;
    }
  });

  // Объединяем все ключевые слова
  const allKeywords = collectedData.keywordStats;

  // Заказы по поисковым запросам
  const allSearchQueryOrders = collectedData.searchQueryOrders || [];

  // Объединяем и дедуплицируем данные кампаний
  const campaignMap = new Map<number, any>();
  
  collectedData.campaignStats.forEach((stats: any) => {
    const statsArray = Array.isArray(stats) ? stats : (stats ? [stats] : []);
    
    statsArray.forEach((campaign: any) => {
      const campaignId = campaign.advertId;
      if (!campaignId) return;
      
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, { ...campaign });
      } else {
        // Суммируем метрики для одной кампании из разных недель
        const existing = campaignMap.get(campaignId);
        existing.views = (existing.views || 0) + (campaign.views || 0);
        existing.clicks = (existing.clicks || 0) + (campaign.clicks || 0);
        existing.orders = (existing.orders || 0) + (campaign.orders || 0);
        existing.sum = (existing.sum || 0) + (campaign.sum || 0);
        existing.atbs = (existing.atbs || 0) + (campaign.atbs || 0);
        existing.shks = (existing.shks || 0) + (campaign.shks || 0);
        
        // Пересчитываем средние значения
        if (existing.views > 0) {
          existing.ctr = ((existing.clicks / existing.views) * 100).toFixed(2);
          existing.cpc = existing.clicks > 0 ? (existing.sum / existing.clicks).toFixed(2) : '0';
          existing.cpm = ((existing.sum / existing.views) * 1000).toFixed(2);
        }
      }
    });
  });
  
  const allCampaignStats = Array.from(campaignMap.values());

  // Объединяем воронку
  const allFunnelDays: any[] = [];
  collectedData.salesFunnel.forEach((funnel: any) => {
    if (funnel?.history) {
      allFunnelDays.push(...funnel.history);
    }
  });

  // Агрегируем детальные данные о продажах
  const allSalesDetails = collectedData.salesDetails || [];
  let totalSalesSum = 0;
  const salesByDate: any = {};
  
  allSalesDetails.forEach((sale: any) => {
    totalSalesSum += sale.finishedPrice || 0;
    const date = sale.date?.split('T')[0];
    if (date) {
      if (!salesByDate[date]) {
        salesByDate[date] = { count: 0, sum: 0, items: [] };
      }
      salesByDate[date].count++;
      salesByDate[date].sum += sale.finishedPrice || 0;
      salesByDate[date].items.push(sale);
    }
  });

  // Агрегируем воронку в суммарные метрики вместо истории по дням
  const funnelSummary = allFunnelDays.reduce((acc, day) => {
    acc.totalOpenCount += day.openCount || 0;
    acc.totalCartCount += day.cartCount || 0;
    acc.totalOrderCount += day.orderCount || 0;
    acc.totalBuyoutCount += day.buyoutCount || 0;
    acc.totalOrderSum += day.orderSum || 0;
    return acc;
  }, { totalOpenCount: 0, totalCartCount: 0, totalOrderCount: 0, totalBuyoutCount: 0, totalOrderSum: 0 });

  // Сокращаем данные кампаний - только ключевые метрики
  const campaignsSummary = allCampaignStats.map(c => ({
    id: c.advertId,
    type: c.type,
    status: c.status,
    views: c.views || 0,
    clicks: c.clicks || 0,
    orders: c.orders || 0,
    sum: c.sum || 0,
    ctr: c.ctr || '0',
    cpc: c.cpc || '0'
  }));

  return {
    searchQueries: {
      total: queryMap.size, // Общее количество уникальных запросов
      topQueries: allSearchQueries // Топ-20 для анализа
    },
    conversion: {
      totalViews,
      totalCart,
      totalOrders,
      totalBuyouts,
      totalSalesSum,
      ctr: totalViews > 0 ? ((totalCart / totalViews) * 100).toFixed(2) : '0',
      conversion: totalCart > 0 ? ((totalOrders / totalCart) * 100).toFixed(2) : '0',
      buyoutRate: totalOrders > 0 ? ((totalBuyouts / totalOrders) * 100).toFixed(2) : '0',
      avgOrderValue: totalOrders > 0 ? (totalSalesSum / totalOrders).toFixed(2) : '0'
    },
    campaigns: {
      total: allCampaignStats.length,
      stats: campaignsSummary // Сокращенные данные
    },
    keywords: {
      total: allKeywords.length,
      keywords: allKeywords.slice(0, 20) // Топ-20 ключевых слов
    },
    salesFunnel: {
      totalDays: allFunnelDays.length,
      summary: funnelSummary // Суммарные метрики вместо истории
    },
    salesDetails: {
      total: allSalesDetails.length,
      totalSum: totalSalesSum
      // Убрали byDate и items - слишком много данных
    },
    searchQueryOrders: {
      total: allSearchQueryOrders.length
      // Убрали items - не нужны для AI анализа
    }
  };
}

/**
 * Получает кампании для конкретного товара
 * Использует существующую функцию fetchAllCampaigns и фильтрует по nmId/subjectId
 */
async function getCampaignsForProduct(
  apiToken: string,
  nmId: number,
  subjectId: number | null | undefined
) {
  console.log(`🎯 [Product Campaigns] Получение кампаний для товара ${nmId}`);
  
  // Получаем все кампании
  const allCampaigns = await fetchAllCampaigns(apiToken);
  
  // Фильтруем кампании, связанные с этим товаром
  const relevantCampaigns = allCampaigns.filter((campaign: any) => {
    const nms = campaign.autoParams?.nms || [];
    const hasOurProduct = nms.includes(nmId);
    const subjectMatch = subjectId && campaign.autoParams?.subject?.id === subjectId;
    
    return hasOurProduct || subjectMatch;
  });
  
  console.log(`✅ [Product Campaigns] Найдено ${relevantCampaigns.length} кампаний из ${allCampaigns.length}`);
  
  // Загружаем ключевые слова для каждой кампании помесячно с даты создания
  console.log(`🔑 [Product Campaigns] Загрузка ключевых слов для ${relevantCampaigns.length} кампаний...`);
  
  const campaignsWithKeywords = await Promise.all(
    relevantCampaigns.map(async (campaign: any) => {
      try {
        // Получаем первый товар из кампании или используем переданный nmId
        const campaignNmId = campaign.autoParams?.nms?.[0] || nmId;
        
        let allKeywords: any[] = [];
        
        // Начинаем с даты создания или запуска кампании
        const campaignStartDate = new Date(campaign.createTime || campaign.startTime);
        const today = new Date();
        
        let currentStart = new Date(campaignStartDate);
        let hasData = true;
        
        // Статусы: 4=готова, 7=завершена, 9=активна, 11=пауза
        const isPaused = campaign.status === 7 || campaign.status === 11;
        const statusLabel = isPaused ? '⏸️ на паузе' : '▶️ активна';
        
        console.log(`   📅 Кампания ${campaign.advertId} (тип ${campaign.type}, статус ${campaign.status}, ${statusLabel}): запрос с ${currentStart.toISOString().split('T')[0]} помесячно...`);
        
        // Запрашиваем помесячно пока есть данные
        while (hasData && currentStart < today) {
          // Конец периода - через месяц или сегодня
          const currentEnd = new Date(currentStart);
          currentEnd.setMonth(currentEnd.getMonth() + 1);
          if (currentEnd > today) {
            currentEnd.setTime(today.getTime());
          }
          
          let monthKeywords: any[] = [];
          
          // Для кампаний на паузе исторические данные недоступны
          if (isPaused) {
            console.log(`      ⏸️ Кампания ${campaign.advertId} на паузе - пропускаем загрузку ключевых слов`);
            hasData = false; // Прекращаем цикл
          } else {
            // Для активных кампаний используем специфичные endpoints
            if (campaign.type === 9) {
              // CPM кампании: /adv/v0/normquery/stats
              console.log(`      ▶️ Используем /adv/v0/normquery/stats для активной CPM кампании ${campaign.advertId}`);
              monthKeywords = await fetchCampaignKeywords(
                apiToken,
                campaign.advertId,
                campaignNmId,
                currentStart.toISOString().split('T')[0],
                currentEnd.toISOString().split('T')[0]
              );
            } else if (campaign.type === 8) {
              // Поисковые кампании: /adv/v1/stat/words (только для текущего периода)
              console.log(`      ▶️ Используем /adv/v1/stat/words для активной поисковой кампании ${campaign.advertId}`);
              if (currentEnd >= today) {
                monthKeywords = await fetchSearchCampaignKeywords(
                  apiToken,
                  campaign.advertId
                );
                hasData = false; // Этот endpoint не поддерживает исторические данные
              }
            }
          }
          
          if (monthKeywords.length > 0) {
            allKeywords.push(...monthKeywords);
          } else {
            hasData = false; // Нет данных, прекращаем запросы
          }
          
          // Переходим к следующему месяцу
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + 1);
          
          // Задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return {
          ...campaign,
          keywords: allKeywords || []
        };
      } catch (error: any) {
        console.log(`⚠️ [Product Campaigns] Ошибка загрузки ключевых слов для кампании ${campaign.advertId}: ${error.message}`);
        return {
          ...campaign,
          keywords: []
        };
      }
    })
  );
  
  // Группируем по статусам
  const groupedByStatus = {
    active: campaignsWithKeywords.filter((c: any) => c.status === 9),
    paused: campaignsWithKeywords.filter((c: any) => c.status === 11),
    completed: campaignsWithKeywords.filter((c: any) => c.status === 7),
    ready: campaignsWithKeywords.filter((c: any) => c.status === 4),
    other: campaignsWithKeywords.filter((c: any) => ![4, 7, 9, 11].includes(c.status))
  };
  
  // Подсчитываем общее количество ключевых слов
  const totalKeywords = campaignsWithKeywords.reduce((sum, c) => sum + (c.keywords?.length || 0), 0);
  
  console.log(`📊 [Product Campaigns] Активных: ${groupedByStatus.active.length}, На паузе: ${groupedByStatus.paused.length}, Завершенных: ${groupedByStatus.completed.length}`);
  console.log(`🔑 [Product Campaigns] Всего ключевых слов: ${totalKeywords}`);
  
  if (groupedByStatus.paused.length > 0 || groupedByStatus.completed.length > 0) {
    console.log(`ℹ️ [Product Campaigns] Для кампаний на паузе/завершенных исторические данные по ключевым словам недоступны через API`);
  }
  
  return {
    total: campaignsWithKeywords.length,
    campaigns: campaignsWithKeywords,
    groupedByStatus,
    summary: {
      active: groupedByStatus.active.length,
      paused: groupedByStatus.paused.length,
      completed: groupedByStatus.completed.length,
      ready: groupedByStatus.ready.length,
      other: groupedByStatus.other.length
    },
    totalKeywords
  };
}

// Функция для загрузки статистики по поисковым кластерам CPM кампании (тип 9)
async function fetchCampaignKeywords(
  apiToken: string,
  campaignId: number,
  nmId: number,
  startDate: string,
  endDate: string
) {
  try {
    // Используем /adv/v0/normquery/stats для получения статистики по поисковым кластерам
    // Работает ТОЛЬКО для CPM кампаний (тип 9)
    const url = `https://advert-api.wildberries.ru/adv/v0/normquery/stats`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: startDate,
        to: endDate,
        items: [{
          advert_id: campaignId,
          nm_id: nmId
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ [Keywords CPM] HTTP ${response.status} для кампании ${campaignId}: ${errorText.substring(0, 100)}`);
      return [];
    }
    
    const data = await response.json();
    
    // Структура ответа: { stats: [{ advert_id, nm_id, stats: [...] }] }
    if (data?.stats && Array.isArray(data.stats) && data.stats.length > 0) {
      const campaignData = data.stats.find((s: any) => s.advert_id === campaignId);
      if (campaignData?.stats && Array.isArray(campaignData.stats)) {
        console.log(`✅ [Keywords CPM] Кампания ${campaignId}: загружено ${campaignData.stats.length} кластеров`);
        return campaignData.stats;
      }
    }
    
    return [];
  } catch (error: any) {
    console.log(`⚠️ [Keywords CPM] Ошибка для кампании ${campaignId}: ${error.message}`);
    return [];
  }
}

// Функция для загрузки статистики поисковой кампании (тип 8)
async function fetchSearchCampaignKeywords(
  apiToken: string,
  campaignId: number
) {
  try {
    // Используем /adv/v1/stat/words для поисковых кампаний с ручной ставкой (тип 8)
    const url = `https://advert-api.wildberries.ru/adv/v1/stat/words?id=${campaignId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ [Keywords Search] HTTP ${response.status} для кампании ${campaignId}: ${errorText.substring(0, 100)}`);
      return [];
    }
    
    const data = await response.json();
    
    console.log(`📋 [Keywords Search] Кампания ${campaignId}: тип ответа=${typeof data}, isArray=${Array.isArray(data)}, length=${Array.isArray(data) ? data.length : 'N/A'}`);
    
    // Структура ответа: массив объектов с ключевыми фразами
    if (Array.isArray(data) && data.length > 0) {
      console.log(`✅ [Keywords Search] Кампания ${campaignId}: загружено ${data.length} ключевых фраз`);
      console.log(`📝 [Keywords Search] Первая фраза: ${JSON.stringify(data[0]).substring(0, 200)}`);
      return data;
    } else if (Array.isArray(data) && data.length === 0) {
      console.log(`⚠️ [Keywords Search] Кампания ${campaignId}: API вернул пустой массив (нет ключевых слов)`);
    } else {
      console.log(`⚠️ [Keywords Search] Кампания ${campaignId}: неожиданный формат ответа: ${JSON.stringify(data).substring(0, 200)}`);
    }
    
    return [];
  } catch (error: any) {
    console.log(`⚠️ [Keywords Search] Ошибка для кампании ${campaignId}: ${error.message}`);
    return [];
  }
}

// Функция для получения ключевых слов кампаний на паузе через /adv/v2/auto/stat-words
async function fetchPausedCampaignKeywords(
  apiToken: string,
  campaignId: number,
  startDate: string,
  endDate: string
) {
  try {
    // GET /adv/v2/auto/stat-words?id={campaignId}&from={startDate}&to={endDate}
    const url = `https://advert-api.wildberries.ru/adv/v2/auto/stat-words?id=${campaignId}&from=${startDate}&to=${endDate}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ [Keywords Paused] HTTP ${response.status} для кампании ${campaignId}: ${errorText.substring(0, 100)}`);
      return [];
    }
    
    const data = await response.json();
    
    // Структура ответа: массив объектов с ключевыми словами
    // [{ keyword: "платье", freq: 100, clicks: 10, ... }]
    if (Array.isArray(data) && data.length > 0) {
      console.log(`✅ [Keywords Paused] Кампания ${campaignId}: загружено ${data.length} ключевых слов`);
      return data;
    }
    
    return [];
  } catch (error: any) {
    console.log(`⚠️ [Keywords Paused] Ошибка для кампании ${campaignId}: ${error.message}`);
    return [];
  }
}

// Альтернативная функция для получения статистики по кластерам (только для CPM кампаний типа 9)
async function fetchCampaignClusters(
  apiToken: string,
  campaignId: number,
  nmId: number,
  startDate: string,
  endDate: string
) {
  try {
    // POST /adv/v2/search-cluster работает только для CPM кампаний
    const url = `https://advert-api.wildberries.ru/adv/v2/search-cluster`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: startDate,
        to: endDate,
        items: [{
          advert_id: campaignId,
          nm_id: nmId
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ [Clusters] HTTP ${response.status} для кампании ${campaignId}: ${errorText.substring(0, 100)}`);
      return [];
    }
    
    const data = await response.json();
    
    // Структура ответа: { stats: [{ advert_id, nm_id, stats: [...] }] }
    // stats содержит массив кластеров с полями:
    // {
    //   norm_query: "платье мусульманское",
    //   views: 1000,           // Показы
    //   clicks: 50,            // Клики
    //   ctr: 5.0,              // CTR (%)
    //   cpc: 15.5,             // Цена за клик (руб)
    //   cpm: 813,              // CPM
    //   orders: 5,             // Заказы
    //   atbs: 10,              // Добавления в корзину
    //   avg_pos: 12.5          // Средняя позиция
    // }
    
    if (data?.stats && Array.isArray(data.stats) && data.stats.length > 0) {
      // Извлекаем статистику из первого элемента (наша кампания)
      const campaignData = data.stats[0];
      if (campaignData?.stats && Array.isArray(campaignData.stats)) {
        return campaignData.stats;
      }
    }
    
    return [];
  } catch (error: any) {
    console.log(`⚠️ [Clusters] Ошибка для кампании ${campaignId}: ${error.message}`);
    return [];
  }
}
