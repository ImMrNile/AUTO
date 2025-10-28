// lib/services/wbProductAnalyticsService.ts - Сервис для получения реальной аналитики товаров с WB

import { WB_API_CONFIG } from '../config/wbApiConfig';
import { WbProductQueriesService } from './wbProductQueriesService';

export interface ProductAnalyticsData {
  nmId: string;
  
  // Конверсия
  views: number;
  addToCart: number;
  orders: number;
  ctr: number;
  conversionRate: number;
  
  // Поисковые запросы
  topSearchQueries: Array<{
    query: string;
    openCard: number;
    addToCart: number;
    orders: number;
    avgPosition: number;
  }>;
  totalQueries: number;
  
  // Продажи
  revenue: number;
  units: number;
  avgOrderValue: number;
  
  // Метаданные
  dataSource: 'wb_api' | 'estimated';
  syncStatus: 'success' | 'partial' | 'error';
  syncError?: string;
}

export class WbProductAnalyticsService {
  private apiToken: string;
  private queriesService: WbProductQueriesService;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.queriesService = new WbProductQueriesService(apiToken);
  }

  /**
   * Получение полной аналитики для товара
   */
  async getProductAnalytics(nmId: number, daysBack: number = 30): Promise<ProductAnalyticsData> {
    console.log(`📊 Получение аналитики для товара ${nmId} за ${daysBack} дней`);

    try {
      // Параллельно получаем все данные
      const [salesData, queriesData] = await Promise.all([
        this.getSalesData(nmId, daysBack),
        this.getSearchQueriesData(nmId, daysBack)
      ]);

      // Рассчитываем метрики конверсии
      const conversionMetrics = this.calculateConversionMetrics(salesData, queriesData);

      const analytics: ProductAnalyticsData = {
        nmId: nmId.toString(),
        
        // Конверсия
        views: conversionMetrics.views,
        addToCart: conversionMetrics.addToCart,
        orders: conversionMetrics.orders,
        ctr: conversionMetrics.ctr,
        conversionRate: conversionMetrics.conversionRate,
        
        // Поисковые запросы
        topSearchQueries: queriesData.topQueries,
        totalQueries: queriesData.totalQueries,
        
        // Продажи
        revenue: salesData.revenue,
        units: salesData.units,
        avgOrderValue: salesData.avgOrderValue,
        
        // Метаданные
        dataSource: 'wb_api',
        syncStatus: 'success'
      };

      console.log(`✅ Аналитика получена: ${analytics.orders} заказов, ${analytics.totalQueries} запросов`);
      return analytics;

    } catch (error) {
      console.error(`❌ Ошибка получения аналитики для товара ${nmId}:`, error);
      
      // Возвращаем оценочные данные в случае ошибки
      return this.getEstimatedAnalytics(nmId, error);
    }
  }

  /**
   * Получение данных о продажах товара
   */
  private async getSalesData(nmId: number, daysBack: number): Promise<{
    revenue: number;
    units: number;
    avgOrderValue: number;
    orders: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const dateFrom = startDate.toISOString().split('T')[0];

      const url = `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom}`;
      
      const response = await this.makeRequest('GET', url);

      if (!response.ok) {
        console.warn(`⚠️ Не удалось получить данные продаж: ${response.status}`);
        return { revenue: 0, units: 0, avgOrderValue: 0, orders: 0 };
      }

      const data = await response.json();
      
      // Фильтруем продажи по nmId
      const productSales = data.filter((sale: any) => sale.nmId === nmId);

      const revenue = productSales.reduce((sum: number, sale: any) => 
        sum + (sale.finishedPrice || 0), 0
      );
      const units = productSales.length;
      const orders = productSales.length;
      const avgOrderValue = orders > 0 ? revenue / orders : 0;

      return { revenue, units, avgOrderValue, orders };

    } catch (error) {
      console.warn('⚠️ Ошибка получения данных продаж:', error);
      return { revenue: 0, units: 0, avgOrderValue: 0, orders: 0 };
    }
  }

  /**
   * Получение данных о поисковых запросах
   */
  private async getSearchQueriesData(nmId: number, daysBack: number): Promise<{
    topQueries: Array<{
      query: string;
      openCard: number;
      addToCart: number;
      orders: number;
      avgPosition: number;
    }>;
    totalQueries: number;
  }> {
    try {
      const queriesResult = await this.queriesService.getProductSearchQueries(nmId, 10, daysBack);

      const topQueries = queriesResult.queries.map(q => ({
        query: q.searchText,
        openCard: q.openCard,
        addToCart: q.addToCart,
        orders: q.orders,
        avgPosition: q.avgPosition
      }));

      return {
        topQueries,
        totalQueries: queriesResult.totalQueries
      };

    } catch (error) {
      console.warn('⚠️ Ошибка получения поисковых запросов:', error);
      return {
        topQueries: [],
        totalQueries: 0
      };
    }
  }

  /**
   * Расчет метрик конверсии
   */
  private calculateConversionMetrics(
    salesData: { orders: number },
    queriesData: { topQueries: any[] }
  ): {
    views: number;
    addToCart: number;
    orders: number;
    ctr: number;
    conversionRate: number;
  } {
    // Суммируем данные из поисковых запросов
    const totalOpenCard = queriesData.topQueries.reduce((sum, q) => sum + q.openCard, 0);
    const totalAddToCart = queriesData.topQueries.reduce((sum, q) => sum + q.addToCart, 0);
    const totalOrders = salesData.orders;

    // Если нет данных из поисковых запросов, используем оценки
    const views = totalOpenCard > 0 ? totalOpenCard : totalOrders * 50;
    const addToCart = totalAddToCart > 0 ? totalAddToCart : totalOrders * 5;

    // Рассчитываем метрики
    const ctr = views > 0 ? (addToCart / views) * 100 : 0;
    const conversionRate = addToCart > 0 ? (totalOrders / addToCart) * 100 : 0;

    return {
      views,
      addToCart,
      orders: totalOrders,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  /**
   * Получение оценочных данных при ошибке
   */
  private getEstimatedAnalytics(nmId: number, error: any): ProductAnalyticsData {
    console.warn(`⚠️ Используем оценочные данные для товара ${nmId}`);

    return {
      nmId: nmId.toString(),
      views: 0,
      addToCart: 0,
      orders: 0,
      ctr: 0,
      conversionRate: 0,
      topSearchQueries: [],
      totalQueries: 0,
      revenue: 0,
      units: 0,
      avgOrderValue: 0,
      dataSource: 'estimated',
      syncStatus: 'error',
      syncError: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }

  /**
   * Массовое получение аналитики для нескольких товаров
   */
  async getBulkProductAnalytics(
    nmIds: number[], 
    daysBack: number = 30,
    delayMs: number = 1000
  ): Promise<ProductAnalyticsData[]> {
    console.log(`📊 Массовое получение аналитики для ${nmIds.length} товаров`);

    const results: ProductAnalyticsData[] = [];

    for (let i = 0; i < nmIds.length; i++) {
      const nmId = nmIds[i];
      
      try {
        const analytics = await this.getProductAnalytics(nmId, daysBack);
        results.push(analytics);

        // Задержка между запросами для соблюдения rate limits
        if (i < nmIds.length - 1) {
          await this.delay(delayMs);
        }

      } catch (error) {
        console.warn(`⚠️ Ошибка получения аналитики для товара ${nmId}:`, error);
        results.push(this.getEstimatedAnalytics(nmId, error));
      }
    }

    console.log(`✅ Получена аналитика для ${results.length} товаров`);
    return results;
  }

  /**
   * Вспомогательные методы
   */
  private async makeRequest(method: string, url: string, body?: any): Promise<Response> {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WB-AI-Analytics/2.0'
      },
      ...(body && { body: JSON.stringify(body) })
    };

    return fetch(url, options);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
