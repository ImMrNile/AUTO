// lib/services/wbStatisticsService.ts - Сервис для работы с WB Statistics API

import { WB_API_CONFIG } from '../config/wbApiConfig';

/**
 * Интерфейс для данных о продаже
 */
export interface WbSaleRecord {
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  countryName: string;
  oblastOkrugName: string;
  regionName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  incomeID: number;
  isSupply: boolean;
  isRealization: boolean;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  isStorno: number;
  promoCodeDiscount: number;
  warehouseId: number;
  srid: string;
  forPay: number;
  orderType: string;
  sticker: string;
  gNumber: string;
}

/**
 * Интерфейс для данных о заказе
 */
export interface WbOrderRecord {
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  countryName: string;
  oblastOkrugName: string;
  regionName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  incomeID: number;
  isSupply: boolean;
  isRealization: boolean;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  isCancel: boolean;
  cancelDate: string;
  orderType: string;
  sticker: string;
  gNumber: string;
  srid: string;
}

/**
 * Интерфейс для данных об остатках
 */
export interface WbStockRecord {
  lastChangeDate: string;
  warehouseName: string;
  supplierArticle: string;
  nmId: number;
  barcode: string;
  quantity: number;
  inWayToClient: number;
  inWayFromClient: number;
  quantityFull: number;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  Price: number;
  Discount: number;
  isSupply: boolean;
  isRealization: boolean;
  SCCode: string;
  warehouseId: number;
}

/**
 * Интерфейс для данных о доходах
 */
export interface WbIncomeRecord {
  incomeId: number;
  number: string;
  date: string;
  lastChangeDate: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  quantity: number;
  totalPrice: number;
  dateClose: string;
  warehouseName: string;
  nmId: number;
  status: string;
}

/**
 * Агрегированная статистика по товару
 */
export interface ProductStatistics {
  nmId: number;
  vendorCode: string;
  
  // Продажи
  sales: {
    total: number;
    last7Days: number;
    last30Days: number;
    totalRevenue: number;
    averagePrice: number;
    byDate: Map<string, { count: number; revenue: number }>;
  };
  
  // Заказы
  orders: {
    total: number;
    last7Days: number;
    last30Days: number;
    cancelled: number;
    cancelRate: number;
  };
  
  // Остатки
  stocks: {
    total: number;
    available: number;
    inWayToClient: number;
    inWayFromClient: number;
    warehouses: Map<string, number>;
  };
  
  // Поступления
  incomes: {
    total: number;
    totalQuantity: number;
    last30Days: number;
  };
}

/**
 * Сервис для работы с WB Statistics API
 */
export class WbStatisticsService {
  private apiToken: string;
  private baseUrl = 'https://statistics-api.wildberries.ru';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Получение продаж за период
   */
  async getSales(dateFrom: Date, flag: number = 0): Promise<WbSaleRecord[]> {
    try {
      const dateStr = dateFrom.toISOString().split('T')[0];
      const url = `${this.baseUrl}/api/v1/supplier/sales?dateFrom=${dateStr}&flag=${flag}`;

      console.log(`📊 Запрос продаж с ${dateStr}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено ${data.length} записей о продажах`);
      
      return data;
    } catch (error) {
      console.error('❌ Ошибка получения продаж:', error);
      throw error;
    }
  }

  /**
   * Получение заказов за период
   */
  async getOrders(dateFrom: Date, flag: number = 0): Promise<WbOrderRecord[]> {
    try {
      const dateStr = dateFrom.toISOString().split('T')[0];
      const url = `${this.baseUrl}/api/v1/supplier/orders?dateFrom=${dateStr}&flag=${flag}`;

      console.log(`🛒 Запрос заказов с ${dateStr}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено ${data.length} записей о заказах`);
      
      return data;
    } catch (error) {
      console.error('❌ Ошибка получения заказов:', error);
      throw error;
    }
  }

  /**
   * Получение остатков за период
   */
  async getStocks(dateFrom: Date): Promise<WbStockRecord[]> {
    try {
      const dateStr = dateFrom.toISOString().split('T')[0];
      const url = `${this.baseUrl}/api/v1/supplier/stocks?dateFrom=${dateStr}`;

      console.log(`📦 Запрос остатков с ${dateStr}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено ${data.length} записей об остатках`);
      
      return data;
    } catch (error) {
      console.error('❌ Ошибка получения остатков:', error);
      throw error;
    }
  }

  /**
   * Получение поступлений за период
   */
  async getIncomes(dateFrom: Date): Promise<WbIncomeRecord[]> {
    try {
      const dateStr = dateFrom.toISOString().split('T')[0];
      const url = `${this.baseUrl}/api/v1/supplier/incomes?dateFrom=${dateStr}`;

      console.log(`📥 Запрос поступлений с ${dateStr}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено ${data.length} записей о поступлениях`);
      
      return data;
    } catch (error) {
      console.error('❌ Ошибка получения поступлений:', error);
      throw error;
    }
  }

  /**
   * Получение полной статистики по товару
   */
  async getProductStatistics(nmId: number, daysBack: number = 30): Promise<ProductStatistics> {
    const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    console.log(`📊 Сбор полной статистики для товара ${nmId}...`);

    // Параллельный запрос всех данных
    const [sales, orders, stocks, incomes] = await Promise.all([
      this.getSales(dateFrom).catch(() => []),
      this.getOrders(dateFrom).catch(() => []),
      this.getStocks(dateFrom).catch(() => []),
      this.getIncomes(dateFrom).catch(() => [])
    ]);

    // Фильтруем данные по nmId
    const productSales = sales.filter(s => s.nmId === nmId);
    const productOrders = orders.filter(o => o.nmId === nmId);
    const productStocks = stocks.filter(s => s.nmId === nmId);
    const productIncomes = incomes.filter(i => i.nmId === nmId);

    // Агрегируем продажи
    const salesByDate = new Map<string, { count: number; revenue: number }>();
    let totalRevenue = 0;
    let totalSalesPrice = 0;

    productSales.forEach(sale => {
      const date = sale.date.split('T')[0];
      const current = salesByDate.get(date) || { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += sale.finishedPrice || 0;
      salesByDate.set(date, current);
      
      totalRevenue += sale.finishedPrice || 0;
      totalSalesPrice += sale.finishedPrice || 0;
    });

    // Агрегируем остатки по складам
    const stocksByWarehouse = new Map<string, number>();
    let totalStocks = 0;
    let availableStocks = 0;
    let inWayToClient = 0;
    let inWayFromClient = 0;

    productStocks.forEach(stock => {
      const warehouse = stock.warehouseName || 'Неизвестно';
      const current = stocksByWarehouse.get(warehouse) || 0;
      stocksByWarehouse.set(warehouse, current + stock.quantity);
      
      totalStocks += stock.quantity || 0;
      availableStocks += stock.quantityFull || 0;
      inWayToClient += stock.inWayToClient || 0;
      inWayFromClient += stock.inWayFromClient || 0;
    });

    // Подсчитываем отмененные заказы
    const cancelledOrders = productOrders.filter(o => o.isCancel).length;

    const statistics: ProductStatistics = {
      nmId,
      vendorCode: productSales[0]?.supplierArticle || productOrders[0]?.supplierArticle || '',
      
      sales: {
        total: productSales.length,
        last7Days: productSales.filter(s => new Date(s.date).getTime() > sevenDaysAgo).length,
        last30Days: productSales.filter(s => new Date(s.date).getTime() > thirtyDaysAgo).length,
        totalRevenue,
        averagePrice: productSales.length > 0 ? totalSalesPrice / productSales.length : 0,
        byDate: salesByDate
      },
      
      orders: {
        total: productOrders.length,
        last7Days: productOrders.filter(o => new Date(o.date).getTime() > sevenDaysAgo).length,
        last30Days: productOrders.filter(o => new Date(o.date).getTime() > thirtyDaysAgo).length,
        cancelled: cancelledOrders,
        cancelRate: productOrders.length > 0 ? (cancelledOrders / productOrders.length) * 100 : 0
      },
      
      stocks: {
        total: totalStocks,
        available: availableStocks,
        inWayToClient,
        inWayFromClient,
        warehouses: stocksByWarehouse
      },
      
      incomes: {
        total: productIncomes.length,
        totalQuantity: productIncomes.reduce((sum, i) => sum + (i.quantity || 0), 0),
        last30Days: productIncomes.filter(i => new Date(i.date).getTime() > thirtyDaysAgo).length
      }
    };

    console.log(`✅ Статистика собрана: ${statistics.sales.total} продаж, ${statistics.orders.total} заказов, ${statistics.stocks.total} остатков`);

    return statistics;
  }

  /**
   * Получение отчета по реализации (детальный финансовый отчет)
   */
  async getReportDetailByPeriod(dateFrom: Date, dateTo: Date, limit: number = 100000, rrdid: number = 0): Promise<any[]> {
    try {
      const dateFromStr = dateFrom.toISOString().split('T')[0];
      const dateToStr = dateTo.toISOString().split('T')[0];
      const url = `${this.baseUrl}/api/v1/supplier/reportDetailByPeriod?dateFrom=${dateFromStr}&dateTo=${dateToStr}&limit=${limit}&rrdid=${rrdid}`;

      console.log(`💰 Запрос детального отчета с ${dateFromStr} по ${dateToStr}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Получено ${data.length} записей детального отчета`);
      
      return data;
    } catch (error) {
      console.error('❌ Ошибка получения детального отчета:', error);
      throw error;
    }
  }

  /**
   * Проверка доступа к Statistics API
   */
  async checkAccess(): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const dateStr = dateFrom.toISOString().split('T')[0];
      
      const response = await fetch(
        `${this.baseUrl}/api/v1/supplier/sales?dateFrom=${dateStr}&flag=0`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.apiToken,
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        return { hasAccess: true };
      } else if (response.status === 401 || response.status === 403) {
        return { 
          hasAccess: false, 
          error: 'Нет доступа к Statistics API. Проверьте права токена.' 
        };
      } else {
        return { 
          hasAccess: false, 
          error: `Ошибка API: ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        hasAccess: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }
}
