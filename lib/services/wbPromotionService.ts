// lib/services/wbPromotionService.ts
// Сервис для работы с WB Promotion API (Реклама и продвижение)

interface CampaignListResponse {
  adverts: Array<{
    advertId: number;
    type: number;
    status: number;
    name: string;
    createTime: string;
    changeTime: string;
    startTime?: string;
    endTime?: string;
  }>;
  total: number;
}

interface CampaignInfo {
  advertId: number;
  type: number;
  status: number;
  name: string;
  createTime: string;
  changeTime: string;
  startTime?: string;
  endTime?: string;
  dailyBudget?: number;
  budget?: number;
  autoParams?: any;
  unitedParams?: any[];
  searchPluseState?: boolean;
}

interface CampaignStats {
  advertId: number;
  name: string;
  views: number;
  clicks: number;
  ctr: number;
  cpc: number;
  sum: number;
  atbs: number;
  orders: number;
  cr: number;
  shks: number;
  sum_price: number;
  dates: Array<{
    date: string;
    views: number;
    clicks: number;
    ctr: number;
    cpc: number;
    sum: number;
    atbs: number;
    orders: number;
    cr: number;
    shks: number;
    sum_price: number;
  }>;
}

interface KeywordStats {
  keyword: string;
  count: number;
  views: number;
  clicks: number;
  ctr: number;
  cpc: number;
  sum: number;
  atbs: number;
  orders: number;
  cr: number;
  sum_price: number;
}

interface PromotionCalendar {
  id: number;
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  type: string;
}

export class WbPromotionService {
  private readonly BASE_URL = 'https://advert-api.wildberries.ru';
  private readonly CALENDAR_BASE_URL = 'https://dp-calendar-api.wildberries.ru';
  private readonly ANALYTICS_URL = 'https://seller-analytics-api.wildberries.ru';

  /**
   * Получить список рекламных кампаний
   */
  async getCampaignsList(apiToken: string): Promise<CampaignListResponse> {
    try {
      console.log('📊 Получение списка рекламных кампаний...');

      const response = await fetch(`${this.BASE_URL}/adv/v1/promotion/count`, {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Проверяем, есть ли контент в ответе
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('✅ Получено кампаний: 0 (пустой ответ)');
        return { adverts: [], total: 0 };
      }

      const data = JSON.parse(text);
      console.log(`✅ Получено кампаний: ${data.total || 0}`);
      
      // Убеждаемся что total всегда есть
      return {
        adverts: data.adverts || [],
        total: data.total || 0
      };
    } catch (error: any) {
      console.error('❌ Ошибка получения списка кампаний:', error);
      throw error;
    }
  }

  /**
   * Получить информацию о кампаниях
   * Согласно WB API документации, этот метод требует POST запрос
   */
  async getCampaignsInfo(
    apiToken: string,
    params: {
      status?: number[];
      type?: number[];
      limit?: number;
      offset?: number;
      order?: 'create' | 'change' | 'id';
      direction?: 'desc' | 'asc';
    } = {}
  ): Promise<CampaignInfo[]> {
    try {
      console.log('📊 Получение информации о кампаниях...');

      // Формируем query параметры для URL
      const queryParams = new URLSearchParams();
      if (params.status) params.status.forEach(s => queryParams.append('status', s.toString()));
      if (params.type) params.type.forEach(t => queryParams.append('type', t.toString()));
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.order) queryParams.append('order', params.order);
      if (params.direction) queryParams.append('direction', params.direction);

      // WB API требует POST запрос с пустым массивом в теле
      const response = await fetch(
        `${this.BASE_URL}/adv/v1/promotion/adverts?${queryParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([]) // Пустой массив для получения всех кампаний
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Проверяем, есть ли контент в ответе
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('✅ Получено кампаний: 0 (пустой ответ)');
        return [];
      }

      const data = JSON.parse(text);
      console.log(`✅ Получено кампаний: ${data.length || 0}`);
      
      return data;
    } catch (error: any) {
      console.error('❌ Ошибка получения информации о кампаниях:', error);
      throw error;
    }
  }

  /**
   * Получить статистику по кампаниям
   */
  async getCampaignsStats(
    apiToken: string,
    campaignIds: number[],
    dateFrom: string,
    dateTo: string
  ): Promise<CampaignStats[]> {
    try {
      console.log(`📊 Получение статистики по ${campaignIds.length} кампаниям...`);
      console.log(`📅 Период: ${dateFrom} - ${dateTo}`);

      const queryParams = new URLSearchParams();
      campaignIds.forEach(id => queryParams.append('id', id.toString()));
      queryParams.append('from', dateFrom);
      queryParams.append('to', dateTo);

      const response = await fetch(
        `${this.BASE_URL}/adv/v3/fullstats?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Проверяем, есть ли контент в ответе
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('✅ Получена статистика: 0 кампаний (пустой ответ)');
        return [];
      }

      const data = JSON.parse(text);
      console.log(`✅ Получена статистика по ${data.length || 0} кампаниям`);
      
      return data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения статистики кампаний:', error);
      throw error;
    }
  }

  /**
   * Получить статистику по ключевым словам
   */
  async getKeywordsStats(
    apiToken: string,
    campaignId: number
  ): Promise<KeywordStats[]> {
    try {
      console.log(`📊 Получение статистики по ключевым словам для кампании ${campaignId}...`);

      const response = await fetch(
        `${this.BASE_URL}/adv/v1/stat/words?id=${campaignId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Проверяем, есть ли контент в ответе
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('✅ Получена статистика: 0 ключевых слов (пустой ответ)');
        return [];
      }

      const data = JSON.parse(text);
      console.log(`✅ Получена статистика по ${data.length || 0} ключевым словам`);
      
      return data || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения статистики по ключевым словам:', error);
      throw error;
    }
  }

  /**
   * Получить баланс рекламного кабинета
   */
  async getBalance(apiToken: string): Promise<number> {
    try {
      console.log('💰 Получение баланса рекламного кабинета...');

      const response = await fetch(`${this.BASE_URL}/adv/v1/balance`, {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Проверяем, есть ли контент в ответе
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log('✅ Баланс: 0₽ (пустой ответ)');
        return 0;
      }

      const data = JSON.parse(text);
      console.log(`✅ Баланс: ${data.balance || 0}₽`);
      
      return data.balance || 0;
    } catch (error: any) {
      console.error('❌ Ошибка получения баланса:', error);
      throw error;
    }
  }

  /**
   * Получить календарь акций WB
   */
  async getPromotionsCalendar(
    apiToken: string,
    dateFrom: string,
    dateTo: string,
    showAll: boolean = false
  ): Promise<PromotionCalendar[]> {
    try {
      console.log('📅 Получение календаря акций WB...');
      console.log(`📅 Период: ${dateFrom} - ${dateTo}`);

      const queryParams = new URLSearchParams({
        startDateTime: dateFrom,
        endDateTime: dateTo,
        allPromo: showAll.toString()
      });

      const response = await fetch(
        `${this.CALENDAR_BASE_URL}/api/v1/calendar/promotions?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено акций: ${data.data?.promotions?.length || 0}`);
      
      return data.data?.promotions || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения календаря акций:', error);
      throw error;
    }
  }

  /**
   * Получить товары для участия в акции
   */
  async getPromotionProducts(
    apiToken: string,
    promotionId: number
  ): Promise<any[]> {
    try {
      console.log(`📦 Получение товаров для акции ${promotionId}...`);

      const response = await fetch(
        `${this.CALENDAR_BASE_URL}/api/v1/calendar/promotions/nomenclatures?promotionID=${promotionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено товаров: ${data.data?.nomenclatures?.length || 0}`);
      
      return data.data?.nomenclatures || [];
    } catch (error: any) {
      console.error('❌ Ошибка получения товаров для акции:', error);
      throw error;
    }
  }

  /**
   * Агрегированная статистика для дашборда
   */
  async getDashboardStats(
    apiToken: string,
    days: number = 30
  ): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpent: number;
    totalViews: number;
    totalClicks: number;
    avgCTR: number;
    avgCPC: number;
    totalOrders: number;
    avgCR: number;
    balance: number;
    topCampaigns: Array<{
      id: number;
      name: string;
      views: number;
      clicks: number;
      orders: number;
      spent: number;
      roi: number;
    }>;
    topKeywords: KeywordStats[];
    allCampaigns: CampaignInfo[];
  }> {
    try {
      console.log(`📊 Получение агрегированной статистики за ${days} дней...`);

      // Получаем список кампаний
      const campaignsList = await this.getCampaignsList(apiToken);
      
      // Получаем ВСЕ кампании за весь период (активные + неактивные) с обработкой ошибок
      let allCampaigns: CampaignInfo[] = [];
      let activeCampaigns: CampaignInfo[] = [];
      try {
        // Запрашиваем ВСЕ кампании со всеми статусами БЕЗ ограничения по дате
        // Статусы WB: 4-готова к запуску, 7-завершена, 8-отказался, 9-активна, 11-на паузе
        allCampaigns = await this.getCampaignsInfo(apiToken, {
          status: [4, 7, 8, 9, 11], // Все возможные статусы
          limit: 1000, // Увеличиваем лимит для всех кампаний
          order: 'create',
          direction: 'desc'
        });
        
        // Фильтруем активные для статистики
        activeCampaigns = allCampaigns.filter(c => c.status === 9);
        
        console.log(`📊 Всего кампаний за весь период: ${allCampaigns.length}, активных: ${activeCampaigns.length}`);
      } catch (error: any) {
        console.warn('⚠️ Не удалось получить информацию о кампаниях:', error.message);
        // Продолжаем с пустым массивом
      }

      // Получаем баланс с обработкой ошибок
      let balance = 0;
      try {
        balance = await this.getBalance(apiToken);
      } catch (error: any) {
        console.warn('⚠️ Не удалось получить баланс:', error.message);
      }

      // Формируем период для СТАТИСТИКИ (за выбранные дни)
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const dateToStr = dateTo.toISOString().split('T')[0];
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      console.log(`📊 Период статистики: ${days} дней (${dateFromStr} - ${dateToStr})`);

      // Получаем статистику по ВСЕМ кампаниям за выбранный период
      let campaignsStats: CampaignStats[] = [];
      if (allCampaigns.length > 0) {
        try {
          // Берем все кампании для статистики (не только активные)
          const campaignIds = allCampaigns.slice(0, 100).map(c => c.advertId);
          campaignsStats = await this.getCampaignsStats(
            apiToken,
            campaignIds,
            dateFromStr,
            dateToStr
          );
        } catch (error: any) {
          console.warn('⚠️ Не удалось получить статистику кампаний:', error.message);
          // Продолжаем с пустым массивом
        }
      }

      // Агрегируем данные
      let totalViews = 0;
      let totalClicks = 0;
      let totalSpent = 0;
      let totalOrders = 0;
      let totalRevenue = 0;

      const topCampaigns = campaignsStats
        .map(campaign => {
          totalViews += campaign.views || 0;
          totalClicks += campaign.clicks || 0;
          totalSpent += campaign.sum || 0;
          totalOrders += campaign.orders || 0;
          totalRevenue += campaign.sum_price || 0;

          return {
            id: campaign.advertId,
            name: campaign.name,
            views: campaign.views || 0,
            clicks: campaign.clicks || 0,
            orders: campaign.orders || 0,
            spent: campaign.sum || 0,
            roi: campaign.sum > 0 
              ? ((campaign.sum_price - campaign.sum) / campaign.sum * 100) 
              : 0
          };
        })
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 10);

      const avgCTR = totalViews > 0 ? (totalClicks / totalViews * 100) : 0;
      const avgCPC = totalClicks > 0 ? (totalSpent / totalClicks) : 0;
      const avgCR = totalClicks > 0 ? (totalOrders / totalClicks * 100) : 0;

      // Получаем топ ключевых слов (для первой активной кампании)
      let topKeywords: KeywordStats[] = [];
      if (activeCampaigns.length > 0) {
        try {
          topKeywords = await this.getKeywordsStats(apiToken, activeCampaigns[0].advertId);
          topKeywords = topKeywords
            .sort((a, b) => b.sum - a.sum)
            .slice(0, 20);
        } catch (error) {
          console.warn('⚠️ Не удалось получить статистику по ключевым словам');
        }
      }

      console.log(`✅ Агрегированная статистика получена:`, {
        totalCampaigns: allCampaigns.length, // За весь период
        activeCampaigns: activeCampaigns.length,
        totalSpent, // За выбранный период (${days} дней)
        totalViews,
        totalClicks,
        period: `${days} дней`
      });

      return {
        totalCampaigns: allCampaigns.length, // Все кампании (активные + неактивные)
        activeCampaigns: activeCampaigns.length,
        totalSpent,
        totalViews,
        totalClicks,
        avgCTR,
        avgCPC,
        totalOrders,
        avgCR,
        balance,
        topCampaigns,
        topKeywords,
        allCampaigns // Все кампании для отображения в интерфейсе
      };
    } catch (error: any) {
      console.error('❌ Ошибка получения агрегированной статистики:', error);
      throw error;
    }
  }
}

export const wbPromotionService = new WbPromotionService();
