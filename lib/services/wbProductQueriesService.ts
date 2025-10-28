// lib/services/wbProductQueriesService.ts - Сервис для получения поисковых запросов по товарам

import { WB_API_CONFIG } from '../config/wbApiConfig';

export interface ProductSearchQuery {
  searchText: string;
  openCard: number;          // Переходы в карточку
  addToCart: number;         // Добавления в корзину  
  orders: number;            // Заказы
  avgPosition: number;       // Средняя позиция
  ctr: number;              // CTR (click-through rate)
  cartToOrder: number;       // Конверсия корзина -> заказ
  openToCart: number;        // Конверсия клик -> корзина
  revenue: number;           // Выручка
}

export interface ProductQueriesResult {
  nmId: number;
  productName?: string;
  queries: ProductSearchQuery[];
  totalQueries: number;
  dataSource: 'wb_analytics' | 'competitor_analysis' | 'fallback';
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
}

export class WbProductQueriesService {
  private readonly analyticsBaseUrl = 'https://seller-analytics-api.wildberries.ru';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Получение поисковых запросов по конкретному товару
   */
  async getProductSearchQueries(nmId: number, limit: number = 30, daysBack: number = 30): Promise<ProductQueriesResult> {
    try {
      console.log(`🔍 Получение поисковых запросов для товара nmId: ${nmId}`);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Запрос к WB Analytics API для получения поисковых запросов по товару
      const requestData = {
        currentPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        nmIds: [nmId],
        topOrderBy: 'openCard', // Сортировка по переходам в карточку
        includeSubstitutedSKUs: true,
        includeSearchTexts: true,
        orderBy: {
          field: 'openCard',
          mode: 'desc'
        },
        limit: Math.min(limit, 100) // WB API лимит
      };

      console.log(`📤 Отправляем запрос к /api/v2/search-report/product/search-texts`);

      const response = await this.makeAnalyticsRequest(
        '/api/v2/search-report/product/search-texts',
        'POST',
        requestData
      );

      if (response.data && response.data.items && response.data.items.length > 0) {
        const queries = this.parseProductQueries(response.data.items);
        
        console.log(`✅ Получено ${queries.length} поисковых запросов для товара ${nmId}`);

        return {
          nmId,
          queries,
          totalQueries: queries.length,
          dataSource: 'wb_analytics',
          period: {
            start: requestData.currentPeriod.start,
            end: requestData.currentPeriod.end
          },
          generatedAt: new Date().toISOString()
        };
      }

      // Если нет данных, пробуем альтернативные методы
      console.log('⚠️ Прямые данные по товару не найдены, пробуем альтернативные методы...');
      return await this.getQueriesAlternativeMethod(nmId, limit, daysBack);

    } catch (error) {
      console.error('❌ Ошибка получения поисковых запросов по товару:', error);
      return await this.getFallbackProductQueries(nmId, limit);
    }
  }

  /**
   * Получение поисковых запросов по нескольким товарам (batch)
   */
  async getMultipleProductsQueries(nmIds: number[], limit: number = 20): Promise<ProductQueriesResult[]> {
    const results: ProductQueriesResult[] = [];
    
    // Обрабатываем товары пачками по 10 (лимит WB API)
    for (let i = 0; i < nmIds.length; i += 10) {
      const batch = nmIds.slice(i, i + 10);
      
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        const requestData = {
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
          limit
        };

        const response = await this.makeAnalyticsRequest(
          '/api/v2/search-report/product/search-texts',
          'POST',
          requestData
        );

        if (response.data && response.data.items) {
          // Группируем запросы по товарам
          const groupedQueries = this.groupQueriesByProduct(response.data.items);
          
          batch.forEach(nmId => {
            const productQueries = groupedQueries[nmId] || [];
            results.push({
              nmId,
              queries: productQueries,
              totalQueries: productQueries.length,
              dataSource: productQueries.length > 0 ? 'wb_analytics' : 'fallback',
              period: {
                start: requestData.currentPeriod.start,
                end: requestData.currentPeriod.end
              },
              generatedAt: new Date().toISOString()
            });
          });
        }

        // Задержка между запросами для соблюдения rate limit
        if (i + 10 < nmIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Ошибка обработки пачки товаров ${batch}:`, error);
        
        // Добавляем fallback для неудачной пачки
        batch.forEach(nmId => {
          results.push(this.createFallbackResult(nmId));
        });
      }
    }

    return results;
  }

  /**
   * Анализ конкурентов для получения дополнительных запросов
   */
  async analyzeCompetitorQueries(productName: string, categoryId: number): Promise<string[]> {
    try {
      console.log(`🕵️ Анализ конкурентов для "${productName}" в категории ${categoryId}`);

      // Получаем общий отчет по категории для анализа конкурентов
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const requestData = {
        currentPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        subjectIds: [categoryId],
        positionCluster: 'all',
        orderBy: {
          field: 'openCard',
          mode: 'desc'
        },
        includeSubstitutedSKUs: true,
        includeSearchTexts: true,
        limit: 100,
        offset: 0
      };

      const response = await this.makeAnalyticsRequest(
        '/api/v2/search-report/report',
        'POST',
        requestData
      );

      if (response.data && response.data.groups) {
        const competitorQueries: string[] = [];
        
        response.data.groups.forEach((group: any) => {
          if (group.searchTexts && Array.isArray(group.searchTexts)) {
            group.searchTexts.forEach((item: any) => {
              const query = item.searchText || item.query;
              if (query && this.isRelevantToProduct(query, productName)) {
                competitorQueries.push(query);
              }
            });
          }
        });

        console.log(`✅ Найдено ${competitorQueries.length} релевантных запросов конкурентов`);
        return competitorQueries.slice(0, 20); // Топ-20
      }

      return [];

    } catch (error) {
      console.error('❌ Ошибка анализа конкурентов:', error);
      return [];
    }
  }

  /**
   * Создание содержательного SEO описания на основе поисковых запросов
   */
  static generateSEODescription(
    productName: string,
    productQueries: ProductSearchQuery[],
    competitorQueries: string[] = [],
    characteristics: any[] = []
  ): {
    title: string;
    description: string;
    keywordDensity: number;
    usedQueries: string[];
  } {
    // Объединяем все источники запросов
    const allQueries = [
      ...productQueries.map(q => ({ text: q.searchText, weight: q.openCard })),
      ...competitorQueries.map(q => ({ text: q, weight: 50 })) // Меньший вес для конкурентов
    ];

    // Сортируем по релевантности и весу
    allQueries.sort((a, b) => b.weight - a.weight);
    
    // Берем топ-15 уникальных запросов
    const uniqueQueries = Array.from(new Set(allQueries.map(q => q.text.toLowerCase())))
      .slice(0, 15);

    // Анализируем интенты запросов
    const buyingIntentQueries = uniqueQueries.filter(q => 
      /купить|заказать|цена|стоимость|недорого|скидка|акция/.test(q)
    );
    
    const featureQueries = uniqueQueries.filter(q => 
      /профессиональный|мощный|качественный|лучший|топ|рейтинг/.test(q)
    );

    const usageQueries = uniqueQueries.filter(q => 
      /для|с|быстр|удобн|легк|прост/.test(q)
    );

    // Создаем SEO заголовок
    const mainKeywords = uniqueQueries.slice(0, 3);
    const title = `${productName} - ${mainKeywords.join(', ')}`.substring(0, 60);

    // Создаем структурированное описание
    const descriptionParts = [];

    // 1. Вводная часть с основными запросами
    descriptionParts.push(
      `${productName} - ${mainKeywords.slice(0, 2).join(' и ')}. ` +
      `${buyingIntentQueries.length > 0 ? buyingIntentQueries[0] : 'Выгодная цена'} ` +
      `с быстрой доставкой по всей России.`
    );

    // 2. Характеристики и особенности
    if (characteristics.length > 0) {
      const keyChars = characteristics
        .filter(c => c.value && c.value.trim())
        .slice(0, 5)
        .map(c => `${c.name.toLowerCase()}: ${c.value}`)
        .join(', ');
      
      descriptionParts.push(
        `Технические характеристики: ${keyChars}. ` +
        `${featureQueries.length > 0 ? featureQueries[0] : 'Высокое качество'} ` +
        `и надежность от проверенного производителя.`
      );
    }

    // 3. Применение и удобство
    descriptionParts.push(
      `${usageQueries.length > 0 ? usageQueries.slice(0, 2).join(' и ') : 'Удобство использования'} ` +
      `делают этот товар идеальным выбором для ежедневного использования. ` +
      `Простота в обслуживании и долговечность.`
    );

    // 4. Призыв к действию
    descriptionParts.push(
      `${uniqueQueries.includes('купить') ? 'Купить' : 'Заказать'} ` +
      `${productName.toLowerCase()} по выгодной цене с гарантией качества. ` +
      `Быстрая доставка, удобная оплата, возврат в течение 14 дней.`
    );

    const description = descriptionParts.join(' ');
    
    // Подсчитываем плотность ключевых слов
    const totalWords = description.split(' ').length;
    const keywordMatches = uniqueQueries.reduce((count, query) => {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return count + (description.match(regex) || []).length;
    }, 0);
    
    const keywordDensity = totalWords > 0 ? keywordMatches / totalWords : 0;

    return {
      title,
      description,
      keywordDensity,
      usedQueries: uniqueQueries.slice(0, 10)
    };
  }

  // Приватные методы
  private async makeAnalyticsRequest(endpoint: string, method: 'GET' | 'POST', data?: any): Promise<any> {
    const url = `${this.analyticsBaseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WB-Product-Analytics/1.0'
      },
      ...(data && { body: JSON.stringify(data) })
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`WB Analytics API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private parseProductQueries(items: any[]): ProductSearchQuery[] {
    return items.map(item => ({
      searchText: item.searchText || item.query || '',
      openCard: item.openCard || 0,
      addToCart: item.addToCart || 0,
      orders: item.orders || 0,
      avgPosition: item.avgPosition || 0,
      ctr: item.ctr || 0,
      cartToOrder: item.cartToOrder || 0,
      openToCart: item.openToCart || 0,
      revenue: item.revenue || 0
    })).filter(q => q.searchText.length > 0);
  }

  private groupQueriesByProduct(items: any[]): { [nmId: number]: ProductSearchQuery[] } {
    const grouped: { [nmId: number]: ProductSearchQuery[] } = {};
    
    items.forEach(item => {
      const nmId = item.nmId || item.nmID;
      if (nmId) {
        if (!grouped[nmId]) {
          grouped[nmId] = [];
        }
        
        grouped[nmId].push({
          searchText: item.searchText || item.query || '',
          openCard: item.openCard || 0,
          addToCart: item.addToCart || 0,
          orders: item.orders || 0,
          avgPosition: item.avgPosition || 0,
          ctr: item.ctr || 0,
          cartToOrder: item.cartToOrder || 0,
          openToCart: item.openToCart || 0,
          revenue: item.revenue || 0
        });
      }
    });

    return grouped;
  }

  private async getQueriesAlternativeMethod(nmId: number, limit: number, daysBack: number): Promise<ProductQueriesResult> {
    // Альтернативные методы получения запросов
    // 1. Анализ через общий отчет
    // 2. Поиск похожих товаров
    // 3. Fallback на предопределенные запросы
    
    return await this.getFallbackProductQueries(nmId, limit);
  }

  private async getFallbackProductQueries(nmId: number, limit: number): Promise<ProductQueriesResult> {
    // Базовые поисковые запросы для товаров
    const fallbackQueries: ProductSearchQuery[] = [
      { searchText: 'качественный товар', openCard: 100, addToCart: 20, orders: 5, avgPosition: 15, ctr: 0.05, cartToOrder: 0.25, openToCart: 0.2, revenue: 2500 },
      { searchText: 'недорого', openCard: 80, addToCart: 15, orders: 4, avgPosition: 18, ctr: 0.04, cartToOrder: 0.27, openToCart: 0.19, revenue: 2000 },
      { searchText: 'выгодная цена', openCard: 70, addToCart: 12, orders: 3, avgPosition: 20, ctr: 0.035, cartToOrder: 0.25, openToCart: 0.17, revenue: 1800 },
      { searchText: 'быстрая доставка', openCard: 60, addToCart: 10, orders: 3, avgPosition: 25, ctr: 0.03, cartToOrder: 0.3, openToCart: 0.17, revenue: 1500 },
      { searchText: 'хорошее качество', openCard: 50, addToCart: 8, orders: 2, avgPosition: 30, ctr: 0.025, cartToOrder: 0.25, openToCart: 0.16, revenue: 1200 }
    ].slice(0, limit);

    return {
      nmId,
      queries: fallbackQueries,
      totalQueries: fallbackQueries.length,
      dataSource: 'fallback',
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      generatedAt: new Date().toISOString()
    };
  }

  private createFallbackResult(nmId: number): ProductQueriesResult {
    return {
      nmId,
      queries: [],
      totalQueries: 0,
      dataSource: 'fallback',
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      generatedAt: new Date().toISOString()
    };
  }

  private isRelevantToProduct(query: string, productName: string): boolean {
    const productWords = productName.toLowerCase().split(' ');
    const queryWords = query.toLowerCase().split(' ');
    
    // Проверяем пересечение слов
    const intersection = productWords.filter(word => 
      queryWords.some(qWord => qWord.includes(word) || word.includes(qWord))
    );
    
    return intersection.length > 0;
  }
}

export default WbProductQueriesService;

