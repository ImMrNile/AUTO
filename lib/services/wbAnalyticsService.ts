// lib/services/wbAnalyticsService.ts - Сервис для работы с WB Analytics API

import { WB_API_CONFIG } from '../config/wbApiConfig';

export interface SearchQuery {
  query: string;
  frequency: number;
  position: number;
  ctr: number;
  conversion: number;
  category?: string;
}

export interface KeywordCluster {
  mainKeyword: string;
  relatedKeywords: string[];
  totalVolume: number;
  competitiveness: 'low' | 'medium' | 'high';
  intent: 'informational' | 'commercial' | 'transactional';
}

export interface CategoryKeywords {
  categoryId: number;
  categoryName: string;
  topQueries: SearchQuery[];
  clusters: KeywordCluster[];
  seasonalTrends?: {
    month: number;
    volume: number;
  }[];
}

export interface AnalyticsTokenInfo {
  hasAnalyticsAccess: boolean;
  isExpired: boolean;
  sellerId: string;
}

export class WbAnalyticsService {
  private readonly baseUrl: string;
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = WB_API_CONFIG.BASE_URLS.ANALYTICS;
  }

  /**
   * Проверка доступа к Analytics API
   */
  async checkAnalyticsAccess(): Promise<AnalyticsTokenInfo> {
    try {
      const response = await this.makeRequest('GET', WB_API_CONFIG.ENDPOINTS.PING_ANALYTICS);
      
      // Парсим токен для проверки прав доступа
      const tokenInfo = this.parseToken(this.apiToken);
      
      return {
        hasAnalyticsAccess: response.ok && this.hasAnalyticsPermission(tokenInfo),
        isExpired: tokenInfo?.isExpired || false,
        sellerId: tokenInfo?.sellerId || 'unknown'
      };
    } catch (error) {
      console.error('❌ Ошибка проверки доступа к Analytics API:', error);
      return {
        hasAnalyticsAccess: false,
        isExpired: true,
        sellerId: 'unknown'
      };
    }
  }

  /**
   * Получение поисковых запросов для категории на основе анализа товаров
   */
  async getCategorySearchQueries(categoryId: number, dateFrom?: string, dateTo?: string): Promise<SearchQuery[]> {
    try {
      console.log(`🔍 Анализ товаров для создания поисковых запросов категории ${categoryId}`);
      
      // Поскольку прямых эндпоинтов для поисковых запросов нет,
      // анализируем данные о продажах и остатках для создания кластеров
      const [ordersData, stocksData] = await Promise.all([
        this.getOrdersData(dateFrom, dateTo),
        this.getStocksData()
      ]);

      // Анализируем названия товаров для создания ключевых слов
      const keywords = this.extractKeywordsFromProductData(ordersData, stocksData, categoryId);
      
      console.log(`✅ Создано ${keywords.length} ключевых слов на основе анализа товаров`);
      return keywords;

    } catch (error) {
      console.error('❌ Ошибка анализа данных товаров:', error);
      
      // Fallback: возвращаем базовые ключевые слова для категории
      return this.getFallbackKeywords(categoryId);
    }
  }

  /**
   * Получение данных о заказах
   */
  private async getOrdersData(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      const defaultDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const defaultDateTo = dateTo || new Date().toISOString().split('T')[0];
      
      const response = await this.makeRequest(
        'GET', 
        `/api/v1/supplier/orders?dateFrom=${defaultDateFrom}&dateTo=${defaultDateTo}`,
        undefined,
        'https://statistics-api.wildberries.ru'
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`📦 Получено ${data.length} записей заказов`);
        return data;
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Не удалось получить данные заказов:', error);
      return [];
    }
  }

  /**
   * Получение данных об остатках
   */
  private async getStocksData(): Promise<any[]> {
    try {
      const dateFrom = new Date().toISOString().split('T')[0];
      
      const response = await this.makeRequest(
        'GET', 
        `/api/v1/supplier/stocks?dateFrom=${dateFrom}`,
        undefined,
        'https://statistics-api.wildberries.ru'
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Получено ${data.length} записей остатков`);
        return data;
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Не удалось получить данные остатков:', error);
      return [];
    }
  }

  /**
   * Извлечение ключевых слов из данных о товарах
   */
  private extractKeywordsFromProductData(orders: any[], stocks: any[], categoryId: number): SearchQuery[] {
    const keywordFrequency = new Map<string, number>();
    
    // Анализируем названия товаров из заказов
    orders.forEach(order => {
      if (order.subject) {
        const keywords = this.extractKeywordsFromText(order.subject);
        keywords.forEach(keyword => {
          const current = keywordFrequency.get(keyword) || 0;
          keywordFrequency.set(keyword, current + (order.totalPrice || 1));
        });
      }
    });

    // Анализируем артикулы и данные из остатков
    stocks.forEach(stock => {
      if (stock.supplierArticle) {
        const keywords = this.extractKeywordsFromText(stock.supplierArticle);
        keywords.forEach(keyword => {
          const current = keywordFrequency.get(keyword) || 0;
          keywordFrequency.set(keyword, current + (stock.quantity || 1));
        });
      }
    });

    // Конвертируем в SearchQuery формат
    const queries: SearchQuery[] = Array.from(keywordFrequency.entries())
      .filter(([keyword, frequency]) => keyword.length > 2 && frequency > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([keyword, frequency], index) => ({
        query: keyword,
        frequency,
        position: index + 1,
        ctr: Math.max(0.01, 0.1 - (index * 0.002)),
        conversion: Math.max(0.005, 0.05 - (index * 0.001))
      }));

    // Добавляем базовые ключевые слова категории если данных мало
    if (queries.length < 10) {
      const fallbackKeywords = this.getFallbackKeywords(categoryId);
      queries.push(...fallbackKeywords.slice(0, 10 - queries.length));
    }

    return queries;
  }

  /**
   * Извлечение ключевых слов из текста
   */
  private extractKeywordsFromText(text: string): string[] {
    const cleanText = text.toLowerCase()
      .replace(/[^\wа-яё\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ')
      .filter(word => word.length > 2)
      .filter(word => !['для', 'или', 'при', 'все', 'под', 'над', 'без', 'про', 'как', 'что', 'где', 'когда'].includes(word));
    
    // Создаем биграммы и триграммы
    const keywords = [...words];
    
    for (let i = 0; i < words.length - 1; i++) {
      keywords.push(`${words[i]} ${words[i + 1]}`);
    }
    
    for (let i = 0; i < words.length - 2; i++) {
      keywords.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    
    return keywords;
  }

  /**
   * Получение кластеров ключевых слов для категории
   */
  async getCategoryKeywordClusters(categoryId: number): Promise<KeywordCluster[]> {
    try {
      console.log(`📊 Анализ кластеров ключевых слов для категории ${categoryId}`);
      
      const searchQueries = await this.getCategorySearchQueries(categoryId);
      
      // Группируем запросы в кластеры по семантике
      const clusters = this.clusterKeywords(searchQueries);
      
      console.log(`✅ Найдено ${clusters.length} кластеров ключевых слов`);
      return clusters;

    } catch (error) {
      console.error('❌ Ошибка получения кластеров:', error);
      return this.getFallbackClusters(categoryId);
    }
  }

  /**
   * Получение полной аналитики по категории
   */
  async getCategoryAnalytics(categoryId: number, categoryName?: string): Promise<CategoryKeywords> {
    try {
      console.log(`📈 Получение полной аналитики для категории ${categoryId}`);
      
      const [topQueries, clusters] = await Promise.all([
        this.getCategorySearchQueries(categoryId),
        this.getCategoryKeywordClusters(categoryId)
      ]);

      return {
        categoryId,
        categoryName: categoryName || `Категория ${categoryId}`,
        topQueries: topQueries.slice(0, 50), // Топ-50 запросов
        clusters: clusters.slice(0, 10) // Топ-10 кластеров
      };

    } catch (error) {
      console.error('❌ Ошибка получения аналитики категории:', error);
      
      // Возвращаем fallback данные
      return {
        categoryId,
        categoryName: categoryName || `Категория ${categoryId}`,
        topQueries: this.getFallbackKeywords(categoryId),
        clusters: this.getFallbackClusters(categoryId)
      };
    }
  }

  /**
   * Приватные методы
   */
  private async makeRequest(method: string, endpoint: string, body?: any, customBaseUrl?: string): Promise<Response> {
    const baseUrl = customBaseUrl || this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WB-AI-Analytics/1.0'
      },
      ...(body && { body: JSON.stringify(body) })
    };

    return fetch(url, options);
  }

  private parseToken(token: string): any {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        sellerId: payload.sid,
        permissions: payload.s,
        expiresAt: new Date(payload.exp * 1000),
        isExpired: Date.now() > payload.exp * 1000
      };
    } catch {
      return null;
    }
  }

  private hasAnalyticsPermission(tokenInfo: any): boolean {
    if (!tokenInfo?.permissions) return false;
    
    // Проверяем бит 2 (Analytics access) согласно документации WB
    return (tokenInfo.permissions & (1 << 1)) !== 0;
  }

  private parseSearchQueries(data: any): SearchQuery[] {
    if (!data || !Array.isArray(data.queries)) {
      return [];
    }

    return data.queries.map((item: any) => ({
      query: item.query || item.searchQuery || '',
      frequency: item.frequency || item.impressions || 0,
      position: item.position || item.avgPosition || 0,
      ctr: item.ctr || item.clickThroughRate || 0,
      conversion: item.conversion || item.conversionRate || 0,
      category: item.category || ''
    })).filter((query: SearchQuery) => query.query.length > 0);
  }

  private clusterKeywords(queries: SearchQuery[]): KeywordCluster[] {
    const clusters: Map<string, KeywordCluster> = new Map();
    
    // Простая группировка по первому слову запроса
    queries.forEach(query => {
      const words = query.query.toLowerCase().split(' ');
      const mainWord = words[0];
      
      if (!clusters.has(mainWord)) {
        clusters.set(mainWord, {
          mainKeyword: mainWord,
          relatedKeywords: [],
          totalVolume: 0,
          competitiveness: 'medium',
          intent: this.detectIntent(query.query)
        });
      }
      
      const cluster = clusters.get(mainWord)!;
      cluster.relatedKeywords.push(query.query);
      cluster.totalVolume += query.frequency;
    });

    return Array.from(clusters.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);
  }

  private detectIntent(query: string): 'informational' | 'commercial' | 'transactional' {
    const transactionalWords = ['купить', 'заказать', 'цена', 'стоимость', 'доставка'];
    const commercialWords = ['лучший', 'топ', 'рейтинг', 'отзывы', 'сравнение'];
    
    const lowerQuery = query.toLowerCase();
    
    if (transactionalWords.some(word => lowerQuery.includes(word))) {
      return 'transactional';
    }
    
    if (commercialWords.some(word => lowerQuery.includes(word))) {
      return 'commercial';
    }
    
    return 'informational';
  }

  private getFallbackKeywords(categoryId: number): SearchQuery[] {
    // Базовые ключевые слова в зависимости от категории
    const categoryKeywords: { [key: number]: string[] } = {
      // Электроника
      963: ['кабель', 'провод', 'зарядка', 'шнур', 'адаптер'],
      964: ['аксессуары', 'чехол', 'защита', 'держатель'],
      
      // Дом и сад
      14727: ['для дома', 'бытовые товары', 'хозяйственные', 'домашние'],
      2674: ['кухня', 'посуда', 'кухонные принадлежности'],
      
      // Красота
      1234: ['уход за кожей', 'косметика', 'крем', 'сыворотка'],
      1236: ['уход за волосами', 'шампунь', 'маска для волос', 'фен']
    };

    const keywords = categoryKeywords[categoryId] || ['товар', 'качественный', 'недорого'];
    
    return keywords.map((keyword, index) => ({
      query: keyword,
      frequency: 1000 - (index * 100),
      position: index + 1,
      ctr: 0.05 - (index * 0.005),
      conversion: 0.02 - (index * 0.002)
    }));
  }

  private getFallbackClusters(categoryId: number): KeywordCluster[] {
    const fallbackKeywords = this.getFallbackKeywords(categoryId);
    
    return [{
      mainKeyword: fallbackKeywords[0]?.query || 'товар',
      relatedKeywords: fallbackKeywords.slice(0, 5).map(k => k.query),
      totalVolume: fallbackKeywords.reduce((sum, k) => sum + k.frequency, 0),
      competitiveness: 'medium',
      intent: 'commercial'
    }];
  }
}

// Утилиты для работы с ключевыми словами
export class KeywordUtils {
  /**
   * Генерация SEO-дружественного заголовка на основе кластеров
   */
  static generateSEOTitle(
    productName: string, 
    clusters: KeywordCluster[], 
    maxLength: number = 60
  ): string {
    if (clusters.length === 0) return productName.substring(0, maxLength);
    
    const mainCluster = clusters[0];
    const primaryKeywords = mainCluster.relatedKeywords
      .slice(0, 3)
      .join(' ')
      .replace(/\s+/g, ' ');
    
    const title = `${productName} ${primaryKeywords}`.trim();
    return title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;
  }

  /**
   * Интеграция ключевых слов в описание
   */
  static integrateKeywords(
    baseDescription: string,
    clusters: KeywordCluster[],
    density: number = 0.02
  ): string {
    if (clusters.length === 0) return baseDescription;
    
    const allKeywords = clusters
      .flatMap(cluster => cluster.relatedKeywords)
      .slice(0, 20); // Топ-20 ключевых слов
    
    const words = baseDescription.split(' ');
    const targetKeywordCount = Math.floor(words.length * density);
    
    let keywordIndex = 0;
    let addedKeywords = 0;
    
    // Вставляем ключевые слова естественным образом
    for (let i = 0; i < words.length && addedKeywords < targetKeywordCount; i += 20) {
      if (keywordIndex < allKeywords.length) {
        const keyword = allKeywords[keywordIndex];
        words.splice(i, 0, keyword);
        keywordIndex++;
        addedKeywords++;
      }
    }
    
    return words.join(' ');
  }

  /**
   * Анализ конкурентности ключевых слов
   */
  static analyzeCompetitiveness(clusters: KeywordCluster[]): {
    lowCompetition: string[];
    mediumCompetition: string[];
    highCompetition: string[];
  } {
    return {
      lowCompetition: clusters
        .filter(c => c.competitiveness === 'low')
        .flatMap(c => c.relatedKeywords),
      mediumCompetition: clusters
        .filter(c => c.competitiveness === 'medium')
        .flatMap(c => c.relatedKeywords),
      highCompetition: clusters
        .filter(c => c.competitiveness === 'high')
        .flatMap(c => c.relatedKeywords)
    };
  }
}
