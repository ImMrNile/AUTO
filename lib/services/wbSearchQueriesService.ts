// lib/services/wbSearchQueriesService.ts - Сервис для работы с WB Analytics API поисковых запросов

import { WB_API_CONFIG } from '../config/wbApiConfig';

export interface WbSearchQuery {
  query: string;
  frequency: number;
  position: number;
  ctr: number;
  conversion: number;
  clicks?: number;
  impressions?: number;
  orders?: number;
  revenue?: number;
}

export interface WbSearchReportRequest {
  currentPeriod: {
    start: string;
    end: string;
  };
  pastPeriod?: {
    start: string;
    end: string;
  };
  subjectIds?: number[];
  brandNames?: string[];
  nmIds?: number[];
  tagIds?: number[];
  positionCluster: 'all' | 'firstHundred' | 'secondHundred' | 'below';
  orderBy: {
    field: string;
    mode: 'asc' | 'desc';
  };
  includeSubstitutedSKUs?: boolean;
  includeSearchTexts?: boolean;
  limit: number;
  offset: number;
}

export interface CategorySearchQueries {
  categoryId: number;
  categoryName?: string;
  topQueries: WbSearchQuery[];
  totalQueries: number;
  dataSource: 'wb_analytics' | 'fallback';
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
}

export class WbSearchQueriesService {
  private readonly analyticsBaseUrl = 'https://seller-analytics-api.wildberries.ru';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Проверка валидности токена для Analytics API
   */
  private validateAnalyticsToken(token: string): boolean {
    try {
      const segments = token.split('.');
      if (segments.length !== 3) {
        return false;
      }
      
      const payload = JSON.parse(atob(segments[1]));
      
      // Проверяем срок действия
      if (Date.now() > payload.exp * 1000) {
        console.warn('⚠️ Analytics токен истек');
        return false;
      }
      
      // Проверяем права доступа к аналитике (бит 1)
      const hasAnalyticsAccess = (payload.s & (1 << 1)) !== 0;
      if (!hasAnalyticsAccess) {
        console.warn('⚠️ Токен не имеет прав доступа к Analytics API');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка валидации Analytics токена:', error);
      return false;
    }
  }

  /**
   * Универсальный метод для запросов к WB Analytics API
   */
  private async makeAnalyticsRequest(
    endpoint: string, 
    method: 'GET' | 'POST' = 'POST',
    data?: any,
    retryCount: number = 0
  ): Promise<any> {
    const maxRetries = 2;
    
    if (!this.validateAnalyticsToken(this.apiToken)) {
      throw new Error('Недействительный или просроченный токен Analytics API');
    }

    const url = `${this.analyticsBaseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WB-AI-Analytics/2.0'
    };

    const options: RequestInit = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) })
    };

    console.log(`🌐 Analytics API запрос (попытка ${retryCount + 1}/${maxRetries + 1}): ${endpoint}`);

    try {
      const controller = new AbortController();
      const timeout = 30000; // 30 секунд
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }

        // Обработка специфичных ошибок WB Analytics API
        if (response.status === 401) {
          throw new Error('Токен Analytics API недействителен или истек');
        } else if (response.status === 403) {
          throw new Error('Нет доступа к Analytics API. Требуется подписка Джем');
        } else if (response.status === 429) {
          if (retryCount < maxRetries) {
            const delay = Math.min(2000 * Math.pow(2, retryCount), 10000);
            console.warn(`⏰ Rate limit, ждем ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.makeAnalyticsRequest(endpoint, method, data, retryCount + 1);
          }
          throw new Error('Превышен лимит запросов к Analytics API');
        }

        throw new Error(`Analytics API Error ${response.status}: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log(`✅ Analytics API ответ получен: ${JSON.stringify(result).length} символов`);
      return result;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Таймаут запроса к Analytics API');
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retryCount < maxRetries && !errorMessage.includes('401') && !errorMessage.includes('403')) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.warn(`⚠️ Повторная попытка через ${delay}ms:`, errorMessage);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeAnalyticsRequest(endpoint, method, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Получение топ поисковых запросов для категории
   */
  async getCategoryTopSearchQueries(
    categoryId: number,
    limit: number = 20,
    daysBack: number = 30
  ): Promise<CategorySearchQueries> {
    try {
      console.log(`🔍 Получение топ-${limit} поисковых запросов для категории ${categoryId}`);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      const requestData: WbSearchReportRequest = {
        currentPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        subjectIds: [categoryId],
        positionCluster: 'all',
        orderBy: {
          field: 'openCard', // Сортировка по количеству переходов в карточку
          mode: 'desc'
        },
        includeSubstitutedSKUs: true,
        includeSearchTexts: true,
        limit: Math.min(limit, 100), // WB API лимит
        offset: 0
      };

      // Основной отчет по поисковым запросам
      const reportData = await this.makeAnalyticsRequest(
        '/api/v2/search-report/report',
        'POST',
        requestData
      );

      if (reportData?.data?.groups?.length > 0) {
        console.log(`✅ Получено ${reportData.data.groups.length} групп поисковых запросов`);
        
        // Извлекаем поисковые запросы из групп
        const queries = this.extractQueriesFromReport(reportData.data.groups);
        
        return {
          categoryId,
          topQueries: queries.slice(0, limit),
          totalQueries: queries.length,
          dataSource: 'wb_analytics',
          generatedAt: new Date().toISOString(),
          period: {
            start: requestData.currentPeriod.start,
            end: requestData.currentPeriod.end
          }
        };
      }

      // Если основной отчет пуст, пробуем получить данные по товарам в категории
      console.log('⚠️ Основной отчет пуст, пробуем альтернативный метод...');
      return await this.getCategoryQueriesAlternative(categoryId, limit, daysBack);

    } catch (error) {
      console.error('❌ Ошибка получения поисковых запросов:', error);
      
      // Fallback на базовые ключевые слова
      return this.getFallbackQueries(categoryId, limit);
    }
  }

  /**
   * Альтернативный метод получения запросов через анализ товаров категории
   */
  private async getCategoryQueriesAlternative(
    categoryId: number,
    limit: number,
    daysBack: number
  ): Promise<CategorySearchQueries> {
    try {
      // Получаем товары категории из основного API
      const productsResponse = await fetch(`/api/wb/categories/${categoryId}/products?limit=50`);
      
      if (!productsResponse.ok) {
        throw new Error('Не удалось получить товары категории');
      }
      
      const productsData = await productsResponse.json();
      const nmIds = productsData.data?.products?.map((p: any) => p.nmId).filter(Boolean) || [];
      
      if (nmIds.length === 0) {
        throw new Error('Не найдены товары в категории');
      }

      console.log(`📦 Найдено ${nmIds.length} товаров для анализа запросов`);

      // Получаем поисковые запросы по товарам
      const queries: WbSearchQuery[] = [];
      
      // Обрабатываем товары пачками по 10 (лимит API)
      for (let i = 0; i < Math.min(nmIds.length, 30); i += 10) {
        const batch = nmIds.slice(i, i + 10);
        
        try {
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
          
          const searchTextsData = await this.makeAnalyticsRequest(
            '/api/v2/search-report/product/search-texts',
            'POST',
            {
              currentPeriod: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
              },
              nmIds: batch,
              topOrderBy: 'openCard',
              includeSubstitutedSKUs: true,
              includeSearchTexts: true,
              orderBy: {
                field: 'openCard',
                mode: 'desc'
              },
              limit: 20
            }
          );

          if (searchTextsData?.data?.items?.length > 0) {
            const batchQueries = this.extractQueriesFromSearchTexts(searchTextsData.data.items);
            queries.push(...batchQueries);
          }

        } catch (batchError) {
          console.warn(`⚠️ Ошибка обработки пачки товаров:`, batchError);
        }
      }

      if (queries.length > 0) {
        // Агрегируем и сортируем запросы
        const aggregatedQueries = this.aggregateQueries(queries);
        
        return {
          categoryId,
          topQueries: aggregatedQueries.slice(0, limit),
          totalQueries: aggregatedQueries.length,
          dataSource: 'wb_analytics',
          generatedAt: new Date().toISOString(),
          period: {
            start: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          }
        };
      }

      throw new Error('Не удалось получить поисковые запросы альтернативным методом');

    } catch (error) {
      console.error('❌ Ошибка альтернативного метода:', error);
      return this.getFallbackQueries(categoryId, limit);
    }
  }

  /**
   * Извлечение запросов из основного отчета
   */
  private extractQueriesFromReport(groups: any[]): WbSearchQuery[] {
    const queries: WbSearchQuery[] = [];
    
    groups.forEach(group => {
      if (group.searchTexts && Array.isArray(group.searchTexts)) {
        group.searchTexts.forEach((item: any) => {
          queries.push({
            query: item.searchText || item.query || '',
            frequency: item.openCard || item.impressions || 0,
            position: item.avgPosition || 0,
            ctr: item.ctr || 0,
            conversion: item.cartToOrder || item.conversion || 0,
            clicks: item.openCard || 0,
            impressions: item.impressions || 0,
            orders: item.orders || 0,
            revenue: item.revenue || 0
          });
        });
      }
    });

    return queries.filter(q => q.query.length > 0);
  }

  /**
   * Извлечение запросов из данных по товарам
   */
  private extractQueriesFromSearchTexts(items: any[]): WbSearchQuery[] {
    return items.map(item => ({
      query: item.searchText || item.query || '',
      frequency: item.openCard || item.impressions || 0,
      position: item.avgPosition || 0,
      ctr: item.ctr || 0,
      conversion: item.cartToOrder || item.conversion || 0,
      clicks: item.openCard || 0,
      impressions: item.impressions || 0,
      orders: item.orders || 0,
      revenue: item.revenue || 0
    })).filter(q => q.query.length > 0);
  }

  /**
   * Агрегация дублирующихся запросов
   */
  private aggregateQueries(queries: WbSearchQuery[]): WbSearchQuery[] {
    const queryMap = new Map<string, WbSearchQuery>();
    
    queries.forEach(query => {
      const key = query.query.toLowerCase().trim();
      
      if (queryMap.has(key)) {
        const existing = queryMap.get(key)!;
        existing.frequency += query.frequency;
        existing.clicks = (existing.clicks || 0) + (query.clicks || 0);
        existing.impressions = (existing.impressions || 0) + (query.impressions || 0);
        existing.orders = (existing.orders || 0) + (query.orders || 0);
        existing.revenue = (existing.revenue || 0) + (query.revenue || 0);
        
        // Пересчитываем средние значения
        existing.position = (existing.position + query.position) / 2;
        existing.ctr = existing.impressions > 0 ? (existing.clicks || 0) / existing.impressions : 0;
        existing.conversion = (existing.clicks || 0) > 0 ? (existing.orders || 0) / (existing.clicks || 0) : 0;
      } else {
        queryMap.set(key, { ...query });
      }
    });

    return Array.from(queryMap.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Fallback запросы для категории
   */
  private getFallbackQueries(categoryId: number, limit: number): CategorySearchQueries {
    console.log(`⚠️ Используем fallback запросы для категории ${categoryId}`);
    
    // Базовые запросы по категориям
    const categoryQueries: { [key: number]: string[] } = {
      // Электроника
      963: ['кабель usb', 'зарядное устройство', 'провод для телефона', 'кабель type c', 'lightning кабель'],
      964: ['чехол для телефона', 'защитное стекло', 'держатель для телефона', 'powerbank', 'наушники'],
      
      // Дом и сад  
      14727: ['для дома', 'товары для дома', 'хозяйственные товары', 'бытовые принадлежности', 'домашние мелочи'],
      2674: ['кухонные принадлежности', 'посуда', 'для кухни', 'кухонная утварь', 'столовые приборы'],
      
      // Красота и здоровье
      1234: ['крем для лица', 'уход за кожей', 'косметика', 'сыворотка', 'маска для лица'],
      1236: ['шампунь', 'уход за волосами', 'маска для волос', 'кондиционер', 'средство для волос'],
      
      // Фены для волос (ID: 453)
      453: ['фен для волос', 'фен профессиональный', 'фен мощный', 'фен для укладки', 'фен с диффузором', 'фен ионизация', 'фен керамический', 'фен турмалиновый', 'фен для салона', 'фен быстрая сушка', 'фен с насадками', 'фен компактный', 'фен дорожный', 'фен недорого', 'фен качественный', 'фен для дома', 'фен стайлинг', 'фен укладка волос', 'фен профессиональная сушка', 'фен красота волос'],
      
      // Одежда
      629: ['футболка', 'майка', 'топ', 'блузка', 'рубашка'],
      630: ['джинсы', 'брюки', 'штаны', 'леггинсы', 'шорты'],
      
      // Обувь
      566: ['кроссовки', 'кеды', 'спортивная обувь', 'повседневная обувь', 'удобная обувь'],
      567: ['туфли', 'босоножки', 'сандалии', 'балетки', 'классическая обувь'],
      
      // Спорт
      679: ['спортивная одежда', 'для фитнеса', 'спортивный костюм', 'леггинсы для спорта', 'топ для фитнеса'],
      680: ['спортивный инвентарь', 'для тренировок', 'фитнес аксессуары', 'спортивные товары'],
      
      // Детские товары
      1587: ['детская одежда', 'для детей', 'детские вещи', 'одежда для ребенка', 'детский гардероб'],
      1588: ['игрушки', 'развивающие игрушки', 'детские игрушки', 'для развития', 'обучающие игрушки']
    };

    const queries = categoryQueries[categoryId] || [
      'качественный товар',
      'недорого',
      'выгодная цена',
      'хорошее качество',
      'популярный товар'
    ];

    const topQueries: WbSearchQuery[] = queries.slice(0, limit).map((query, index) => ({
      query,
      frequency: 1000 - (index * 50),
      position: index + 1,
      ctr: Math.max(0.01, 0.1 - (index * 0.01)),
      conversion: Math.max(0.005, 0.05 - (index * 0.005)),
      clicks: Math.floor((1000 - (index * 50)) * (0.1 - (index * 0.01))),
      impressions: 1000 - (index * 50),
      orders: Math.floor((1000 - (index * 50)) * 0.02),
      revenue: Math.floor((1000 - (index * 50)) * 0.02 * 500)
    }));

    return {
      categoryId,
      topQueries,
      totalQueries: topQueries.length,
      dataSource: 'fallback',
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  }

  /**
   * Форматирование запросов для использования в SEO
   */
  static formatQueriesForSEO(queries: WbSearchQuery[], maxQueries: number = 20): string {
    if (!queries || queries.length === 0) {
      return '';
    }

    const topQueries = queries
      .slice(0, maxQueries)
      .filter(q => q.query.length > 2)
      .map(q => q.query.toLowerCase().trim())
      .filter((query, index, array) => array.indexOf(query) === index); // убираем дубликаты

    return topQueries.join(', ');
  }

  /**
   * Анализ интента поисковых запросов
   */
  static analyzeQueryIntents(queries: WbSearchQuery[]): {
    commercial: WbSearchQuery[];
    informational: WbSearchQuery[];
    transactional: WbSearchQuery[];
  } {
    const commercial: WbSearchQuery[] = [];
    const informational: WbSearchQuery[] = [];
    const transactional: WbSearchQuery[] = [];

    const commercialWords = ['лучший', 'топ', 'рейтинг', 'отзывы', 'сравнение', 'какой', 'выбрать'];
    const transactionalWords = ['купить', 'заказать', 'цена', 'стоимость', 'доставка', 'скидка', 'акция'];
    
    queries.forEach(query => {
      const lowerQuery = query.query.toLowerCase();
      
      if (transactionalWords.some(word => lowerQuery.includes(word))) {
        transactional.push(query);
      } else if (commercialWords.some(word => lowerQuery.includes(word))) {
        commercial.push(query);
      } else {
        informational.push(query);
      }
    });

    return { commercial, informational, transactional };
  }
}

export default WbSearchQueriesService;
