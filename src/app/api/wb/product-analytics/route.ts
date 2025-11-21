// src/app/api/wb/product-analytics/route.ts - API для получения детальной аналитики товара
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { prisma } from '../../../../../lib/prisma';
import { WbConversionService } from '../../../../../lib/services/wbConversionService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Получение детальной аналитики по товару
 * Query параметры:
 * - nmId: ID товара на WB
 * - cabinetId: ID кабинета
 * - days: количество дней для анализа (по умолчанию 30)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nmId = searchParams.get('nmId');
    const cabinetId = searchParams.get('cabinetId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!nmId) {
      return NextResponse.json({ error: 'nmId обязателен' }, { status: 400 });
    }

    console.log(`📊 [Product Analytics] Загрузка аналитики для товара ${nmId}, период: ${days} дней`);

    // Получаем кабинет
    const cabinet = await prisma.cabinet.findFirst({
      where: {
        ...(cabinetId ? { id: cabinetId } : { isActive: true }),
        userId: user.id,
        apiToken: { not: null }
      }
    });

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или отсутствует API токен' }, { status: 404 });
    }

    // Рассчитываем период
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    console.log(`📅 Период: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

    // Создаем сервис конверсии
    const conversionService = new WbConversionService(cabinet.apiToken);

    // Проверяем доступ к Analytics API
    const accessCheck = await conversionService.checkAnalyticsAccess();
    console.log(`🔐 Доступ к Analytics API: ${accessCheck.hasAccess ? 'ДА ✅' : 'НЕТ ❌'}`);

    if (!accessCheck.hasAccess) {
      console.warn(`⚠️ Нет доступа к Analytics API: ${accessCheck.error}`);
      return NextResponse.json({
        success: true,
        data: {
          nmId: parseInt(nmId),
          views: 0,
          addToCart: 0,
          orders: 0,
          ctr: 0,
          addToCartRate: 0,
          purchaseRate: 0,
          searchQueries: [],
          hasAnalyticsAccess: false,
          message: `Нет доступа к Analytics API: ${accessCheck.error}`
        }
      });
    }

    // Получаем данные конверсии для товара
    console.log('🔄 Загрузка данных конверсии из WB Analytics API...');
    const conversionData = await conversionService.getDashboardConversion([parseInt(nmId)], startDate, endDate);

    // Получаем поисковые запросы для товара
    console.log('🔍 Загрузка поисковых запросов...');
    const searchQueriesData = await conversionService.getProductSearchQueries(parseInt(nmId), startDate, endDate);

    const responseData = {
      nmId: parseInt(nmId),
      views: conversionData.totalViews,
      addToCart: conversionData.totalAddToCart,
      orders: conversionData.totalOrders,
      ctr: Math.round(conversionData.avgCTR * 100) / 100,
      addToCartRate: Math.round(conversionData.addToCartRate * 100) / 100,
      purchaseRate: Math.round(conversionData.purchaseRate * 100) / 100,
      cartAbandonmentRate: Math.round(conversionData.cartAbandonmentRate * 100) / 100,
      searchQueries: searchQueriesData.topQueries || [],
      totalSearchQueries: searchQueriesData.totalQueries || 0,
      hasAnalyticsAccess: true,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: days
      }
    };

    console.log(`✅ [Product Analytics] Данные получены:`, {
      просмотры: responseData.views,
      вКорзину: responseData.addToCart,
      заказы: responseData.orders,
      CTR: `${responseData.ctr}%`,
      поисковыхЗапросов: responseData.totalSearchQueries
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ [Product Analytics] Ошибка получения аналитики:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения аналитики товара',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
