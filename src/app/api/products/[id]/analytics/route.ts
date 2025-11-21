// src/app/api/products/[id]/analytics/route.ts - Полная аналитика товара с реальными данными WB

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { UserWbTokenService } from '../../../../../../lib/services/userWbTokenService';
import { WbFinancialCalculator, type WbSaleData, type CategoryCommissions } from '../../../../../../lib/services/wbFinancialCalculator';
import { WbAnalyticsService } from '../../../../../../lib/services/wbAnalyticsService';
import { WbStatisticsService } from '../../../../../../lib/services/wbStatisticsService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Интерфейс для статистики товара из WB API
 */
interface WbProductStats {
  nmId: number;
  vendorCode: string;
  
  // Цены
  price: number;
  discountedPrice: number;
  discount: number;
  
  // Остатки
  stocks: {
    total: number;
    inWarehouse: number;
    inTransit: number;
    available: number;
  };
  
  // Продажи (если доступно)
  sales?: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  
  // Заказы
  orders?: {
    total: number;
    last7Days: number;
    last30Days: number;
  };
  
  // Рейтинг и отзывы
  rating?: {
    average: number;
    count: number;
  };
  
  // Позиция в поиске
  searchPosition?: {
    category: number;
    query: string;
  }[];
}

/**
 * Интерфейс для полной аналитики товара
 */
interface ProductFullAnalytics {
  // Базовая информация
  product: {
    id: string;
    nmId: number | null;
    name: string;
    vendorCode: string;
    category: string;
    subcategory: string;
    status: string;
  };
  
  // Финансовая аналитика
  financial: {
    currentPrice: number;
    originalPrice: number;
    costPrice: number | null;
    discount: number;
    
    // Детальный расчет прибыли
    profitCalculation: any;
    
    // Комиссии WB
    commissions: {
      fbw: number;
      fbs: number;
      dbs: number;
      cc: number;
      edbs: number;
    };
  };
  
  // Остатки и склад
  inventory: {
    total: number;
    available: number;
    inWarehouse: number;
    inTransit: number;
    reserved: number;
  };
  
  // Статистика продаж
  sales: {
    total: number;
    last7Days: number;
    last30Days: number;
    averagePerDay: number;
    trend: 'up' | 'down' | 'stable';
    
    // График продаж за последние 30 дней
    chart: {
      date: string;
      sales: number;
      revenue: number;
    }[];
  };
  
  // Статистика заказов
  orders: {
    total: number;
    last7Days: number;
    last30Days: number;
    conversionRate: number;
  };
  
  // Рейтинг и отзывы
  reviews: {
    averageRating: number;
    totalCount: number;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  
  // SEO и продвижение
  promotion: {
    // Поисковые запросы
    searchQueries: {
      query: string;
      position: number;
      frequency: number;
      cluster: string;
    }[];
    
    // Ключевые слова категории
    categoryKeywords: {
      keyword: string;
      frequency: number;
      competition: number;
    }[];
    
    // Видимость товара
    visibility: {
      inSearch: boolean;
      inCategory: boolean;
      averagePosition: number;
    };
  };
  
  // Конверсия
  conversion: {
    viewToCart: number;
    cartToOrder: number;
    orderToSale: number;
    overall: number;
  };
  
  // Метаданные
  metadata: {
    lastUpdated: string;
    dataSource: string;
    hasRealData: boolean;
  };
}

/**
 * GET - Получение полной аналитики товара
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📊 Запрос полной аналитики для товара: ${params.id}`);

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получаем товар из БД с аналитикой
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { wbNmId: params.id }
        ],
        userId: user.id
      },
      include: {
        subcategory: {
          include: {
            parentCategory: true
          }
        },
        productCabinets: {
          include: {
            cabinet: true
          }
        },
        analytics: true // Включаем реальные данные аналитики из БД
      }
    });

    if (!product) {
      return NextResponse.json({
        error: 'Товар не найден'
      }, { status: 404 });
    }

    console.log(`✅ Товар найден: ${product.name}`);

    // Получаем WB токен из кабинета товара
    const productCabinet = product.productCabinets.find(pc => pc.isSelected);
    const cabinet = productCabinet?.cabinet;

    if (!cabinet?.apiToken) {
      return NextResponse.json({
        error: 'WB API токен не найден для кабинета товара'
      }, { status: 400 });
    }

    const wbApiToken = cabinet.apiToken;
    console.log(`🔑 Используем токен кабинета: ${cabinet.name}`);

    // Инициализируем результат аналитики
    const analytics: ProductFullAnalytics = {
      product: {
        id: product.id,
        nmId: product.wbNmId ? parseInt(product.wbNmId) : null,
        name: product.name,
        vendorCode: product.vendorCode || '',
        category: product.subcategory?.parentCategory?.name || 'Без категории',
        subcategory: product.subcategory?.name || 'Без подкатегории',
        status: product.status
      },
      financial: {
        currentPrice: 0,
        originalPrice: 0,
        costPrice: product.costPrice || null,
        discount: 0,
        profitCalculation: null,
        commissions: {
          fbw: product.subcategory?.commissionFbw || 0,
          fbs: product.subcategory?.commissionFbs || 0,
          dbs: product.subcategory?.commissionDbs || 0,
          cc: product.subcategory?.commissionCc || 0,
          edbs: product.subcategory?.commissionEdbs || 0
        }
      },
      inventory: {
        total: 0,
        available: 0,
        inWarehouse: 0,
        inTransit: 0,
        reserved: 0
      },
      sales: {
        total: 0,
        last7Days: 0,
        last30Days: 0,
        averagePerDay: 0,
        trend: 'stable',
        chart: []
      },
      orders: {
        total: 0,
        last7Days: 0,
        last30Days: 0,
        conversionRate: 0
      },
      reviews: {
        averageRating: 0,
        totalCount: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      promotion: {
        searchQueries: [],
        categoryKeywords: [],
        visibility: {
          inSearch: false,
          inCategory: false,
          averagePosition: 0
        }
      },
      conversion: {
        viewToCart: 0,
        cartToOrder: 0,
        orderToSale: 0,
        overall: 0
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: 'wb_api',
        hasRealData: false
      }
    };

    // ========== 1. ПОЛУЧЕНИЕ ЦЕН ИЗ WB API ==========
    console.log('💰 Получение цен товара из WB API...');
    try {
      const priceResponse = await fetch(
        `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=0`,
        {
          method: 'GET',
          headers: {
            'Authorization': wbApiToken,
            'Accept': 'application/json'
          }
        }
      );

      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        
        if (priceData?.data?.listGoods) {
          const productPrice = priceData.data.listGoods.find(
            (item: any) => item.nmID === parseInt(product.wbNmId || '0')
          );

          if (productPrice?.sizes?.[0]) {
            const firstSize = productPrice.sizes[0];
            analytics.financial.originalPrice = firstSize.price || 0;
            analytics.financial.currentPrice = firstSize.discountedPrice || firstSize.price || 0;
            analytics.financial.discount = productPrice.discount || 0;
            analytics.metadata.hasRealData = true;
            
            console.log(`✅ Цены получены: ${analytics.financial.currentPrice}₽ (скидка ${analytics.financial.discount}%)`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка получения цен:', error);
    }

    // Если цены не получены из API, используем данные из БД
    if (analytics.financial.currentPrice === 0) {
      analytics.financial.currentPrice = product.price || 0;
      analytics.financial.originalPrice = product.price || 0;
      console.log('📦 Используем цены из БД');
    }

    // ========== 2-4. ПОЛУЧЕНИЕ ПОЛНОЙ СТАТИСТИКИ ИЗ WB STATISTICS API ==========
    console.log('📊 Получение полной статистики из WB Statistics API...');
    try {
      const statisticsService = new WbStatisticsService(wbApiToken);
      
      // Проверяем доступ к Statistics API
      const accessCheck = await statisticsService.checkAccess();
      if (!accessCheck.hasAccess) {
        console.warn(`⚠️ Нет доступа к Statistics API: ${accessCheck.error}`);
      } else if (product.wbNmId) {
        // Получаем полную статистику товара за 30 дней
        const productStats = await statisticsService.getProductStatistics(
          parseInt(product.wbNmId),
          30
        );

        // Заполняем данные об остатках
        analytics.inventory.total = productStats.stocks.total;
        analytics.inventory.available = productStats.stocks.available;
        analytics.inventory.inWarehouse = productStats.stocks.warehouses.size;
        analytics.inventory.inTransit = productStats.stocks.inWayToClient;
        analytics.inventory.reserved = productStats.stocks.inWayFromClient;

        // Заполняем данные о продажах
        analytics.sales.total = productStats.sales.total;
        analytics.sales.last7Days = productStats.sales.last7Days;
        analytics.sales.last30Days = productStats.sales.last30Days;
        analytics.sales.averagePerDay = productStats.sales.last30Days / 30;

        // Определяем тренд продаж
        const last14DaysSales = Array.from(productStats.sales.byDate.entries())
          .filter(([date]) => new Date(date).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000)
          .reduce((sum, [, data]) => sum + data.count, 0);
        
        const prev14DaysSales = Array.from(productStats.sales.byDate.entries())
          .filter(([date]) => {
            const dateTime = new Date(date).getTime();
            return dateTime > Date.now() - 28 * 24 * 60 * 60 * 1000 && 
                   dateTime <= Date.now() - 14 * 24 * 60 * 60 * 1000;
          })
          .reduce((sum, [, data]) => sum + data.count, 0);

        if (last14DaysSales > prev14DaysSales * 1.1) {
          analytics.sales.trend = 'up';
        } else if (last14DaysSales < prev14DaysSales * 0.9) {
          analytics.sales.trend = 'down';
        }

        // Формируем график продаж
        analytics.sales.chart = Array.from(productStats.sales.byDate.entries())
          .map(([date, data]) => ({
            date,
            sales: data.count,
            revenue: data.revenue
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30);

        // Заполняем данные о заказах
        analytics.orders.total = productStats.orders.total;
        analytics.orders.last7Days = productStats.orders.last7Days;
        analytics.orders.last30Days = productStats.orders.last30Days;
        analytics.orders.conversionRate = productStats.orders.total > 0 
          ? ((productStats.sales.total / productStats.orders.total) * 100) 
          : 0;

        analytics.metadata.hasRealData = true;
        console.log(`✅ Статистика получена: ${analytics.sales.total} продаж, ${analytics.orders.total} заказов, ${analytics.inventory.total} остатков`);
      }
    } catch (error) {
      console.warn('⚠️ Ошибка получения статистики:', error);
    }

    // ========== 5. ПОЛУЧЕНИЕ ДАННЫХ О ПРОДВИЖЕНИИ (ПОИСКОВЫЕ ЗАПРОСЫ) ==========
    if (product.subcategory?.wbSubjectId) {
      console.log('🔍 Получение данных о продвижении из WB Analytics API...');
      try {
        const analyticsService = new WbAnalyticsService(wbApiToken);
        const accessInfo = await analyticsService.checkAnalyticsAccess();

        if (accessInfo.hasAnalyticsAccess) {
          const categoryAnalytics = await analyticsService.getCategoryAnalytics(
            product.subcategory.wbSubjectId
          );

          // Извлекаем топ поисковых запросов
          analytics.promotion.searchQueries = categoryAnalytics.topQueries
            .slice(0, 20)
            .map((query, index) => ({
              query: query.query,
              position: query.position || index + 1,
              frequency: query.frequency,
              cluster: query.category || 'Общие'
            }));

          // Извлекаем ключевые слова из кластеров
          const keywords = new Map<string, { frequency: number; competition: number }>();
          categoryAnalytics.clusters.forEach(cluster => {
            // Добавляем главное ключевое слово
            const mainKeyword = cluster.mainKeyword;
            const existing = keywords.get(mainKeyword) || { frequency: 0, competition: 0 };
            existing.frequency += cluster.totalVolume;
            existing.competition = cluster.competitiveness === 'high' ? 80 : cluster.competitiveness === 'medium' ? 50 : 20;
            keywords.set(mainKeyword, existing);
            
            // Добавляем связанные ключевые слова
            cluster.relatedKeywords.forEach(relatedKw => {
              const relatedExisting = keywords.get(relatedKw) || { frequency: 0, competition: 0 };
              relatedExisting.frequency += Math.floor(cluster.totalVolume / cluster.relatedKeywords.length);
              relatedExisting.competition = existing.competition;
              keywords.set(relatedKw, relatedExisting);
            });
          });

          analytics.promotion.categoryKeywords = Array.from(keywords.entries())
            .map(([keyword, data]) => ({ keyword, ...data }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 30);

          analytics.promotion.visibility.inSearch = analytics.promotion.searchQueries.length > 0;
          analytics.promotion.visibility.inCategory = true;
          analytics.promotion.visibility.averagePosition = 
            analytics.promotion.searchQueries.reduce((sum, q) => sum + q.position, 0) / 
            (analytics.promotion.searchQueries.length || 1);

          analytics.metadata.hasRealData = true;
          console.log(`✅ Данные продвижения получены: ${analytics.promotion.searchQueries.length} запросов`);
        } else {
          console.warn('⚠️ Нет доступа к WB Analytics API');
        }
      } catch (error) {
        console.warn('⚠️ Ошибка получения данных продвижения:', error);
      }
    }

    // ========== 6. РАСЧЕТ ФИНАНСОВОЙ АНАЛИТИКИ ==========
    console.log('💵 Расчет финансовой аналитики...');
    if (analytics.financial.currentPrice > 0 && product.subcategory) {
      const saleData: WbSaleData = {
        nmId: parseInt(product.wbNmId || '0'),
        vendorCode: product.vendorCode || '',
        category: product.subcategory.name,
        subcategoryId: product.subcategory.wbSubjectId || 0,
        priceWithDiscount: analytics.financial.currentPrice,
        originalPrice: analytics.financial.originalPrice,
        deliveryType: 'FBW',
        length: (product.dimensions as any)?.length,
        width: (product.dimensions as any)?.width,
        height: (product.dimensions as any)?.height,
        weight: (product.dimensions as any)?.weight,
        isReturned: false,
        orderDate: new Date(),
        costPrice: analytics.financial.costPrice !== null ? analytics.financial.costPrice : undefined
      };

      const commissions: CategoryCommissions = {
        commissionFbw: product.subcategory.commissionFbw,
        commissionFbs: product.subcategory.commissionFbs,
        commissionDbs: product.subcategory.commissionDbs,
        commissionCc: product.subcategory.commissionCc,
        commissionEdbs: product.subcategory.commissionEdbs
      };

      const taxRate = (cabinet as any).taxRate || 6;

      analytics.financial.profitCalculation = WbFinancialCalculator.calculate(
        saleData,
        commissions,
        {
          taxRate,
          advertisingPercent: 3,
          otherExpenses: 0,
          storageDays: 30
        }
      );

      console.log(`✅ Финансовая аналитика рассчитана: прибыль ${analytics.financial.profitCalculation.netProfit}₽`);
    }

    // ========== 7. ИСПОЛЬЗОВАНИЕ РЕАЛЬНЫХ ДАННЫХ ИЗ БД (ProductAnalytics) ==========
    console.log('📊 Проверка реальных данных аналитики из БД...');
    if (product.analytics) {
      console.log(`✅ Найдены реальные данные аналитики (синхронизация: ${product.analytics.lastSyncAt.toISOString()})`);
      
      // Используем реальные данные конверсии из БД
      analytics.conversion.viewToCart = product.analytics.ctr || 0;
      analytics.conversion.cartToOrder = product.analytics.conversionRate || 0;
      analytics.conversion.orderToSale = product.analytics.orders > 0 ? 100 : 0;
      analytics.conversion.overall = product.analytics.ctr * product.analytics.conversionRate / 100;
      
      // Обновляем данные о продажах из БД
      if (product.analytics.orders > 0) {
        analytics.sales.last30Days = product.analytics.units;
        analytics.sales.total = product.analytics.units;
        analytics.sales.averagePerDay = product.analytics.units / 30;
      }
      
      // Обновляем данные о заказах
      analytics.orders.last30Days = product.analytics.orders;
      analytics.orders.total = product.analytics.orders;
      analytics.orders.conversionRate = product.analytics.conversionRate;
      
      // Добавляем реальные поисковые запросы из БД
      if (product.analytics.topSearchQueries && Array.isArray(product.analytics.topSearchQueries)) {
        const realQueries = (product.analytics.topSearchQueries as any[]).map((q: any, index: number) => ({
          query: q.query || '',
          position: q.avgPosition || index + 1,
          frequency: q.openCard || 0,
          cluster: 'Реальные запросы'
        }));
        
        // Заменяем или дополняем существующие запросы реальными данными
        analytics.promotion.searchQueries = realQueries.length > 0 
          ? realQueries 
          : analytics.promotion.searchQueries;
      }
      
      // Обновляем метаданные
      analytics.metadata.hasRealData = true;
      analytics.metadata.dataSource = product.analytics.dataSource;
      analytics.metadata.lastUpdated = product.analytics.lastSyncAt.toISOString();
      
      console.log(`✅ Реальные данные применены: ${product.analytics.orders} заказов, CTR ${product.analytics.ctr}%, конверсия ${product.analytics.conversionRate}%`);
    } else {
      console.log('⚠️ Реальные данные аналитики отсутствуют в БД');
      
      // Используем оценочные значения на основе статистики WB
      if (analytics.orders.total > 0 && analytics.sales.total > 0) {
        analytics.conversion.orderToSale = (analytics.sales.total / analytics.orders.total) * 100;
        analytics.conversion.cartToOrder = 65; // Средняя конверсия корзины в заказ
        analytics.conversion.viewToCart = 8; // Средняя конверсия просмотров в корзину
        analytics.conversion.overall = (analytics.conversion.viewToCart * analytics.conversion.cartToOrder * analytics.conversion.orderToSale) / 10000;
      }
    }

    console.log(`✅ Полная аналитика собрана. Реальные данные: ${analytics.metadata.hasRealData ? 'ДА' : 'НЕТ'}`);

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Ошибка получения полной аналитики:', error);
    return NextResponse.json({
      error: 'Ошибка получения аналитики',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
