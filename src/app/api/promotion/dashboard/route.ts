// src/app/api/promotion/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/lib/auth/auth-service';
import { wbPromotionService } from '@/lib/services/wbPromotionService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Promotion Dashboard API] Запрос данных продвижения');

    // Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    console.log('✅ [Promotion Dashboard API] Пользователь:', user.email);

    // Получаем параметры
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const cabinetId = searchParams.get('cabinetId');

    console.log(`📊 Параметры: days=${days}, cabinetId=${cabinetId || 'все'}`);

    // Получаем кабинет пользователя
    let cabinet;
    if (cabinetId) {
      cabinet = await prisma.cabinet.findFirst({
        where: {
          id: cabinetId,
          userId: user.id
        }
      });
    } else {
      cabinet = await prisma.cabinet.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    if (!cabinet) {
      return NextResponse.json(
        { error: 'Кабинет не найден' },
        { status: 404 }
      );
    }

    console.log(`✅ Найден кабинет: ${cabinet.name}`);

    // Проверяем наличие API токена
    if (!cabinet.apiToken) {
      return NextResponse.json(
        { error: 'API токен не настроен для этого кабинета' },
        { status: 400 }
      );
    }

    // Получаем данные из WB Promotion API с обработкой ошибок
    let stats;
    try {
      stats = await wbPromotionService.getDashboardStats(
        cabinet.apiToken,
        days
      );
    } catch (error: any) {
      console.error('❌ Ошибка получения статистики продвижения:', error.message);
      
      // Если нет доступа к Promotion API, возвращаем пустые данные
      if (error.message.includes('403') || error.message.includes('401')) {
        return NextResponse.json({
          success: false,
          error: 'Нет доступа к Promotion API. Проверьте права токена WB.',
          needsPromoAccess: true
        }, { status: 403 });
      }
      
      throw error;
    }

    // Получаем товары пользователя для раздела "Ваши товары в поиске"
    console.log('📦 Получение товаров пользователя...');
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        status: 'PUBLISHED' // Только опубликованные товары
      },
      select: {
        id: true,
        name: true,
        generatedName: true,
        wbNmId: true,
        originalImage: true,
        price: true,
        discountPrice: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Берем топ 20 товаров
    });

    console.log(`✅ Найдено товаров: ${products.length}`);

    // Получаем календарь акций
    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    dateTo.setDate(dateTo.getDate() + 60); // +60 дней вперед

    const dateToStr = dateTo.toISOString().split('T')[0] + 'T23:59:59Z';
    const dateFromStr = dateFrom.toISOString().split('T')[0] + 'T00:00:00Z';

    let promotions: any[] = [];
    try {
      promotions = await wbPromotionService.getPromotionsCalendar(
        cabinet.apiToken,
        dateFromStr,
        dateToStr,
        false // Только доступные для участия
      );
    } catch (error) {
      console.warn('⚠️ Не удалось получить календарь акций');
    }

    // Формируем данные о товарах с моковыми метриками (позже заменить на реальные из WB Analytics)
    const productsWithMetrics = products.map((product, index) => ({
      id: product.id,
      nmId: product.wbNmId,
      name: product.generatedName || product.name,
      image: product.originalImage || '/placeholder.jpg',
      price: product.price,
      discountPrice: product.discountPrice,
      // Моковые данные - заменить на реальные из WB Analytics API
      query: `запрос ${index + 1}`,
      position: Math.floor(Math.random() * 50) + 1,
      views: Math.floor(Math.random() * 3000) + 500,
      addToCart: Math.floor(Math.random() * 200) + 50,
      orders: Math.floor(Math.random() * 80) + 10,
      ctr: (Math.random() * 5 + 3).toFixed(2),
      conversion: (Math.random() * 15 + 15).toFixed(2)
    }));

    // Формируем ответ
    const response = {
      success: true,
      data: {
        overview: {
          totalCampaigns: stats.totalCampaigns,
          activeCampaigns: stats.activeCampaigns,
          balance: stats.balance,
          totalSpent: stats.totalSpent,
          totalViews: stats.totalViews,
          totalClicks: stats.totalClicks,
          totalOrders: stats.totalOrders,
          avgCTR: stats.avgCTR,
          avgCPC: stats.avgCPC,
          avgCR: stats.avgCR,
          roi: stats.totalSpent > 0 
            ? ((stats.totalOrders * 1000 - stats.totalSpent) / stats.totalSpent * 100) 
            : 0
        },
        topCampaigns: stats.topCampaigns,
        topKeywords: stats.topKeywords,
        allCampaigns: stats.allCampaigns, // ВСЕ кампании (активные + неактивные)
        products: productsWithMetrics, // Товары с метриками
        upcomingPromotions: promotions.slice(0, 5),
        period: {
          days,
          from: dateFromStr,
          to: dateToStr
        }
      }
    };

    console.log(`✅ [Promotion Dashboard API] Данные успешно получены`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [Promotion Dashboard API] Ошибка:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка получения данных продвижения',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
