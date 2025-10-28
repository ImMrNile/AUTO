/**
 * lib/services/analyticsCalculator.ts
 * Расчет аналитики на основе продаж из нашей БД
 * Суммирует: продажи, комиссии, логистику, хранение, приемку
 */

import { WbLogisticsCalculator } from './wbLogisticsCalculator';

export interface SaleItem {
  id: string;
  nmId: number;
  quantity: number;
  finishedPrice: number; // Цена за единицу
  isReturn: boolean;
  isCancel: boolean;
  createdAt: Date;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface ProductData {
  id: string;
  wbNmId: string;
  costPrice?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  subcategory?: {
    commissionFbs: number; // Комиссия маркетплейса
  };
}

export interface AnalyticsResult {
  // Продажи
  totalSales: number; // Количество продаж
  totalReturns: number; // Количество возвратов
  totalCancels: number; // Количество отмен
  
  // Выручка
  totalRevenue: number; // Сумма всех продаж (finishedPrice × quantity)
  totalReturnRevenue: number; // Сумма возвратов
  
  // Комиссии
  totalCommission: number; // Сумма комиссий со всех продаж
  totalReturnCommission: number; // Комиссия с возвратов (если есть)
  
  // Логистика
  totalLogisticsToClient: number; // Логистика доставки до клиента
  totalLogisticsReturn: number; // Логистика возвратов
  totalLogisticsCancel: number; // Логистика отмен
  totalLogistics: number; // Всего логистики
  
  // Хранение и приемка
  totalStorage: number; // Хранение
  totalAcceptance: number; // Приемка
  
  // Итого
  totalExpenses: number; // Всего расходов (комиссия + логистика + хранение + приемка)
  totalForPay: number; // К переводу (выручка - расходы)
  
  // Детали по товарам
  itemDetails: Array<{
    nmId: number;
    quantity: number;
    revenue: number;
    commission: number;
    logisticsToClient: number;
    logisticsReturn: number;
    storage: number;
    acceptance: number;
    totalExpenses: number;
    forPay: number;
    isReturn: boolean;
    isCancel: boolean;
  }>;
}

export class AnalyticsCalculator {
  /**
   * Рассчитать логистику с учетом KTR
   * @param baseLogistics - базовый тариф (46₽ + 84₽ = 130₽ для 7л)
   * @param ktr - коэффициент склада (например 1.95)
   * @returns логистика с KTR
   */
  private static calculateLogisticsWithKtr(baseLogistics: number, ktr: number = 1): number {
    return baseLogistics * ktr;
  }

  /**
   * Рассчитать объем товара в литрах
   * @param dimensions - размеры товара {length, width, height} в см
   * @returns объем в литрах
   */
  private static calculateVolume(dimensions?: { length?: number; width?: number; height?: number }): number {
    if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
      return 1; // Дефолт 1л если размеры не указаны
    }
    // Объем в см³ / 1000 = литры
    const volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
    return volumeCm3 / 1000;
  }

  /**
   * Рассчитать базовый тариф логистики
   * Формула: (46 + 84) × объем = базовый тариф
   */
  private static calculateBaseTariff(volumeLiters: number): number {
    const baseTariffPerLiter = 46 + 84; // 130₽ за 1л
    return baseTariffPerLiter * volumeLiters;
  }

  /**
   * Рассчитать аналитику по продажам за период
   */
  static calculate(
    sales: SaleItem[],
    products: Map<string, ProductData>,
    options?: {
      warehouseKtr?: number; // KTR склада (например 1.95) - fallback для старых данных
      warehouseKtrMap?: Map<string, number>; // ✅ Map KTR по складам для точного расчета
      storagePerUnit?: number; // Хранение за единицу
      acceptancePerUnit?: number; // Приемка за единицу
      logisticsReturnPerUnit?: number; // Логистика возврата за единицу (фиксированная)
    }
  ): AnalyticsResult {
    const result: AnalyticsResult = {
      totalSales: 0,
      totalReturns: 0,
      totalCancels: 0,
      totalRevenue: 0,
      totalReturnRevenue: 0,
      totalCommission: 0,
      totalReturnCommission: 0,
      totalLogisticsToClient: 0,
      totalLogisticsReturn: 0,
      totalLogisticsCancel: 0,
      totalLogistics: 0,
      totalStorage: 0,
      totalAcceptance: 0,
      totalExpenses: 0,
      totalForPay: 0,
      itemDetails: []
    };

    // Дефолтные значения расходов (используются только если нет реальных данных из WB)
    const logisticsReturnPerUnit = options?.logisticsReturnPerUnit || 50; // ₽ за единицу возврата
    const storagePerUnit = options?.storagePerUnit || 5; // ₽ за единицу в день (примерно)
    const acceptancePerUnit = options?.acceptancePerUnit || 2; // ₽ за единицу

    // Обрабатываем каждую продажу
    sales.forEach((sale) => {
      const product = products.get(String(sale.nmId));
      const commissionRate = product?.subcategory?.commissionFbs || 0;

      // Выручка
      const revenue = sale.finishedPrice * sale.quantity;

      // Комиссия
      const commission = (revenue * commissionRate) / 100;

      // Логистика
      let logisticsToClient = 0;
      let logisticsReturn = 0;
      let logisticsCancel = 0;

      if (sale.isReturn) {
        logisticsReturn = logisticsReturnPerUnit * sale.quantity;
        result.totalReturns++;
        result.totalReturnRevenue += revenue;
        result.totalReturnCommission += commission;
      } else if (sale.isCancel) {
        logisticsCancel = 0; // Для отмен логистика обычно не начисляется
        result.totalCancels++;
      } else {
        // ✅ НОВОЕ: Рассчитываем логистику по новому тарифу WB
        // Если есть реальные данные из WB - используем их
        // Иначе рассчитываем по формуле с учетом объема
        if ((sale as any).deliveryRub) {
          logisticsToClient = (sale as any).deliveryRub;
        } else {
          // Рассчитываем по новому тарифу WB
          const volume = WbLogisticsCalculator.calculateVolume(sale.dimensions);
          const ktr = options?.warehouseKtrMap?.get(String(sale.nmId)) || options?.warehouseKtr || 1;
          logisticsToClient = WbLogisticsCalculator.calculateLogisticsWithKtr(volume, ktr);
        }
        
        result.totalSales++;
        result.totalRevenue += revenue;
        result.totalCommission += commission;
      }

      // Хранение и приемка (только для успешных продаж)
      const storage = !sale.isReturn && !sale.isCancel ? storagePerUnit * sale.quantity : 0;
      const acceptance = !sale.isReturn && !sale.isCancel ? acceptancePerUnit * sale.quantity : 0;

      // Итого расходы по товару
      const totalExpenses = commission + logisticsToClient + logisticsReturn + logisticsCancel + storage + acceptance;
      const forPay = revenue - totalExpenses;

      // Добавляем в детали
      result.itemDetails.push({
        nmId: sale.nmId,
        quantity: sale.quantity,
        revenue,
        commission,
        logisticsToClient,
        logisticsReturn,
        storage,
        acceptance,
        totalExpenses,
        forPay,
        isReturn: sale.isReturn,
        isCancel: sale.isCancel
      });

      // Суммируем
      result.totalLogisticsToClient += logisticsToClient;
      result.totalLogisticsReturn += logisticsReturn;
      result.totalLogisticsCancel += logisticsCancel;
      result.totalStorage += storage;
      result.totalAcceptance += acceptance;
    });

    // Итоговые расчеты
    result.totalLogistics = result.totalLogisticsToClient + result.totalLogisticsReturn + result.totalLogisticsCancel;
    result.totalExpenses = result.totalCommission + result.totalLogistics + result.totalStorage + result.totalAcceptance;
    result.totalForPay = result.totalRevenue - result.totalExpenses;

    console.log('📊 Расчет аналитики завершен:', {
      продаж: result.totalSales,
      возвратов: result.totalReturns,
      отмен: result.totalCancels,
      выручка: `${result.totalRevenue.toFixed(2)}₽`,
      комиссии: `${result.totalCommission.toFixed(2)}₽`,
      логистика: `${result.totalLogistics.toFixed(2)}₽`,
      хранение: `${result.totalStorage.toFixed(2)}₽`,
      приемка: `${result.totalAcceptance.toFixed(2)}₽`,
      расходы: `${result.totalExpenses.toFixed(2)}₽`,
      кПереводу: `${result.totalForPay.toFixed(2)}₽`
    });

    return result;
  }

  /**
   * Получить детальный отчет по логистике
   */
  static getLogisticsReport(result: AnalyticsResult) {
    return {
      logisticsToClient: {
        label: 'Логистика до клиента',
        amount: result.totalLogisticsToClient,
        count: result.totalSales,
        perUnit: result.totalSales > 0 ? result.totalLogisticsToClient / result.totalSales : 0
      },
      logisticsReturn: {
        label: 'Логистика возвратов',
        amount: result.totalLogisticsReturn,
        count: result.totalReturns,
        perUnit: result.totalReturns > 0 ? result.totalLogisticsReturn / result.totalReturns : 0
      },
      logisticsCancel: {
        label: 'Логистика отмен',
        amount: result.totalLogisticsCancel,
        count: result.totalCancels,
        perUnit: result.totalCancels > 0 ? result.totalLogisticsCancel / result.totalCancels : 0
      },
      total: result.totalLogistics
    };
  }

  /**
   * Получить детальный отчет по комиссиям
   */
  static getCommissionReport(result: AnalyticsResult) {
    return {
      sales: {
        label: 'Комиссия с продаж',
        amount: result.totalCommission,
        count: result.totalSales,
        perUnit: result.totalSales > 0 ? result.totalCommission / result.totalSales : 0
      },
      returns: {
        label: 'Комиссия с возвратов',
        amount: result.totalReturnCommission,
        count: result.totalReturns,
        perUnit: result.totalReturns > 0 ? result.totalReturnCommission / result.totalReturns : 0
      },
      total: result.totalCommission + result.totalReturnCommission
    };
  }
}
