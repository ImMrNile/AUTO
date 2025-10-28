/**
 * lib/services/wbLogisticsCalculator.ts
 * Расчет стоимости логистики по новым тарифам WB (с 15 сентября 2025)
 * 
 * Новая стоимость логистики:
 * - 0,001-0,200л: 23₽/л
 * - 0,201-0,400л: 26₽/л
 * - 0,401-0,600л: 29₽/л
 * - 0,601-0,800л: 30₽/л
 * - 0,801-1,000л: 32₽/л
 * - >1,000л: 46₽ за первый литр + 14₽ за каждый дополнительный
 */

export interface Dimensions {
  length?: number;  // см
  width?: number;   // см
  height?: number;  // см
}

export class WbLogisticsCalculator {
  /**
   * Рассчитать объем товара в литрах
   * @param dimensions - размеры товара {length, width, height} в см
   * @returns объем в литрах
   */
  static calculateVolume(dimensions?: Dimensions): number {
    if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
      return 1; // Дефолт 1л если размеры не указаны
    }
    
    // Объем в см³ / 1000 = литры
    const volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
    const volumeLiters = volumeCm3 / 1000;
    
    console.log(`📦 Расчет объема: ${dimensions.length}см × ${dimensions.width}см × ${dimensions.height}см = ${volumeLiters.toFixed(3)}л`);
    
    return volumeLiters;
  }

  /**
   * Рассчитать базовый тариф логистики по новым правилам WB
   * @param volumeLiters - объем товара в литрах
   * @returns стоимость логистики в рублях
   */
  static calculateBaseTariff(volumeLiters: number): number {
    // Если объем не указан - используем дефолт 1л
    if (volumeLiters <= 0) {
      volumeLiters = 1;
    }

    let tariff = 0;

    if (volumeLiters <= 0.200) {
      // 0,001-0,200л: 23₽/л
      tariff = volumeLiters * 23;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (0,001-0,200л): ${volumeLiters} × 23 = ${tariff.toFixed(2)}₽`);
    } else if (volumeLiters <= 0.400) {
      // 0,201-0,400л: 26₽/л
      tariff = volumeLiters * 26;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (0,201-0,400л): ${volumeLiters} × 26 = ${tariff.toFixed(2)}₽`);
    } else if (volumeLiters <= 0.600) {
      // 0,401-0,600л: 29₽/л
      tariff = volumeLiters * 29;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (0,401-0,600л): ${volumeLiters} × 29 = ${tariff.toFixed(2)}₽`);
    } else if (volumeLiters <= 0.800) {
      // 0,601-0,800л: 30₽/л
      tariff = volumeLiters * 30;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (0,601-0,800л): ${volumeLiters} × 30 = ${tariff.toFixed(2)}₽`);
    } else if (volumeLiters <= 1.000) {
      // 0,801-1,000л: 32₽/л
      tariff = volumeLiters * 32;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (0,801-1,000л): ${volumeLiters} × 32 = ${tariff.toFixed(2)}₽`);
    } else {
      // >1,000л: 46₽ за первый литр + 14₽ за каждый дополнительный
      const firstLiter = 1 * 46;
      const additionalLiters = (volumeLiters - 1) * 14;
      tariff = firstLiter + additionalLiters;
      console.log(`  📊 Объем ${volumeLiters.toFixed(3)}л (>1,000л): 1 × 46 + ${(volumeLiters - 1).toFixed(3)} × 14 = ${tariff.toFixed(2)}₽`);
    }

    return tariff;
  }

  /**
   * Рассчитать логистику с учетом KTR склада
   * @param volumeLiters - объем товара в литрах
   * @param ktr - коэффициент склада (например 1.95)
   * @returns стоимость логистики с KTR в рублях
   */
  static calculateLogisticsWithKtr(volumeLiters: number, ktr: number = 1): number {
    const baseTariff = this.calculateBaseTariff(volumeLiters);
    const logisticsWithKtr = baseTariff * ktr;
    
    if (ktr !== 1) {
      console.log(`  🏭 Применяем KTR склада ${ktr}: ${baseTariff.toFixed(2)} × ${ktr} = ${logisticsWithKtr.toFixed(2)}₽`);
    }
    
    return logisticsWithKtr;
  }

  /**
   * Рассчитать логистику возврата
   * Фиксированная стоимость 50₽ за единицу
   * @param quantity - количество возвращенных товаров
   * @returns стоимость логистики возврата
   */
  static calculateReturnLogistics(quantity: number): number {
    const returnLogistics = quantity * 50;
    console.log(`  ↩️ Логистика возврата: ${quantity} × 50 = ${returnLogistics}₽`);
    return returnLogistics;
  }

  /**
   * Рассчитать хранение
   * Примерно 5₽ за единицу в день (зависит от объема и дней)
   * @param quantity - количество товаров
   * @param days - количество дней хранения (по умолчанию 30)
   * @returns стоимость хранения
   */
  static calculateStorage(quantity: number, days: number = 30): number {
    // Примерный расчет: 5₽ за единицу за период
    const storage = quantity * 5;
    console.log(`  🏢 Хранение: ${quantity} × 5 = ${storage}₽`);
    return storage;
  }

  /**
   * Рассчитать приемку
   * Примерно 2₽ за единицу
   * @param quantity - количество товаров
   * @returns стоимость приемки
   */
  static calculateAcceptance(quantity: number): number {
    const acceptance = quantity * 2;
    console.log(`  📦 Приемка: ${quantity} × 2 = ${acceptance}₽`);
    return acceptance;
  }

  /**
   * Полный расчет всех расходов для товара
   */
  static calculateAllExpenses(options: {
    quantity: number;
    revenue: number;
    commissionRate: number;
    dimensions?: Dimensions;
    ktr?: number;
    isReturn?: boolean;
    isCancel?: boolean;
  }): {
    commission: number;
    logisticsToClient: number;
    logisticsReturn: number;
    storage: number;
    acceptance: number;
    totalExpenses: number;
    forPay: number;
  } {
    const {
      quantity,
      revenue,
      commissionRate,
      dimensions,
      ktr = 1,
      isReturn = false,
      isCancel = false
    } = options;

    // Комиссия
    const commission = (revenue * commissionRate) / 100;

    // Логистика до клиента (только для успешных продаж)
    let logisticsToClient = 0;
    if (!isReturn && !isCancel) {
      const volume = this.calculateVolume(dimensions);
      logisticsToClient = this.calculateLogisticsWithKtr(volume, ktr);
    }

    // Логистика возврата (только для возвратов)
    const logisticsReturn = isReturn ? this.calculateReturnLogistics(quantity) : 0;

    // Хранение и приемка (только для успешных продаж)
    const storage = !isReturn && !isCancel ? this.calculateStorage(quantity) : 0;
    const acceptance = !isReturn && !isCancel ? this.calculateAcceptance(quantity) : 0;

    // Итого расходы
    const totalExpenses = commission + logisticsToClient + logisticsReturn + storage + acceptance;
    const forPay = revenue - totalExpenses;

    return {
      commission,
      logisticsToClient,
      logisticsReturn,
      storage,
      acceptance,
      totalExpenses,
      forPay
    };
  }
}
