// lib/services/wbFinancialCalculator.ts - Детальный финансовый калькулятор для WB

/**
 * Модель продажи для финансового расчета
 */
export interface WbSaleData {
  nmId: number;
  vendorCode: string;
  category: string;
  subcategoryId?: number;
  
  // Цены (ВАЖНО: согласно WB API)
  priceWithDiscount: number; // finishedPrice - цена со скидкой продавца (база для комиссии)
  originalPrice: number; // Оригинальная цена без скидок
  priceWithWbDiscount?: number; // priceWithDisc - цена с учетом скидки WB (SPP) - то что видит покупатель
  
  // Логистика
  warehouseName?: string;
  deliveryType?: 'FBO' | 'FBS' | 'FBW' | 'DBS'; // Тип доставки
  warehouseKtr?: number; // ✅ Коэффициент склада (KTR) из WB API: boxDeliveryCoefExpr или boxDeliveryMarketplaceCoefExpr
  
  // Размеры и вес (для расчета логистики)
  length?: number; // см
  width?: number; // см
  height?: number; // см
  weight?: number; // кг
  volumeLiters?: number; // Объем в литрах
  
  // Статус заказа
  isReturned: boolean; // Был ли возврат (для совместимости)
  returnRate?: number; // Процент возвратов (0-100) - для правильного расчета логистики возврата
  orderDate: Date;
  
  // Себестоимость (если известна)
  costPrice?: number;
}

/**
 * Комиссии по категории
 */
export interface CategoryCommissions {
  commissionFbw: number;
  commissionFbs: number;
  commissionDbs: number;
  commissionCc: number;
  commissionEdbs: number;
}

/**
 * Детальный финансовый расчет
 */
export interface DetailedFinancialCalculation {
  // Базовые данные
  productPrice: number; // Цена со скидкой продавца (finishedPrice)
  productPricePercent: number;
  customerPrice?: number; // Цена для покупателя (priceWithDisc) - с учетом скидки WB
  wbDiscount?: number; // Скидка WB (SPP) - оплачивает WB, не продавец
  
  // Расходы на WB
  wbExpenses: {
    total: number;
    totalPercent: number;
    
    commission: {
      amount: number;
      percent: number;
      rate: number; // Ставка комиссии
    };
    
    logistics: {
      total: number;
      totalPercent: number;
      
      toClient: {
        amount: number;
        percent: number;
      };
      
      fromClient: {
        amount: number;
        percent: number;
      };
    };
    
    storage: {
      amount: number;
      percent: number;
      days?: number; // Количество дней хранения
    };
    
    acceptance: {
      amount: number;
      percent: number;
    };
  };
  
  // К переводу продавцу
  toTransfer: {
    amount: number;
    percent: number;
  };
  
  // Расходы продавца
  sellerExpenses: {
    total: number;
    totalPercent: number;
    
    taxes: {
      amount: number;
      percent: number;
      rate: number; // Ставка налога (обычно 6% для УСН)
    };
    
    costPrice: {
      amount: number;
      percent: number;
    };
    
    advertising: {
      amount: number;
      percent: number;
    };
    
    other: {
      amount: number;
      percent: number;
    };
  };
  
  // Итого
  totalExpenses: {
    amount: number;
    percent: number;
  };
  
  // Прибыль
  profit: {
    amount: number; // Чистая прибыль
    percent: number; // Маржа (относительно цены покупателя)
  };
  
  // Дополнительная информация
  netProfit: number; // Чистая прибыль (дублирует profit.amount для совместимости)
  
  // Метаданные
  deliveryType: string;
  category: string;
  calculatedAt: Date;
}

/**
 * Калькулятор финансовых показателей для Wildberries
 */
export class WbFinancialCalculator {
  
  /**
   * Рассчитать комиссию WB в зависимости от типа доставки
   */
  private static calculateCommission(
    price: number,
    deliveryType: string,
    commissions: CategoryCommissions
  ): number {
    let commissionRate = 15; // По умолчанию
    
    switch (deliveryType.toUpperCase()) {
      case 'FBW':
        commissionRate = commissions.commissionFbw;
        break;
      case 'FBS':
        commissionRate = commissions.commissionFbs;
        break;
      case 'DBS':
        commissionRate = commissions.commissionDbs;
        break;
      case 'CC':
        commissionRate = commissions.commissionCc;
        break;
      case 'EDBS':
        commissionRate = commissions.commissionEdbs;
        break;
      default:
        commissionRate = commissions.commissionFbw;
    }
    
    return (price * commissionRate) / 100;
  }
  
  /**
   * Рассчитать логистику до клиента
   * ✅ ПРАВИЛЬНО: Рассчитывается по ОБЪЕМУ в литрах согласно тарифам WB 2025 с учетом KTR
   * 
   * Тарифы WB (с 15.09.2025):
   * - До 0.2л: 23₽/л
   * - 0.201-0.4л: 26₽/л
   * - 0.401-0.6л: 29₽/л
   * - 0.601-0.8л: 30₽/л
   * - 0.801-1л: 32₽/л
   * - Более 1л: 46₽ за первый + 14₽ за каждый доп. литр
   * 
   * KTR (коэффициент склада) - умножается на базовый тариф
   * Получается из WB API: boxDeliveryCoefExpr или boxDeliveryMarketplaceCoefExpr
   * 
   * Формула: Логистика = Базовый тариф × KTR
   */
  private static calculateLogisticsToClient(
    price: number,
    dimensions?: { length?: number; width?: number; height?: number; weight?: number },
    deliveryType?: string,
    volumeLiters?: number,
    ktr: number = 1.0  // ✅ Коэффициент склада (по умолчанию 1.0 = без коэффициента)
  ): number {
    // Если известен объем в литрах - используем его
    if (volumeLiters && volumeLiters > 0) {
      let baseTariff = 0;
      
      // ✅ Тарифы WB 2025 по объему
      if (volumeLiters <= 0.2) {
        baseTariff = 23 * volumeLiters;
      } else if (volumeLiters <= 0.4) {
        baseTariff = 26 * volumeLiters;
      } else if (volumeLiters <= 0.6) {
        baseTariff = 29 * volumeLiters;
      } else if (volumeLiters <= 0.8) {
        baseTariff = 30 * volumeLiters;
      } else if (volumeLiters <= 1.0) {
        baseTariff = 32 * volumeLiters;
      } else {
        // Более 1 литра: 46₽ за первый + 14₽ за каждый доп. литр
        const firstLiter = 46;
        const additionalLiters = (volumeLiters - 1) * 14;
        baseTariff = firstLiter + additionalLiters;
      }
      
      // ✅ Применяем коэффициент склада
      return baseTariff * ktr;
    }
    
    // Если габариты известны - рассчитываем объем
    if (dimensions && dimensions.length && dimensions.width && dimensions.height) {
      // Объем в см³ → переводим в литры (1л = 1000 см³)
      const volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
      const volumeLiters = volumeCm3 / 1000;
      
      // Используем рекурсивный вызов с известным объемом
      return this.calculateLogisticsToClient(price, undefined, deliveryType, volumeLiters, ktr);
    }
    
    // Fallback: если ничего не известно, используем процент от цены (14.67%) с KTR
    return (price * 14.67) / 100 * ktr;
  }
  
  /**
   * Рассчитать логистику возврата от клиента
   * ✅ ПРАВИЛЬНО: Логистика возврата = 50₽ за единицу (ФИКСИРОВАННАЯ)
   * 
   * Согласно официальным тарифам WB 2025:
   * Стоимость обратной логистики (при возврате) для всех товаров и складов составляет 50 рублей за единицу независимо от объема.
   * 
   * Пример:
   * - 1 возврат: 50₽ × 1 = 50₽
   * - 2 возврата: 50₽ × 2 = 100₽
   * - 5 возвратов: 50₽ × 5 = 250₽
   */
  private static calculateLogisticsFromClient(
    logisticsToClient: number,
    returnRate: number = 0 // Процент возвратов (0-100) ИЛИ можно передать как (количество_возвратов / количество_заказов * 100)
  ): number {
    if (returnRate <= 0) {
      return 0;
    }
    
    // ✅ ПРАВИЛЬНО: Логистика возврата = 50₽ за единицу × (доля возвратов)
    // Это фиксированная ставка, не зависит от объема товара
    // Это эквивалентно: 50 × (количество_возвратов / количество_заказов)
    const fixedReturnLogistics = 50; // ₽ за единицу
    return fixedReturnLogistics * (returnRate / 100);
  }
  
  /**
   * Рассчитать стоимость хранения для FBO/FBW
   * ✅ ПРАВИЛЬНО: Рассчитывается по ОБЪЕМУ товара в литрах и дням хранения
   * Тариф: ~0.5₽/л/день
   */
  private static calculateStorage(
    price: number,
    deliveryType: string,
    dimensions?: { length?: number; width?: number; height?: number },
    storageDays: number = 30,
    volumeLiters?: number
  ): number {
    // Хранение применяется только для FBO/FBW
    if (deliveryType !== 'FBO' && deliveryType !== 'FBW') {
      return 0;
    }
    
    let volume = volumeLiters || 0;
    
    // Если объем не известен, пытаемся рассчитать из габаритов
    if (volume <= 0 && dimensions && dimensions.length && dimensions.width && dimensions.height) {
      // Объем в см³ → переводим в литры (1л = 1000 см³)
      const volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
      volume = volumeCm3 / 1000;
    }
    
    // Если объем все еще не известен - используем процент от цены
    if (volume <= 0) {
      // Fallback: 1.79% от цены за месяц
      const storageRate = 1.79;
      const dailyRate = storageRate / 30;
      return (price * dailyRate * storageDays) / 100;
    }
    
    // Тариф хранения: ~0.5₽/л/день
    const tariff = 0.5; // ₽/л/день
    return tariff * volume * storageDays;
  }
  
  /**
   * Рассчитать стоимость приемки
   * ✅ ПРАВИЛЬНО: Рассчитывается по ОБЪЕМУ товара в литрах
   * Тариф: ~0.4₽/л
   */
  private static calculateAcceptance(
    price: number,
    deliveryType: string,
    dimensions?: { length?: number; width?: number; height?: number },
    volumeLiters?: number
  ): number {
    // Приемка применяется только для FBO/FBW
    if (deliveryType !== 'FBO' && deliveryType !== 'FBW') {
      return 0;
    }
    
    let volume = volumeLiters || 0;
    
    // Если объем не известен, пытаемся рассчитать из габаритов
    if (volume <= 0 && dimensions && dimensions.length && dimensions.width && dimensions.height) {
      // Объем в см³ → переводим в литры (1л = 1000 см³)
      const volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
      volume = volumeCm3 / 1000;
    }
    
    // Если объем все еще не известен - используем процент от цены
    if (volume <= 0) {
      // Fallback: 0.22% от цены
      return (price * 0.22) / 100;
    }
    
    // Тариф приемки: ~0.4₽/л
    const tariff = 0.4; // ₽/л
    return tariff * volume;
  }
  
  /**
   * Основная функция расчета детальной финансовой аналитики
   */
  static calculate(
    saleData: WbSaleData,
    commissions: CategoryCommissions,
    options?: {
      taxRate?: number; // Ставка налога (по умолчанию 6% для УСН)
      advertisingPercent?: number; // Процент расходов на рекламу
      otherExpenses?: number; // Прочие расходы
      storageDays?: number; // Дни хранения для FBO
    }
  ): DetailedFinancialCalculation {
    // ВАЖНО: Цены согласно WB API
    // priceWithDiscount (finishedPrice) - цена со скидкой продавца (база для комиссии)
    // priceWithWbDiscount (priceWithDisc) - цена с учетом скидки WB (то что видит покупатель)
    const price = saleData.priceWithDiscount; // finishedPrice - база для комиссии
    const customerPrice = saleData.priceWithWbDiscount || price; // priceWithDisc - цена для покупателя
    const wbDiscount = customerPrice - price; // Скидка WB (SPP)
    
    const deliveryType = saleData.deliveryType || 'FBW';
    const taxRate = options?.taxRate || 6;
    const advertisingPercent = options?.advertisingPercent || 3;
    const otherExpenses = options?.otherExpenses || 0;
    const storageDays = options?.storageDays || 30;
    
    // Расчет комиссии WB (от finishedPrice - базы продавца)
    const commission = this.calculateCommission(price, deliveryType, commissions);
    const commissionRate = (commission / price) * 100;
    
    // Расчет логистики до клиента (зависит от габаритов, типа доставки и KTR)
    // ✅ KTR (коэффициент склада) получается из WB API: boxDeliveryCoefExpr или boxDeliveryMarketplaceCoefExpr
    const ktr = saleData.warehouseKtr || 1.0; // По умолчанию 1.0 если KTR не указан
    const logisticsToClient = this.calculateLogisticsToClient(
      price,
      {
        length: saleData.length,
        width: saleData.width,
        height: saleData.height,
        weight: saleData.weight
      },
      deliveryType,
      saleData.volumeLiters,
      ktr  // ✅ Передаем KTR
    );
    
    // Расчет логистики возврата (зависит от доли возвратов)
    const returnRate = saleData.returnRate || (saleData.isReturned ? 100 : 0); // Если не указана доля, используем 100% если был возврат
    const logisticsFromClient = this.calculateLogisticsFromClient(
      logisticsToClient,
      returnRate
    );
    
    const totalLogistics = logisticsToClient + logisticsFromClient;
    
    // Расчет хранения
    const storage = this.calculateStorage(
      price,
      deliveryType,
      {
        length: saleData.length,
        width: saleData.width,
        height: saleData.height
      },
      storageDays
    );
    
    // Расчет приемки
    const acceptance = this.calculateAcceptance(price, deliveryType);
    
    // Общие расходы на WB
    const wbExpensesTotal = commission + totalLogistics + storage + acceptance;
    
    // К переводу продавцу
    const toTransfer = price - wbExpensesTotal;
    
    // Расходы продавца
    const taxes = (toTransfer * taxRate) / 100;
    const costPrice = saleData.costPrice || (price * 0.37); // Если не указана, берем 37% от цены
    const advertising = (price * advertisingPercent) / 100;
    const other = otherExpenses;
    
    const sellerExpensesTotal = taxes + costPrice + advertising + other;
    
    // Итого расходов
    const totalExpenses = wbExpensesTotal + sellerExpensesTotal;
    
    // Прибыль
    const profit = price - totalExpenses;
    const netProfit = profit; // Дублируем для совместимости
    
    // Маржа рассчитывается относительно цены покупателя
    const profitMargin = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;
    
    // Формируем результат
    return {
      productPrice: price,
      productPricePercent: 100,
      customerPrice, // Цена для покупателя
      wbDiscount: wbDiscount > 0 ? wbDiscount : undefined, // Скидка WB
      
      wbExpenses: {
        total: wbExpensesTotal,
        totalPercent: (wbExpensesTotal / price) * 100,
        
        commission: {
          amount: commission,
          percent: commissionRate,
          rate: commissionRate
        },
        
        logistics: {
          total: totalLogistics,
          totalPercent: (totalLogistics / price) * 100,
          
          toClient: {
            amount: logisticsToClient,
            percent: (logisticsToClient / price) * 100
          },
          
          fromClient: {
            amount: logisticsFromClient,
            percent: (logisticsFromClient / price) * 100
          }
        },
        
        storage: {
          amount: storage,
          percent: (storage / price) * 100,
          days: storageDays
        },
        
        acceptance: {
          amount: acceptance,
          percent: (acceptance / price) * 100
        }
      },
      
      toTransfer: {
        amount: toTransfer,
        percent: (toTransfer / price) * 100
      },
      
      sellerExpenses: {
        total: sellerExpensesTotal,
        totalPercent: (sellerExpensesTotal / price) * 100,
        
        taxes: {
          amount: taxes,
          percent: (taxes / price) * 100,
          rate: taxRate
        },
        
        costPrice: {
          amount: costPrice,
          percent: (costPrice / price) * 100
        },
        
        advertising: {
          amount: advertising,
          percent: (advertising / price) * 100
        },
        
        other: {
          amount: other,
          percent: (other / price) * 100
        }
      },
      
      totalExpenses: {
        amount: totalExpenses,
        percent: (totalExpenses / price) * 100
      },
      
      profit: {
        amount: profit,
        percent: profitMargin // Маржа относительно цены покупателя
      },
      
      netProfit, // Дублируем для совместимости
      deliveryType,
      category: saleData.category,
      calculatedAt: new Date()
    };
  }
  
  /**
   * Рассчитать агрегированную аналитику для массива продаж
   */
  static calculateAggregated(
    sales: WbSaleData[],
    commissionsMap: Map<string, CategoryCommissions>,
    options?: {
      taxRate?: number;
      advertisingPercent?: number;
      storageDays?: number;
    }
  ): {
    totalRevenue: number;
    totalProfit: number;
    totalExpenses: number;
    averageMargin: number;
    byDeliveryType: Record<string, {
      count: number;
      revenue: number;
      profit: number;
      margin: number;
    }>;
    byCategory: Record<string, {
      count: number;
      revenue: number;
      profit: number;
      margin: number;
    }>;
  } {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalExpenses = 0;
    
    const byDeliveryType: Record<string, any> = {};
    const byCategory: Record<string, any> = {};
    
    for (const sale of sales) {
      const commissions = commissionsMap.get(sale.category) || {
        commissionFbw: 15,
        commissionFbs: 15,
        commissionDbs: 15,
        commissionCc: 10,
        commissionEdbs: 20
      };
      
      const calculation = this.calculate(sale, commissions, options);
      
      totalRevenue += calculation.productPrice;
      totalProfit += calculation.profit.amount;
      totalExpenses += calculation.totalExpenses.amount;
      
      // По типу доставки
      const deliveryType = sale.deliveryType || 'FBW';
      if (!byDeliveryType[deliveryType]) {
        byDeliveryType[deliveryType] = {
          count: 0,
          revenue: 0,
          profit: 0,
          margin: 0
        };
      }
      byDeliveryType[deliveryType].count++;
      byDeliveryType[deliveryType].revenue += calculation.productPrice;
      byDeliveryType[deliveryType].profit += calculation.profit.amount;
      
      // По категории
      const category = sale.category;
      if (!byCategory[category]) {
        byCategory[category] = {
          count: 0,
          revenue: 0,
          profit: 0,
          margin: 0
        };
      }
      byCategory[category].count++;
      byCategory[category].revenue += calculation.productPrice;
      byCategory[category].profit += calculation.profit.amount;
    }
    
    // Рассчитываем маржу
    Object.keys(byDeliveryType).forEach(key => {
      byDeliveryType[key].margin = (byDeliveryType[key].profit / byDeliveryType[key].revenue) * 100;
    });
    
    Object.keys(byCategory).forEach(key => {
      byCategory[key].margin = (byCategory[key].profit / byCategory[key].revenue) * 100;
    });
    
    return {
      totalRevenue,
      totalProfit,
      totalExpenses,
      averageMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      byDeliveryType,
      byCategory
    };
  }
}
