// lib/services/wbReportService.ts - Сервис для получения детализированных отчетов WB с реальными расходами

import { WB_API_CONFIG } from '../config/wbApiConfig';
import type { WarehouseCoefficients } from './wbTariffService';

/**
 * Интерфейс детализированного отчета WB (как в Excel файле)
 */
export interface WbDetailedReportItem {
  // Основная информация о продаже
  nmId: number;
  subject: string;
  brand: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  
  // Тип документа и даты
  docTypeName: string; // "Продажа" или "Логистика"
  quantity: number;
  totalPrice: number; // Цена розничная
  
  // Финансовые данные (РЕАЛЬНЫЕ из WB)
  retailPrice: number; // Цена розничная
  retailPriceWithDisc: number; // Цена с учетом скидки
  forPay: number; // К перечислению за товар
  
  // ДЕТАЛИЗАЦИЯ РАСХОДОВ (то что нам нужно!)
  deliveryRub: number; // Стоимость логистики до клиента (зависит от литража)
  returnDeliveryRub: number; // Стоимость логистики возврата (ПОЛНАЯ логистика по литражу, не 50₽!)
  storageRub: number; // Стоимость хранения
  acceptanceRub: number; // Стоимость платной приемки
  
  // Комиссия WB
  commissionPercent: number; // Размер кВВ, %
  supplierReward: number; // Вознаграждение Вайлдберриз (ВВ), без НДС
  
  // Дополнительные расходы
  penalty: number; // Общая сумма штрафов
  additionalPayment: number; // Прочие удержания/выплаты
  
  // Даты
  orderDt: string; // Дата заказа
  saleDt: string; // Дата продажи
  
  // Склад и офис
  warehouseName: string;
  oblastOkrugName: string;
  regionName: string;
  
  // Признаки
  isReturn: boolean; // Возврат
  isCancel: boolean; // Отмена
}

/**
 * Габариты товара для расчета логистики
 */
export interface ProductDimensions {
  length: number;  // см
  width: number;   // см
  height: number;  // см
  weight?: number; // граммы
}

/**
 * Рассчитать объем товара в литрах
 */
function calculateVolume(dimensions: ProductDimensions): number {
  const { length, width, height } = dimensions;
  // Объем = длина × ширина × высота (в см³), делим на 1000 для литров
  return (length * width * height) / 1000;
}

/**
 * Рассчитать стоимость логистики на основе габаритов и тарифов склада
 * Формула WB: Базовая ставка + (Объем - 1 литр) × Стоимость доп. литра × KTR
 */
function calculateLogisticsCost(
  dimensions: ProductDimensions,
  warehouseCoeffs: WarehouseCoefficients | undefined
): number {
  if (!warehouseCoeffs) {
    return 0; // Нет данных о складе
  }

  const volume = calculateVolume(dimensions);
  const { boxDeliveryBase, boxDeliveryLiter, boxDeliveryCoefExpr } = warehouseCoeffs;
  
  // KTR (коэффициент территории) - делим на 100, так как в API он в процентах
  const ktr = boxDeliveryCoefExpr / 100;
  
  // Базовая ставка за первый литр
  let cost = boxDeliveryBase;
  
  // Доплата за дополнительные литры (если объем > 1 литра)
  if (volume > 1) {
    const additionalLiters = volume - 1;
    cost += additionalLiters * boxDeliveryLiter;
  }
  
  // Умножаем на KTR
  cost *= ktr;
  
  return Math.round(cost * 100) / 100; // Округляем до копеек
}

/**
 * Агрегированные расходы по всем продажам
 */
export interface AggregatedExpenses {
  // Выручка
  totalRevenue: number; // Общая выручка (что заплатил покупатель)
  totalForPay: number; // К переводу (после всех вычетов WB)
  
  // Детализация расходов WB
  totalCommission: number; // Комиссия WB
  totalLogistics: number; // Логистика до клиента (зависит от литража)
  totalLogisticsReturn: number; // Логистика возвратов (ПОЛНАЯ по литражу, зависит от доли выкупа)
  totalStorage: number; // Хранение
  totalAcceptance: number; // Приемка
  totalPenalty: number; // Штрафы
  totalAdvertising: number; // 📢 Расходы на рекламу/продвижение (из additionalPayment < 0)
  totalOther: number; // Прочие удержания/выплаты
  
  // Итого расходов WB
  totalWbExpenses: number;
  
  // Статистика
  totalSales: number; // Количество продаж
  totalReturns: number; // Количество возвратов
  totalCancels: number; // Количество отмен
}

/**
 * Сервис для работы с детализированными отчетами WB
 */
export class WbReportService {
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = WB_API_CONFIG.BASE_URLS.STATISTICS;
  }

  /**
   * Получение детализированного отчета за период
   * Это API возвращает ВСЕ данные о расходах, как в Excel файле
   */
  async getDetailedReport(dateFrom: Date, dateTo: Date): Promise<WbDetailedReportItem[]> {
    try {
      const url = `${this.baseUrl}${WB_API_CONFIG.ENDPOINTS.REPORT_DETAIL_BY_PERIOD}`;
      
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString().split('T')[0],
        dateTo: dateTo.toISOString().split('T')[0],
        limit: '100000', // Максимум записей
        rrdid: '0' // Начинаем с первой записи
      });

      console.log(`📊 Запрос детализированного отчета WB: ${url}?${params.toString()}`);

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json',
          'User-Agent': 'WB-AI-Assistant/2.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Ошибка получения отчета WB (${response.status}):`, errorText);
        throw new Error(`WB API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.warn('⚠️ Некорректный формат ответа WB API');
        return [];
      }

      console.log(`✅ Получено ${data.length} записей из детализированного отчета WB`);

      // 🔍 ОТЛАДКА: Логируем первые 3 записи чтобы увидеть структуру данных
      if (data.length > 0) {
        console.log(`\n🔍 СТРУКТУРА ДАННЫХ WB API (первая запись ДО маппинга):`);
        const firstItem = data[0];
        console.log(`  Поля логистики (snake_case):`, {
          delivery_rub: firstItem.delivery_rub,
          return_delivery_rub: firstItem.return_delivery_rub,
          storage_fee: firstItem.storage_fee,
          acceptance: firstItem.acceptance,           // ← ПРАВИЛЬНОЕ ПОЛЕ!
          acceptance_fee: firstItem.acceptance_fee    // ← Старое (может не быть)
        });
        console.log(`  Другие поля:`, {
          doc_type_name: firstItem.doc_type_name,
          ppvz_for_pay: firstItem.ppvz_for_pay,
          ppvz_reward: firstItem.ppvz_reward,
          retail_price_withdisc_rub: firstItem.retail_price_withdisc_rub,
          penalty: firstItem.penalty,
          additional_payment: firstItem.additional_payment
        });
      }

      // Маппим данные в наш формат
      const mappedData: WbDetailedReportItem[] = data.map(item => ({
        nmId: item.nm_id || item.nmId || 0,
        subject: item.subject || '',
        brand: item.brand_name || item.brand || '',
        supplierArticle: item.sa_name || item.supplierArticle || '',
        techSize: item.ts_name || item.techSize || '',
        barcode: item.barcode || '',
        
        docTypeName: item.doc_type_name || item.docTypeName || '',
        quantity: item.quantity || 0,
        totalPrice: item.retail_price || item.totalPrice || 0,
        
        retailPrice: item.retail_price || item.retailPrice || 0,
        retailPriceWithDisc: item.retail_price_withdisc_rub || item.retailPriceWithDisc || 0,
        forPay: item.ppvz_for_pay || item.forPay || 0,
        
        // РЕАЛЬНЫЕ расходы из WB API (snake_case → camelCase)
        // ВАЖНО: Названия полей из официальной документации WB API
        deliveryRub: Math.abs(Number(item.delivery_rub ?? item.deliveryRub ?? 0)),
        returnDeliveryRub: Math.abs(Number(item.return_delivery_rub ?? item.returnDeliveryRub ?? 0)),
        storageRub: Math.abs(Number(item.storage_fee ?? item.storageRub ?? 0)),
        acceptanceRub: Math.abs(Number(item.acceptance ?? item.acceptance_fee ?? item.acceptanceRub ?? 0)),
        
        commissionPercent: Math.abs(item.kiz_kvv_percent || item.commissionPercent || 0),
        supplierReward: Math.abs(item.ppvz_reward || item.supplierReward || 0),
        
        penalty: Math.abs(item.penalty || 0),
        additionalPayment: item.additional_payment || item.additionalPayment || 0,
        
        orderDt: item.order_dt || item.orderDt || '',
        saleDt: item.sale_dt || item.saleDt || '',
        
        warehouseName: item.warehouse_name || item.warehouseName || '',
        oblastOkrugName: item.oblast_okrug_name || item.oblastOkrugName || '',
        regionName: item.region_name || item.regionName || '',
        
        isReturn: (item.doc_type_name || item.docTypeName || '').includes('возврат') || 
                  (item.doc_type_name || item.docTypeName || '').includes('Возврат'),
        isCancel: (item.doc_type_name || item.docTypeName || '').includes('отмен') ||
                  (item.doc_type_name || item.docTypeName || '').includes('Отмен')
      }));

      // 🔍 ОТЛАДКА: Логируем первую запись ПОСЛЕ маппинга
      if (mappedData.length > 0) {
        console.log(`\n🔍 СТРУКТУРА ДАННЫХ ПОСЛЕ маппинга (первая запись):`);
        const firstMapped = mappedData[0];
        console.log(`  Поля логистики (camelCase):`, {
          deliveryRub: firstMapped.deliveryRub,
          returnDeliveryRub: firstMapped.returnDeliveryRub,
          storageRub: firstMapped.storageRub,
          acceptanceRub: firstMapped.acceptanceRub
        });
        console.log(`  Другие поля:`, {
          docTypeName: firstMapped.docTypeName,
          forPay: firstMapped.forPay,
          supplierReward: firstMapped.supplierReward,
          retailPriceWithDisc: firstMapped.retailPriceWithDisc
        });
      }

      // ✅ КРИТИЧНО: Фильтруем по дате ПРОДАЖИ, а не по дате формирования отчета!
      // API reportDetailByPeriod возвращает данные по дате формирования отчета,
      // но нам нужны данные по дате продажи (sale_dt)
      
      // Нормализуем даты для сравнения (игнорируем время)
      const dateFromNormalized = new Date(dateFrom);
      dateFromNormalized.setHours(0, 0, 0, 0);
      
      const dateToNormalized = new Date(dateTo);
      dateToNormalized.setHours(23, 59, 59, 999);
      
      const filteredData = mappedData.filter(item => {
        if (!item.saleDt) return false;
        
        const saleDate = new Date(item.saleDt);
        const isInRange = saleDate >= dateFromNormalized && saleDate <= dateToNormalized;
        
        if (!isInRange) {
          const dateFromStr = dateFromNormalized.toISOString().split('T')[0];
          const dateToStr = dateToNormalized.toISOString().split('T')[0];
          const saleDateStr = saleDate.toISOString().split('T')[0];
          console.log(`⏭️ Пропускаем запись: дата продажи ${saleDateStr} вне диапазона ${dateFromStr} - ${dateToStr}`);
        }
        
        return isInRange;
      });

      console.log(`✅ После фильтрации по дате продажи: ${filteredData.length} из ${mappedData.length} записей`);

      return filteredData;
    } catch (error) {
      console.error('❌ Ошибка получения детализированного отчета WB:', error);
      throw error;
    }
  }

  /**
   * Агрегация расходов из детализированного отчета
   * Суммируем ВСЕ реальные расходы из каждой записи
   * @param reportData - Данные из детализированного отчета WB
   * @param productDimensionsMap - Map габаритов товаров (nmId -> dimensions)
   * @param warehouseTariffsMap - Map тарифов складов (warehouseName -> coefficients)
   */
  aggregateExpenses(
    reportData: WbDetailedReportItem[],
    productDimensionsMap?: Map<number, ProductDimensions>,
    warehouseTariffsMap?: Map<string, WarehouseCoefficients>
  ): AggregatedExpenses {
    let totalRevenue = 0;
    let totalForPay = 0;
    let totalCommission = 0;
    let totalLogistics = 0;
    let totalLogisticsReturn = 0;
    let totalStorage = 0;
    let totalAcceptance = 0;
    let totalPenalty = 0;
    let totalAdvertising = 0; // 📢 Расходы на рекламу/продвижение
    let totalOther = 0; // Прочие удержания (не реклама)
    let totalSales = 0;
    let totalReturns = 0;
    let totalCancels = 0;

    // 🔍 ФИЛЬТР: Удаляем ТОЛЬКО полностью пустые записи
    // ✅ ВАЖНО: Оставляем записи с расходами, даже если docTypeName пустой!
    const validReportData = reportData.filter(item => {
      const hasQuantity = item.quantity > 0;
      const hasDocType = item.docTypeName && item.docTypeName.trim() !== '';
      const hasExpenses = item.deliveryRub > 0 || item.returnDeliveryRub > 0 || 
                         item.storageRub > 0 || item.acceptanceRub > 0 || 
                         item.penalty > 0 || Math.abs(item.additionalPayment) > 0;
      
      // Оставляем запись если есть quantity ИЛИ docType ИЛИ расходы
      return hasQuantity || hasDocType || hasExpenses;
    });
    
    console.log(`📊 Агрегация расходов: обработка ${validReportData.length} из ${reportData.length} записей (отфильтровано ${reportData.length - validReportData.length} полностью пустых)`);
    console.log(`📊 Детализация комиссии по каждому товару:`);

    // ШАГ 1: Собираем выручку, к переводу и все расходы из отчета
    validReportData.forEach((item, idx) => {
      const docType = item.docTypeName || 'Unknown';
      const isRealSale = (docType.includes('Продажа') || docType.includes('Выкуп')) && item.quantity > 0;
      const isReturn = (docType.includes('возврат') || docType.includes('Возврат')) && item.quantity > 0;
      const isCancel = (docType.includes('отмен') || docType.includes('Отмен')) && item.quantity > 0;
      
      // Считаем выручку и к переводу
      if (isRealSale || isReturn || isCancel) {
        const basePrice = item.retailPriceWithDisc || item.retailPrice;
        
        if (isRealSale) {
          totalRevenue += basePrice;
          totalForPay += item.forPay;
          totalSales += item.quantity;
          console.log(`  ✅ ${docType}: товар ${item.nmId}, база=${basePrice.toFixed(2)}₽, кПереводу=${item.forPay.toFixed(2)}₽`);
        } else if (isReturn) {
          totalRevenue -= basePrice;
          totalForPay -= item.forPay;
          totalReturns += item.quantity;
          console.log(`  ⚠️ Возврат: товар ${item.nmId}, база=-${basePrice.toFixed(2)}₽, кПереводу=-${item.forPay.toFixed(2)}₽`);
        } else if (isCancel) {
          totalRevenue -= basePrice;
          totalForPay -= item.forPay;
          totalCancels += item.quantity;
          console.log(`  ⚠️ Отмена: товар ${item.nmId}, база=-${basePrice.toFixed(2)}₽, кПереводу=-${item.forPay.toFixed(2)}₽`);
        }
      }
      
      // ✅ ИСПРАВЛЕНО: Собираем расходы из ВСЕХ записей, не только с docTypeName
      // WB API возвращает записи с пустым docTypeName, но с реальными расходами
      // 🔍 ОТЛАДКА: Логируем поля логистики для первых 3 записей
      if (idx < 3 && (item.deliveryRub > 0 || item.returnDeliveryRub > 0 || item.storageRub > 0)) {
        console.log(`  🔍 Расходы для товара ${item.nmId} (docType: "${docType}"):`);
        console.log(`     - deliveryRub: ${item.deliveryRub}₽`);
        console.log(`     - returnDeliveryRub: ${item.returnDeliveryRub}₽`);
        console.log(`     - storageRub: ${item.storageRub}₽`);
        console.log(`     - acceptanceRub: ${item.acceptanceRub}₽`);
      }
      
      // 🔍 ОТЛАДКА: Логируем поля расходов для первых 5 записей
      if (idx < 5) {
        console.log(`  🔍 [${idx}] Товар ${item.nmId} (${docType}):`);
        console.log(`     deliveryRub: ${item.deliveryRub}₽ (тип: ${typeof item.deliveryRub})`);
        console.log(`     returnDeliveryRub: ${item.returnDeliveryRub}₽`);
        console.log(`     storageRub: ${item.storageRub}₽`);
        console.log(`     acceptanceRub: ${item.acceptanceRub}₽`);
      }
      
      // ✅ РАСЧЕТНАЯ ЛОГИСТИКА: Если WB API не вернул расходы, рассчитываем сами
      let deliveryCost = item.deliveryRub;
      let returnDeliveryCost = item.returnDeliveryRub;
      
      // Если логистика = 0 И есть данные для расчета, используем расчетную логистику
      if (deliveryCost === 0 && productDimensionsMap && warehouseTariffsMap) {
        const dimensions = productDimensionsMap.get(item.nmId);
        const warehouseCoeffs = warehouseTariffsMap.get(item.warehouseName);
        
        if (dimensions && warehouseCoeffs && (isRealSale || isReturn)) {
          const calculatedCost = calculateLogisticsCost(dimensions, warehouseCoeffs);
          deliveryCost = calculatedCost;
          
          if (idx < 3) {
            console.log(`  🧮 РАСЧЕТНАЯ логистика для товара ${item.nmId}:`);
            console.log(`     - Габариты: ${dimensions.length}×${dimensions.width}×${dimensions.height} см`);
            console.log(`     - Объем: ${calculateVolume(dimensions).toFixed(2)} л`);
            console.log(`     - Склад: ${item.warehouseName}`);
            console.log(`     - Рассчитано: ${calculatedCost.toFixed(2)}₽`);
          }
        }
      }
      
      // Собираем расходы из ВСЕХ записей (даже с пустым docTypeName)
      totalLogistics += deliveryCost;
      totalLogisticsReturn += returnDeliveryCost;
      totalStorage += item.storageRub;
      totalAcceptance += item.acceptanceRub;
      totalPenalty += item.penalty;
      
      // 📢 Обработка additionalPayment (прочие удержания/выплаты)
      // Отрицательные значения = удержания (реклама, корректировки)
      // Положительные значения = выплаты/бонусы от WB
      // 🔍 ТОЛЬКО для реальных операций (не пустые записи)
      if ((isRealSale || isReturn || isCancel) && item.additionalPayment !== 0) {
        const absValue = Math.abs(item.additionalPayment);
        
        console.log(`  🔍 additionalPayment для товара ${item.nmId}: ${item.additionalPayment.toFixed(2)}₽ (тип: ${item.docTypeName})`);
        
        if (item.additionalPayment < 0) {
          // Отрицательное = удержание
          // В WB отчетах это обычно расходы на рекламу (продвижение)
          // Также могут быть корректировки, доплаты за услуги и т.д.
          totalAdvertising += absValue;
          
          // Логируем ВСЕ удержания для анализа
          console.log(`  📢 Удержание (реклама/продвижение): ${absValue.toFixed(2)}₽ для товара ${item.nmId}`);
        } else {
          // Положительное = выплата/бонус от WB (редко, но бывает)
          totalOther += absValue;
          console.log(`  💰 Доп. выплата от WB: ${absValue.toFixed(2)}₽ для товара ${item.nmId}`);
        }
      }
    });

    // ШАГ 2: Рассчитываем комиссию по правильной формуле
    // К переводу = Выручка - Комиссия - Логистика - Хранение - Приемка - Штрафы - Реклама - Прочее
    // Следовательно: Комиссия = Выручка - К переводу - Логистика - Хранение - Приемка - Штрафы - Реклама - Прочее
    const allOtherExpenses = totalLogistics + totalLogisticsReturn + totalStorage + totalAcceptance + totalPenalty + totalAdvertising + totalOther;
    totalCommission = totalRevenue - totalForPay - allOtherExpenses;
    
    console.log(`\n💰 РАСЧЕТ КОМИССИИ (правильная формула):`);
    console.log(`   Выручка:           ${totalRevenue.toFixed(2)}₽`);
    console.log(`   К переводу:        ${totalForPay.toFixed(2)}₽`);
    console.log(`   Логистика:         ${totalLogistics.toFixed(2)}₽`);
    console.log(`   Логистика возврат: ${totalLogisticsReturn.toFixed(2)}₽`);
    console.log(`   Хранение:          ${totalStorage.toFixed(2)}₽`);
    console.log(`   Приемка:           ${totalAcceptance.toFixed(2)}₽`);
    console.log(`   Штрафы:            ${totalPenalty.toFixed(2)}₽`);
    console.log(`   📢 Реклама:        ${totalAdvertising.toFixed(2)}₽ ${totalAdvertising > 0 ? '✅' : '⚠️ (проверьте additionalPayment в отчете)'}`);
    console.log(`   Прочее:            ${totalOther.toFixed(2)}₽`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   Комиссия WB:       ${totalCommission.toFixed(2)}₽ (${totalRevenue > 0 ? (totalCommission / totalRevenue * 100).toFixed(2) : '0.00'}%)`);
    console.log(`   Проверка: ${totalRevenue.toFixed(2)} - ${totalCommission.toFixed(2)} - ${allOtherExpenses.toFixed(2)} = ${(totalRevenue - totalCommission - allOtherExpenses).toFixed(2)}₽ (должно = ${totalForPay.toFixed(2)}₽)`);

    // Общие расходы WB = сумма всех компонентов расходов
    const totalWbExpenses = totalCommission + totalLogistics + totalLogisticsReturn + 
                           totalStorage + totalAcceptance + totalPenalty + totalAdvertising + totalOther;

    console.log('\n💰 ДЕТАЛИЗАЦИЯ РАСХОДОВ WB (куда делась вся сумма):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 ВЫРУЧКА (база продавца):        ${totalRevenue.toFixed(2)}₽`);
    console.log('');
    console.log('💸 РАСХОДЫ WB:');
    console.log(`   • Комиссия WB:                  ${totalCommission.toFixed(2)}₽`);
    console.log(`   • Логистика до клиента:         ${totalLogistics.toFixed(2)}₽`);
    console.log(`   • Логистика возвратов:          ${totalLogisticsReturn.toFixed(2)}₽`);
    console.log(`   • Хранение:                     ${totalStorage.toFixed(2)}₽`);
    console.log(`   • Приемка:                      ${totalAcceptance.toFixed(2)}₽`);
    console.log(`   • Штрафы:                       ${totalPenalty.toFixed(2)}₽`);
    console.log(`   📢 Реклама/Продвижение:         ${totalAdvertising.toFixed(2)}₽`);
    console.log(`   • Прочие удержания:             ${totalOther.toFixed(2)}₽`);
    console.log(`   ─────────────────────────────────────────────────`);
    console.log(`   ВСЕГО РАСХОДОВ WB:              ${totalWbExpenses.toFixed(2)}₽`);
    console.log('');
    console.log(`✅ К ПЕРЕВОДУ:                     ${totalForPay.toFixed(2)}₽`);
    console.log('');
    
    // ✅ ПРОВЕРКА: Выручка - Расходы должно равняться К переводу
    const calculatedForPay = totalRevenue - totalWbExpenses;
    const difference = Math.abs(calculatedForPay - totalForPay);
    console.log('🔍 ПРОВЕРКА РАСЧЕТОВ:');
    console.log(`   Выручка - Расходы = ${calculatedForPay.toFixed(2)}₽`);
    console.log(`   К переводу (факт) = ${totalForPay.toFixed(2)}₽`);
    console.log(`   Разница:           ${difference.toFixed(2)}₽ ${difference < 1 ? '✅' : '⚠️'}`);
    console.log('');
    console.log(`📦 Статистика: ${totalSales} продаж, ${totalReturns} возвратов, ${totalCancels} отмен`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      totalRevenue: Math.round(totalRevenue),
      totalForPay: Math.round(totalForPay),
      totalCommission: Math.round(totalCommission),
      totalLogistics: Math.round(totalLogistics),
      totalLogisticsReturn: Math.round(totalLogisticsReturn),
      totalStorage: Math.round(totalStorage),
      totalAcceptance: Math.round(totalAcceptance),
      totalPenalty: Math.round(totalPenalty),
      totalAdvertising: Math.round(totalAdvertising), // 📢 Расходы на рекламу
      totalOther: Math.round(totalOther),
      totalWbExpenses: Math.round(totalWbExpenses),
      totalSales,
      totalReturns,
      totalCancels
    };
  }

  /**
   * Получение и агрегация расходов за период (все в одном)
   */
  async getAggregatedExpenses(dateFrom: Date, dateTo: Date): Promise<AggregatedExpenses> {
    const reportData = await this.getDetailedReport(dateFrom, dateTo);
    return this.aggregateExpenses(reportData);
  }
}
