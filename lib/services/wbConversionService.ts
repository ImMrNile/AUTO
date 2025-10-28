// lib/services/wbConversionService.ts - Сервис для получения данных о просмотрах и конверсии из WB Analytics API

/**
 * Интерфейс данных о конверсии товара
 */
export interface ProductConversionData {
  nmId: number;
  views: number;           // Просмотры карточки товара
  addToCart: number;       // Добавления в корзину
  orders: number;          // Заказы
  sales: number;           // Продажи
  ctr: number;             // CTR (%) - клики/просмотры
  addToCartRate: number;   // Конверсия в корзину (%)
  cartToOrderRate: number; // Конверсия из корзины в заказ (%)
  orderToSaleRate: number; // Конверсия из заказа в продажу (%)
  overallConversion: number; // Общая конверсия (%)
  period: {
    start: string;
    end: string;
  };
}

/**
 * Агрегированные данные о конверсии по всем товарам
 */
export interface DashboardConversionData {
  totalViews: number;
  totalAddToCart: number;
  totalOrders: number;
  totalSales: number;
  avgCTR: number;
  addToCartRate: number;
  purchaseRate: number;
  cartAbandonmentRate: number;
  period: {
    start: string;
    end: string;
  };
}

/**
 * Данные из WB nm-report (отчет по товарам)
 */
interface WbNmReportItem {
  nmID: number;
  vendorCode: string;
  brandName: string;
  tags: any[];
  object: string;
  statistics: {
    selectedPeriod: {
      begin: string;
      end: string;
      openCardCount: number;      // Просмотры карточки
      addToCartCount: number;     // Добавления в корзину
      ordersCount: number;        // Заказы
      ordersSumRub: number;       // Сумма заказов
      buyoutsCount: number;       // Выкупы (продажи)
      buyoutsSumRub: number;      // Сумма выкупов
      cancelCount: number;        // Отмены
      cancelSumRub: number;       // Сумма отмен
      avgPriceRub: number;        // Средняя цена
      avgOrdersCountPerDay: number; // Средние заказы в день
    };
    previousPeriod?: {
      // Аналогичная структура для предыдущего периода
      begin: string;
      end: string;
      openCardCount: number;
      addToCartCount: number;
      ordersCount: number;
      ordersSumRub: number;
      buyoutsCount: number;
      buyoutsSumRub: number;
    };
  };
}

/**
 * Сервис для работы с данными о конверсии из WB Analytics API
 */
export class WbConversionService {
  private readonly analyticsBaseUrl = 'https://seller-analytics-api.wildberries.ru';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Проверка доступа к Analytics API
   */
  async checkAnalyticsAccess(): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.analyticsBaseUrl}/ping`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiToken,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return { hasAccess: true };
      } else if (response.status === 401 || response.status === 403) {
        return { 
          hasAccess: false, 
          error: 'Нет доступа к Analytics API. Проверьте права токена.' 
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

  /**
   * Получение данных о конверсии для конкретного товара
   */
  async getProductConversion(nmId: number, dateFrom: Date, dateTo: Date): Promise<ProductConversionData | null> {
    try {
      console.log(`📊 Запрос данных конверсии для товара ${nmId}...`);

      const report = await this.getNmReport([nmId], dateFrom, dateTo);
      
      if (!report || report.length === 0) {
        console.warn(`⚠️ Нет данных конверсии для товара ${nmId}`);
        return null;
      }

      const item = report[0];
      const stats = item.statistics.selectedPeriod;

      // Расчет конверсий
      const ctr = stats.openCardCount > 0 ? (stats.addToCartCount / stats.openCardCount) * 100 : 0;
      const addToCartRate = stats.openCardCount > 0 ? (stats.addToCartCount / stats.openCardCount) * 100 : 0;
      const cartToOrderRate = stats.addToCartCount > 0 ? (stats.ordersCount / stats.addToCartCount) * 100 : 0;
      const orderToSaleRate = stats.ordersCount > 0 ? (stats.buyoutsCount / stats.ordersCount) * 100 : 0;
      const overallConversion = stats.openCardCount > 0 ? (stats.buyoutsCount / stats.openCardCount) * 100 : 0;

      const conversionData: ProductConversionData = {
        nmId,
        views: stats.openCardCount,
        addToCart: stats.addToCartCount,
        orders: stats.ordersCount,
        sales: stats.buyoutsCount,
        ctr,
        addToCartRate,
        cartToOrderRate,
        orderToSaleRate,
        overallConversion,
        period: {
          start: stats.begin,
          end: stats.end
        }
      };

      console.log(`✅ Конверсия товара ${nmId}:`, {
        просмотры: stats.openCardCount,
        вКорзину: stats.addToCartCount,
        заказы: stats.ordersCount,
        продажи: stats.buyoutsCount,
        конверсия: `${overallConversion.toFixed(2)}%`
      });

      return conversionData;
    } catch (error) {
      console.error(`❌ Ошибка получения конверсии товара ${nmId}:`, error);
      return null;
    }
  }

  /**
   * Получение агрегированных данных о конверсии для дашборда
   */
  async getDashboardConversion(nmIds: number[], dateFrom: Date, dateTo: Date): Promise<DashboardConversionData> {
    try {
      console.log(`📊 Запрос данных конверсии для ${nmIds.length} товаров...`);

      // Если товаров слишком много, делаем запросы батчами по 100 товаров
      const batchSize = 100;
      const batches: number[][] = [];
      
      for (let i = 0; i < nmIds.length; i += batchSize) {
        batches.push(nmIds.slice(i, i + batchSize));
      }

      // Запрашиваем данные батчами
      const allReports: WbNmReportItem[] = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📊 Запрос батча ${i + 1}/${batches.length} (${batch.length} товаров)...`);
        const report = await this.getNmReport(batch, dateFrom, dateTo);
        if (report) {
          allReports.push(...report);
        }
        // Увеличенная задержка между батчами для соблюдения rate limits
        if (i < batches.length - 1) {
          const delayMs = 5000; // 5 секунд между батчами (WB rate limit)
          console.log(`⏳ Ожидание ${delayMs}мс перед следующим батчем...`);
          await this.delay(delayMs);
        }
      }

      // Агрегируем данные
      let totalViews = 0;
      let totalAddToCart = 0;
      let totalOrders = 0;
      let totalSales = 0;

      allReports.forEach((item, idx) => {
        const stats = item.statistics.selectedPeriod;
        
        // 🔍 Логируем первые 3 товара для отладки
        if (idx < 3) {
          console.log(`  📊 Товар ${item.nmID}:`, {
            просмотры: stats.openCardCount || 0,
            вКорзину: stats.addToCartCount || 0,
            заказы: stats.ordersCount || 0,
            продажи: stats.buyoutsCount || 0
          });
        }
        
        totalViews += stats.openCardCount || 0;
        totalAddToCart += stats.addToCartCount || 0;
        totalOrders += stats.ordersCount || 0;
        totalSales += stats.buyoutsCount || 0;
      });

      // Расчет конверсий
      const avgCTR = totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 0;
      const addToCartRate = totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 0;
      const purchaseRate = totalAddToCart > 0 ? (totalOrders / totalAddToCart) * 100 : 0;
      const cartAbandonmentRate = totalAddToCart > 0 ? ((totalAddToCart - totalOrders) / totalAddToCart) * 100 : 0;

      console.log(`✅ Агрегированная конверсия:`, {
        просмотры: totalViews,
        вКорзину: totalAddToCart,
        заказы: totalOrders,
        продажи: totalSales,
        CTR: `${avgCTR.toFixed(2)}%`,
        конверсияВКорзину: `${addToCartRate.toFixed(2)}%`,
        конверсияВЗаказ: `${purchaseRate.toFixed(2)}%`
      });

      return {
        totalViews,
        totalAddToCart,
        totalOrders,
        totalSales,
        avgCTR,
        addToCartRate,
        purchaseRate,
        cartAbandonmentRate,
        period: {
          start: dateFrom.toISOString().split('T')[0],
          end: dateTo.toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('❌ Ошибка получения агрегированной конверсии:', error);
      
      // Возвращаем пустые данные в случае ошибки
      return {
        totalViews: 0,
        totalAddToCart: 0,
        totalOrders: 0,
        totalSales: 0,
        avgCTR: 0,
        addToCartRate: 0,
        purchaseRate: 0,
        cartAbandonmentRate: 0,
        period: {
          start: dateFrom.toISOString().split('T')[0],
          end: dateTo.toISOString().split('T')[0]
        }
      };
    }
  }

  /**
   * Получение отчета по товарам (nm-report)
   * Это основной эндпоинт для получения данных о просмотрах и конверсии
   * Поддерживает пагинацию для получения всех данных
   * Обрабатывает rate limiting (429) с экспоненциальным backoff
   */
  private async getNmReport(
    nmIds: number[], 
    dateFrom: Date, 
    dateTo: Date
  ): Promise<WbNmReportItem[] | null> {
    try {
      const url = `${this.analyticsBaseUrl}/api/v2/nm-report/detail`;
      const allData: WbNmReportItem[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      let rateLimitRetries = 0;
      const MAX_RATE_LIMIT_RETRIES = 3;

      // Форматируем даты для логирования и запроса
      const formatDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };
      
      const beginDate = formatDateTime(dateFrom);
      const endDate = formatDateTime(dateTo);
      
      console.log(`🌐 Запрос nm-report для ${nmIds.length} товаров с ${beginDate} по ${endDate}`);

      while (hasMorePages) {
        const requestBody = {
          nmIDs: nmIds,
          period: {
            begin: beginDate,
            end: endDate
          },
          timezone: 'Europe/Moscow',
          page: currentPage
        };

        let retryCount = 0;
        const MAX_RETRIES = 3;
        let response: Response | null = null;

        // Retry логика для обработки 429 и 5xx ошибок
        while (retryCount <= MAX_RETRIES && !response) {
          try {
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': this.apiToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });

            // Обработка 429 (Rate Limit)
            if (response.status === 429) {
              rateLimitRetries++;
              if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
                console.error(`❌ Превышено максимальное количество попыток при rate limit (429)`);
                return allData.length > 0 ? allData : null;
              }

              const retryAfter = response.headers.get('Retry-After');
              let waitTime = Math.pow(2, retryCount) * 10000; // Экспоненциальный backoff: 10s, 20s, 40s, 80s
              
              if (retryAfter) {
                waitTime = parseInt(retryAfter) * 1000;
              }

              console.warn(`⚠️ Rate limit (429) при запросе nm-report, ожидание ${waitTime}мс перед повтором (попытка ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})...`);
              await this.delay(waitTime);
              
              response = null; // Сбрасываем response для повтора
              retryCount++;
              continue;
            }

            // Обработка 5xx ошибок
            if (response.status >= 500 && response.status < 600 && retryCount < MAX_RETRIES) {
              const waitTime = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s, 24s
              console.warn(`⚠️ Ошибка сервера (${response.status}) при запросе nm-report, ожидание ${waitTime}мс перед повтором...`);
              await this.delay(waitTime);
              
              response = null; // Сбрасываем response для повтора
              retryCount++;
              continue;
            }

            // Если статус не OK, но это не 429 или 5xx, выходим
            if (!response.ok) {
              const errorText = await response.text();
              console.warn(`⚠️ Ошибка nm-report API (страница ${currentPage}): ${response.status} - ${errorText}`);
              return allData.length > 0 ? allData : null;
            }

          } catch (error) {
            if (retryCount < MAX_RETRIES) {
              const waitTime = Math.pow(2, retryCount) * 3000;
              console.warn(`⚠️ Ошибка соединения при запросе nm-report, ожидание ${waitTime}мс перед повтором:`, error);
              await this.delay(waitTime);
              retryCount++;
              continue;
            }
            throw error;
          }
        }

        if (!response) {
          console.error(`❌ Не удалось получить ответ после всех попыток`);
          return allData.length > 0 ? allData : null;
        }

        const data = await response.json();
        
        // ✅ ИСПРАВЛЕНО: WB API возвращает data.data.cards, а не data.data
        const cards = data?.data?.cards || [];
        
        // Детальное логирование для отладки
        console.log(`📦 Ответ nm-report (страница ${currentPage}):`, {
          hasData: !!data,
          hasCards: !!cards,
          cardsLength: cards.length,
          isNextPage: data?.data?.isNextPage || false
        });
        
        if (!data || !cards || cards.length === 0) {
          console.warn(`⚠️ Нет данных nm-report (страница ${currentPage})`);
          hasMorePages = false;
          break;
        }

        allData.push(...cards);
        
        // Проверяем, есть ли еще страницы
        if (!data.data.isNextPage) {
          hasMorePages = false;
        } else {
          currentPage++;
          // Увеличиваем задержку между запросами страниц для соблюдения rate limits
          await this.delay(1000);
        }
      }

      console.log(`✅ Получено данных по ${allData.length} товарам (${currentPage} страниц)`);
      return allData;
    } catch (error) {
      console.error('❌ Ошибка запроса nm-report:', error);
      return null;
    }
  }

  /**
   * Вспомогательная функция задержки
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получение данных о конверсии с fallback на примерные значения
   */
  async getConversionWithFallback(
    nmIds: number[], 
    dateFrom: Date, 
    dateTo: Date,
    ordersCount: number
  ): Promise<DashboardConversionData> {
    // Сначала пытаемся получить реальные данные
    const accessCheck = await this.checkAnalyticsAccess();
    
    if (accessCheck.hasAccess && nmIds.length > 0) {
      const realData = await this.getDashboardConversion(nmIds, dateFrom, dateTo);
      
      // Если получили реальные данные (хотя бы просмотры > 0), возвращаем их
      if (realData.totalViews > 0) {
        return realData;
      }
    }

    // Fallback: используем примерные расчеты на основе заказов
    console.log('⚠️ Используем примерные расчеты конверсии (нет доступа к Analytics API)');
    
    const totalViews = ordersCount * 50; // 1 заказ ≈ 50 просмотров
    const totalAddToCart = ordersCount * 5; // 1 заказ ≈ 5 добавлений в корзину
    const totalOrders = ordersCount;
    const totalSales = Math.round(ordersCount * 0.85); // 85% выкуп
    
    const avgCTR = totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 10;
    const addToCartRate = totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 10;
    const purchaseRate = totalAddToCart > 0 ? (totalOrders / totalAddToCart) * 100 : 20;
    const cartAbandonmentRate = totalAddToCart > 0 ? ((totalAddToCart - totalOrders) / totalAddToCart) * 100 : 80;

    return {
      totalViews,
      totalAddToCart,
      totalOrders,
      totalSales,
      avgCTR,
      addToCartRate,
      purchaseRate,
      cartAbandonmentRate,
      period: {
        start: dateFrom.toISOString().split('T')[0],
        end: dateTo.toISOString().split('T')[0]
      }
    };
  }
}
