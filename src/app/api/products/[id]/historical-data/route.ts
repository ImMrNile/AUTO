// API для получения ВСЕХ исторических данных товара за максимальный период
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📊 [Historical Data] Запрос всех данных для товара: ${params.id}`);
    
    // Получаем параметры из query
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const totalDays = daysParam ? parseInt(daysParam) : 60; // По умолчанию 2 месяца
    
    console.log(`📅 [Historical Data] Запрошен период: ${totalDays} дней`);
    
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        userId: user.id
      },
      include: {
        productCabinets: {
          include: {
            cabinet: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    const cabinet = product.productCabinets?.[0]?.cabinet;
    if (!cabinet?.apiToken) {
      return NextResponse.json({ error: 'Токен WB API не найден' }, { status: 400 });
    }

    if (!product.wbNmId) {
      return NextResponse.json({ error: 'Товар не опубликован на WB' }, { status: 400 });
    }

    const apiToken = cabinet.apiToken;
    const nmId = parseInt(product.wbNmId);

    console.log(`🚀 [Historical Data] Получение данных за ${totalDays} дней для nmID: ${nmId}`);

    // Разбиваем большой период на недельные окна
    const weeklyWindows = splitIntoWeeklyWindows(totalDays);
    console.log(`📦 [Historical Data] Разбито на ${weeklyWindows.length} недельных окон`);

    // Собираем данные последовательно (чтобы не перегрузить WB API)
    const allData: any[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < weeklyWindows.length; i++) {
      const window = weeklyWindows[i];
      console.log(`🔄 [Historical Data] Окно ${i + 1}/${weeklyWindows.length}: ${window.startDate} - ${window.endDate}`);
      
      try {
        const data = await fetchWindowData(apiToken, nmId, window.startDate, window.endDate);
        allData.push(data);
        console.log(`✅ [Historical Data] Окно ${i + 1} получено`);
        
        // Задержка между запросами (2 секунды)
        if (i < weeklyWindows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.log(`❌ [Historical Data] Ошибка в окне ${i + 1}: ${error.message}`);
        errors.push(`Окно ${i + 1} (${window.startDate} - ${window.endDate}): ${error.message}`);
      }
    }

    // Агрегируем все данные
    const aggregated = aggregateHistoricalData(allData);
    
    console.log(`✅ [Historical Data] Собрано ${allData.length}/${weeklyWindows.length} окон`);

    return NextResponse.json({
      success: true,
      productId: product.id,
      nmId: product.wbNmId,
      totalDays: totalDays,
      windowsCollected: allData.length,
      windowsTotal: weeklyWindows.length,
      aggregated: aggregated,
      rawData: allData,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('❌ [Historical Data] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Ошибка получения исторических данных' },
      { status: 500 }
    );
  }
}

// Разбивает большой период на недельные окна
function splitIntoWeeklyWindows(totalDays: number): Array<{ startDate: string; endDate: string }> {
  const windows = [];
  const today = new Date();
  const windowSize = 7; // 7 дней на окно
  
  let currentEnd = new Date(today);
  let daysProcessed = 0;
  
  while (daysProcessed < totalDays) {
    const currentStart = new Date(currentEnd);
    const remainingDays = totalDays - daysProcessed;
    const daysInWindow = Math.min(windowSize, remainingDays);
    
    currentStart.setDate(currentStart.getDate() - daysInWindow);
    
    windows.push({
      startDate: currentStart.toISOString().split('T')[0],
      endDate: currentEnd.toISOString().split('T')[0]
    });
    
    daysProcessed += daysInWindow;
    currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() - 1); // Следующее окно начинается на день раньше
  }
  
  return windows.reverse(); // От старых к новым
}

// Получает данные за конкретное окно
async function fetchWindowData(apiToken: string, nmId: number, startDate: string, endDate: string) {
  // Получаем данные конверсии (самые полные данные)
  const conversionResponse = await fetch(
    'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
    {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selectedPeriod: {
          start: startDate,
          end: endDate
        },
        pastPeriod: {
          start: startDate,
          end: endDate
        },
        nmIds: [nmId],
        orderBy: {
          field: 'openCard',
          mode: 'desc'
        }
      })
    }
  );

  if (!conversionResponse.ok) {
    const errorText = await conversionResponse.text();
    throw new Error(`WB API error: ${conversionResponse.status}`);
  }

  const data = await conversionResponse.json();
  
  return {
    startDate,
    endDate,
    data: data
  };
}

// Агрегирует данные из всех окон
function aggregateHistoricalData(windows: any[]) {
  if (windows.length === 0) {
    return null;
  }
  
  let totalViews = 0;
  let totalCart = 0;
  let totalOrders = 0;
  let totalOrderSum = 0;
  let totalBuyouts = 0;
  let totalBuyoutSum = 0;
  let totalCancels = 0;
  let totalCancelSum = 0;
  let totalWishlist = 0;
  
  windows.forEach(window => {
    const products = window.data?.data?.products || [];
    products.forEach((product: any) => {
      const stats = product.statistic?.selected;
      if (stats) {
        totalViews += stats.openCount || 0;
        totalCart += stats.cartCount || 0;
        totalOrders += stats.orderCount || 0;
        totalOrderSum += stats.orderSum || 0;
        totalBuyouts += stats.buyoutCount || 0;
        totalBuyoutSum += stats.buyoutSum || 0;
        totalCancels += stats.cancelCount || 0;
        totalCancelSum += stats.cancelSum || 0;
        totalWishlist += stats.addToWishlist || 0;
      }
    });
  });
  
  const addToCartPercent = totalViews > 0 ? ((totalCart / totalViews) * 100).toFixed(2) : '0.00';
  const cartToOrderPercent = totalCart > 0 ? ((totalOrders / totalCart) * 100).toFixed(2) : '0.00';
  const buyoutPercent = totalOrders > 0 ? ((totalBuyouts / totalOrders) * 100).toFixed(2) : '0.00';
  const avgPrice = totalOrders > 0 ? Math.round(totalOrderSum / totalOrders) : 0;
  
  return {
    totalViews,
    totalCart,
    totalOrders,
    totalOrderSum,
    totalBuyouts,
    totalBuyoutSum,
    totalCancels,
    totalCancelSum,
    totalWishlist,
    avgPrice,
    conversions: {
      addToCartPercent: parseFloat(addToCartPercent),
      cartToOrderPercent: parseFloat(cartToOrderPercent),
      buyoutPercent: parseFloat(buyoutPercent)
    }
  };
}
