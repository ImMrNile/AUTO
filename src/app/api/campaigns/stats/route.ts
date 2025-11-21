import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import prisma from '@/lib/prisma';

/**
 * API роутер для получения статистики рекламных кампаний
 * 
 * Возвращает все данные о кампаниях с фильтрацией по статусам:
 * - status=9 (активные)
 * - status=11 (на паузе)
 * - status=7 (завершенные)
 * - status=4 (готовы к запуску)
 */

// Типы кампаний WB
const CAMPAIGN_TYPES = {
  4: 'Каталог',
  5: 'Карточка товара',
  6: 'Поиск',
  7: 'Рекомендации',
  8: 'Автоматическая',
  9: 'Ручная ставка'
};

// Статусы кампаний WB
const CAMPAIGN_STATUSES = {
  4: 'Готова к запуску',
  7: 'Завершена',
  9: 'Активна',
  11: 'На паузе',
  8: 'Отменена',
  '-1': 'Удалена'
};

/**
 * Получение всех кампаний (типы 4-8 и тип 9)
 */
async function fetchAllCampaigns(apiToken: string) {
  const baseUrl = 'https://advert-api.wildberries.ru';
  
  console.log('🔍 [Campaign Stats] Запрос ВСЕХ кампаний через /count...');
  
  // Шаг 1: Получаем количество и ID всех кампаний
  const countResponse = await fetch(`${baseUrl}/adv/v0/count`, {
    method: 'GET',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    }
  });

  if (!countResponse.ok) {
    throw new Error(`HTTP ${countResponse.status}: ${await countResponse.text()}`);
  }

  const countData = await countResponse.json();
  
  // Разделяем ID по типам
  const type4to8Ids: number[] = [];
  const type9Ids: number[] = [];
  
  countData.adverts?.forEach((adv: any) => {
    if (adv.type === 9) {
      type9Ids.push(adv.advertId);
    } else if ([4, 5, 6, 7, 8].includes(adv.type)) {
      type4to8Ids.push(adv.advertId);
    }
  });

  console.log(`✅ [Campaign Stats] Получено ID: ${type4to8Ids.length} (тип 4-8), ${type9Ids.length} (тип 9), всего: ${type4to8Ids.length + type9Ids.length}`);

  const allCampaigns: any[] = [];

  // Шаг 2: Загружаем кампании типов 4-8
  if (type4to8Ids.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < type4to8Ids.length; i += batchSize) {
      const batch = type4to8Ids.slice(i, i + batchSize);
      
      const response = await fetch(`${baseUrl}/adv/v1/promotion/adverts`, {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batch)
      });

      if (response.ok) {
        const campaigns = await response.json();
        allCampaigns.push(...campaigns);
      }
    }
  }

  // Шаг 3: Загружаем кампании типа 9 (ручная ставка)
  if (type9Ids.length > 0) {
    const idsParam = type9Ids.join(',');
    const response = await fetch(
      `${baseUrl}/adv/v0/auction/adverts?ids=${idsParam}&statuses=-1,4,7,8,9,11`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const type9Campaigns = await response.json();
      
      // Нормализуем формат кампаний типа 9
      const normalizedType9 = type9Campaigns.map((c: any) => ({
        advertId: c.id,
        type: 9,
        status: c.status,
        name: c.name,
        createTime: c.createTime,
        changeTime: c.changeTime,
        startTime: c.startTime,
        endTime: c.endTime,
        dailyBudget: c.dailyBudget,
        autoParams: c.params
      }));
      
      allCampaigns.push(...normalizedType9);
    }
  }

  console.log(`✅ [Campaign Stats] Всего загружено: ${allCampaigns.length} кампаний`);
  return allCampaigns;
}

/**
 * Получение статистики кампаний за период
 */
async function fetchCampaignStats(
  apiToken: string,
  campaignIds: number[],
  startDate: string,
  endDate: string
) {
  if (campaignIds.length === 0) {
    return [];
  }

  const baseUrl = 'https://advert-api.wildberries.ru';
  const idsParam = campaignIds.join(',');
  
  const statsUrl = `${baseUrl}/adv/v3/fullstats?from=${startDate}&to=${endDate}&ids=${idsParam}`;
  
  console.log(`📊 [Campaign Stats] Запрос статистики для ${campaignIds.length} кампаний`);
  
  const response = await fetch(statsUrl, {
    method: 'GET',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [Campaign Stats] Ошибка получения статистики: ${response.status} ${errorText}`);
    return [];
  }

  const stats = await response.json();
  console.log(`✅ [Campaign Stats] Получена статистика для ${stats.length} кампаний`);
  
  return stats;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [Campaign Stats API] Запрос статистики кампаний');

    // Аутентификация
    const user = await AuthService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const cabinetId = searchParams.get('cabinetId');
    const statusFilter = searchParams.get('status'); // 9, 11, 7, 4, или "all"
    const days = parseInt(searchParams.get('days') || '30');

    // Получаем кабинет
    let cabinet;
    if (cabinetId) {
      cabinet = await prisma.cabinet.findFirst({
        where: {
          id: cabinetId,
          userId: user.id
        }
      });
    } else {
      cabinet = await prisma.cabinet.findFirst({
        where: { userId: user.id }
      });
    }

    if (!cabinet) {
      return NextResponse.json(
        { error: 'Кабинет не найден' },
        { status: 404 }
      );
    }

    console.log(`📋 [Campaign Stats API] Кабинет: ${cabinet.name}`);

    // Проверяем токен API (используем основной токен для продвижения)
    if (!cabinet.apiToken) {
      return NextResponse.json({
        success: false,
        error: 'API токен не настроен',
        campaigns: []
      });
    }

    // Получаем все кампании
    const allCampaigns = await fetchAllCampaigns(cabinet.apiToken);

    // Фильтруем по статусу
    let filteredCampaigns = allCampaigns;
    if (statusFilter && statusFilter !== 'all') {
      const statusNum = parseInt(statusFilter);
      filteredCampaigns = allCampaigns.filter(c => c.status === statusNum);
      console.log(`🔍 [Campaign Stats API] Фильтр по статусу ${statusNum}: ${filteredCampaigns.length} кампаний`);
    }

    // Рассчитываем период для статистики
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Получаем статистику для отфильтрованных кампаний
    const campaignIds = filteredCampaigns.map(c => c.advertId);
    const stats = await fetchCampaignStats(
      cabinet.apiToken,
      campaignIds,
      startDateStr,
      endDateStr
    );

    // Создаем карту статистики
    const statsMap = new Map(stats.map((s: any) => [s.advertId, s]));

    // Обогащаем данные кампаний статистикой
    const enrichedCampaigns = filteredCampaigns.map(campaign => {
      const stat = statsMap.get(campaign.advertId);
      
      return {
        // Основные данные кампании
        id: campaign.advertId,
        name: campaign.name,
        type: campaign.type,
        typeName: CAMPAIGN_TYPES[campaign.type as keyof typeof CAMPAIGN_TYPES] || 'Неизвестно',
        status: campaign.status,
        statusName: CAMPAIGN_STATUSES[campaign.status as keyof typeof CAMPAIGN_STATUSES] || 'Неизвестно',
        
        // Даты
        createTime: campaign.createTime,
        changeTime: campaign.changeTime,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
        
        // Бюджет
        dailyBudget: campaign.dailyBudget,
        
        // Параметры
        autoParams: campaign.autoParams,
        
        // Статистика за период (если есть)
        stats: stat ? {
          views: (stat as any).views || 0,
          clicks: (stat as any).clicks || 0,
          ctr: (stat as any).ctr || 0,
          cpc: (stat as any).cpc || 0,
          sum: (stat as any).sum || 0,
          atbs: (stat as any).atbs || 0,
          orders: (stat as any).orders || 0,
          cr: (stat as any).cr || 0,
          shks: (stat as any).shks || 0,
          sum_price: (stat as any).sum_price || 0
        } : null
      };
    });

    // Группируем по статусам
    const groupedByStatus = {
      active: enrichedCampaigns.filter(c => c.status === 9),
      paused: enrichedCampaigns.filter(c => c.status === 11),
      completed: enrichedCampaigns.filter(c => c.status === 7),
      ready: enrichedCampaigns.filter(c => c.status === 4),
      other: enrichedCampaigns.filter(c => ![4, 7, 9, 11].includes(c.status))
    };

    // Считаем общую статистику
    const totalStats = enrichedCampaigns.reduce((acc, campaign) => {
      if (campaign.stats) {
        acc.views += campaign.stats.views;
        acc.clicks += campaign.stats.clicks;
        acc.sum += campaign.stats.sum;
        acc.orders += campaign.stats.orders;
        acc.atbs += campaign.stats.atbs;
      }
      return acc;
    }, {
      views: 0,
      clicks: 0,
      sum: 0,
      orders: 0,
      atbs: 0
    });

    console.log(`✅ [Campaign Stats API] Возвращаем ${enrichedCampaigns.length} кампаний`);

    return NextResponse.json({
      success: true,
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
        days
      },
      summary: {
        total: allCampaigns.length,
        active: groupedByStatus.active.length,
        paused: groupedByStatus.paused.length,
        completed: groupedByStatus.completed.length,
        ready: groupedByStatus.ready.length,
        other: groupedByStatus.other.length
      },
      totalStats,
      campaigns: enrichedCampaigns,
      groupedByStatus
    });

  } catch (error: any) {
    console.error('❌ [Campaign Stats API] Ошибка:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Внутренняя ошибка сервера',
        campaigns: []
      },
      { status: 500 }
    );
  }
}
