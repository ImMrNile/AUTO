// src/app/api/wb/analytics/route.ts - API для работы с WB Analytics

import { NextRequest, NextResponse } from 'next/server';
import { WbAnalyticsService, CategoryKeywords } from '../../../../../lib/services/wbAnalyticsService';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { UserWbTokenService } from '../../../../../lib/services/userWbTokenService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Запрос аналитики WB');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const cabinetId = searchParams.get('cabinetId');

    if (!categoryId) {
      return NextResponse.json({
        error: 'Не указан categoryId'
      }, { status: 400 });
    }

    // Получаем WB токен пользователя из базы данных
    console.log('🔑 Получение WB токена пользователя...');
    let wbApiToken: string | null = null;
    let cabinetInfo: any = null;

    if (cabinetId) {
      // Получаем токен для конкретного кабинета
      wbApiToken = await UserWbTokenService.getTokenByCabinetId(cabinetId, user.id);
      if (wbApiToken) {
        const tokenInfo = await UserWbTokenService.getCurrentUserWbToken(cabinetId);
        cabinetInfo = tokenInfo;
      }
    } else {
      // Получаем токен первого доступного кабинета
      const tokenInfo = await UserWbTokenService.getCurrentUserWbToken();
      wbApiToken = tokenInfo?.token || null;
      cabinetInfo = tokenInfo;
    }

    if (!wbApiToken) {
      return NextResponse.json({
        error: 'WB API токен не найден',
        details: {
          message: 'У пользователя нет активных кабинетов с WB токенами',
          suggestion: 'Добавьте кабинет с WB API токеном в настройках профиля'
        }
      }, { status: 400 });
    }

    console.log(`✅ Найден токен для кабинета "${cabinetInfo?.cabinetName}" (${cabinetInfo?.cabinetId})`);

    // Создаем сервис аналитики
    const analyticsService = new WbAnalyticsService(wbApiToken);

    // Проверяем доступ к Analytics API
    console.log('🔐 Проверка доступа к WB Analytics API...');
    const accessInfo = await analyticsService.checkAnalyticsAccess();
    
    if (!accessInfo.hasAnalyticsAccess) {
      return NextResponse.json({
        error: 'Нет доступа к WB Analytics API',
        details: {
          isExpired: accessInfo.isExpired,
          sellerId: accessInfo.sellerId,
          suggestion: 'Проверьте, что токен имеет права доступа к Analytics (бит 2) и не истек'
        }
      }, { status: 403 });
    }

    console.log(`✅ Доступ к Analytics API подтвержден для продавца ${accessInfo.sellerId}`);

    // Получаем аналитику категории
    console.log(`📊 Получение аналитики для категории ${categoryId}...`);
    const categoryAnalytics: CategoryKeywords = await analyticsService.getCategoryAnalytics(
      parseInt(categoryId)
    );

    console.log(`✅ Получена аналитика: ${categoryAnalytics.clusters.length} кластеров, ${categoryAnalytics.topQueries.length} запросов`);

    return NextResponse.json({
      success: true,
      data: {
        categoryId: parseInt(categoryId),
        categoryName: categoryAnalytics.categoryName,
        analytics: {
          totalClusters: categoryAnalytics.clusters.length,
          totalQueries: categoryAnalytics.topQueries.length,
          clusters: categoryAnalytics.clusters,
          topQueries: categoryAnalytics.topQueries
        },
        metadata: {
          accessInfo,
          timestamp: new Date().toISOString(),
          dataSource: 'wb_analytics_api'
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения аналитики WB:', error);
    
    return NextResponse.json({
      error: 'Ошибка получения аналитики',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Тестирование WB Analytics API');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { testCategories, cabinetId } = body;

    // Получаем WB токен пользователя из базы данных
    console.log('🔑 Получение WB токена пользователя для тестирования...');
    let wbApiToken: string | null = null;
    let cabinetInfo: any = null;

    if (cabinetId) {
      wbApiToken = await UserWbTokenService.getTokenByCabinetId(cabinetId, user.id);
      if (wbApiToken) {
        const tokenInfo = await UserWbTokenService.getCurrentUserWbToken(cabinetId);
        cabinetInfo = tokenInfo;
      }
    } else {
      const tokenInfo = await UserWbTokenService.getCurrentUserWbToken();
      wbApiToken = tokenInfo?.token || null;
      cabinetInfo = tokenInfo;
    }

    if (!wbApiToken) {
      return NextResponse.json({
        error: 'WB API токен не найден',
        details: {
          message: 'У пользователя нет активных кабинетов с WB токенами',
          suggestion: 'Добавьте кабинет с WB API токеном в настройках профиля'
        }
      }, { status: 400 });
    }

    console.log(`✅ Тестирование с токеном кабинета "${cabinetInfo?.cabinetName}"`);

    const categoriesToTest = testCategories || [14727, 963, 2674, 1236]; // Базовые категории для теста

    // Создаем сервис аналитики
    const analyticsService = new WbAnalyticsService(wbApiToken);

    // Проверяем доступ
    const accessInfo = await analyticsService.checkAnalyticsAccess();
    
    const results = {
      accessCheck: accessInfo,
      categoryTests: [] as any[]
    };

    // Тестируем каждую категорию
    for (const categoryId of categoriesToTest) {
      try {
        console.log(`🔍 Тестируем категорию ${categoryId}...`);
        
        const categoryAnalytics = await analyticsService.getCategoryAnalytics(categoryId);
        
        results.categoryTests.push({
          categoryId,
          success: true,
          data: {
            clustersCount: categoryAnalytics.clusters.length,
            queriesCount: categoryAnalytics.topQueries.length,
            sampleClusters: categoryAnalytics.clusters.slice(0, 3),
            sampleQueries: categoryAnalytics.topQueries.slice(0, 5)
          }
        });
        
        console.log(`✅ Категория ${categoryId}: ${categoryAnalytics.clusters.length} кластеров`);
        
      } catch (error) {
        console.warn(`⚠️ Ошибка для категории ${categoryId}:`, error);
        
        results.categoryTests.push({
          categoryId,
          success: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Тестирование WB Analytics завершено',
      results,
      summary: {
        totalCategories: categoriesToTest.length,
        successfulCategories: results.categoryTests.filter(t => t.success).length,
        hasAnalyticsAccess: accessInfo.hasAnalyticsAccess,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Ошибка тестирования WB Analytics:', error);
    
    return NextResponse.json({
      error: 'Ошибка тестирования аналитики',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
