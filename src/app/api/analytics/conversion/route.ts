// src/app/api/analytics/conversion/route.ts - API для получения реальных данных конверсии из WB Analytics API

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { prismaAnalytics } from '../../../../../lib/prisma-analytics';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { WbConversionService } from '../../../../../lib/services/wbConversionService';

/**
 * GET - Получение данных о конверсии для дашборда
 * Query параметры:
 * - days: количество дней для анализа (по умолчанию 30)
 * - forceRefresh: принудительное обновление (игнорировать кеш)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Запрос данных конверсии');

    // Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Параметры запроса
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`📋 Параметры: days=${days}, forceRefresh=${forceRefresh}`);

    // Получаем активный кабинет
    const cabinets = await safePrismaOperation(
      () => prismaAnalytics.cabinet.findMany({
        where: { userId: user.id, isActive: true }
      }),
      'получение кабинетов'
    );

    if (cabinets.length === 0) {
      return NextResponse.json({
        error: 'У пользователя нет активных кабинетов'
      }, { status: 400 });
    }

    const cabinet = cabinets[0];
    if (!cabinet.apiToken) {
      return NextResponse.json({
        error: 'У кабинета отсутствует API токен'
      }, { status: 400 });
    }

    console.log(`✅ Работаем с кабинетом: ${cabinet.name || cabinet.id}`);

    // Проверяем кеш (если не forceRefresh)
    const cacheKey = `conversion_data_${cabinet.id}_${days}`;
    const CACHE_TTL = 60 * 60 * 1000; // 60 минут
    const CACHE_MAX_AGE = 60 * 60 * 1000; // 60 минут - максимальный возраст кеша

    // Если forceRefresh - очищаем кеш
    if (forceRefresh) {
      console.log('🔄 Принудительное обновление - очищаем кеш конверсии');
      await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.deleteMany({
          where: { cacheKey }
        }),
        'очистка кеша конверсии'
      );
    }

    if (!forceRefresh) {
      const cachedData = await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.findUnique({
          where: { cacheKey }
        }),
        'проверка кеша конверсии'
      );

      if (cachedData) {
        const cacheAge = Date.now() - cachedData.createdAt.getTime();
        const cacheAgeMinutes = Math.floor(cacheAge / 60000);
        
        // Если кеш не старше 60 минут - используем его
        if (cacheAge <= CACHE_MAX_AGE) {
          console.log(`✅ Данные конверсии взяты из кеша (возраст: ${cacheAgeMinutes} мин)`);
          
          return NextResponse.json({
            success: true,
            data: cachedData.data,
            fromCache: true,
            cacheAge: cacheAgeMinutes
          });
        } else {
          // Кеш устарел - нужна загрузка с API
          console.log(`⚠️ Кеш устарел (возраст: ${cacheAgeMinutes} мин > 60 мин), загружаем с API...`);
        }
      }
    }

    // Рассчитываем период
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    console.log(`📅 Период: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);

    // Получаем список товаров пользователя
    const products = await safePrismaOperation(
      () => prismaAnalytics.product.findMany({
        where: { 
          userId: user.id,
          wbNmId: { not: null }
        },
        select: {
          wbNmId: true
        }
      }),
      'получение товаров пользователя'
    );

    const nmIds = products
      .map(p => parseInt(p.wbNmId || '0'))
      .filter(id => id > 0);

    if (nmIds.length === 0) {
      console.warn('⚠️ У пользователя нет товаров с nmId');
      return NextResponse.json({
        success: true,
        data: {
          totalViews: 0,
          totalAddToCart: 0,
          totalOrders: 0,
          avgCTR: 0,
          addToCartRate: 0,
          purchaseRate: 0,
          cartAbandonmentRate: 0,
          hasAnalyticsAccess: false,
          message: 'У вас пока нет товаров для анализа'
        }
      });
    }

    console.log(`📦 Найдено ${nmIds.length} товаров для анализа конверсии`);

    // Создаем сервис конверсии
    const conversionService = new WbConversionService(cabinet.apiToken);

    // Проверяем доступ к Analytics API
    console.log('🔐 Проверяем доступ к Analytics API...');
    const accessCheck = await conversionService.checkAnalyticsAccess();
    console.log(`🔐 Доступ к Analytics API: ${accessCheck.hasAccess ? 'ДА ✅' : 'НЕТ ❌'}`, accessCheck.error || '');

    if (!accessCheck.hasAccess) {
      console.warn(`⚠️ Нет доступа к Analytics API: ${accessCheck.error}`);
      // Возвращаем данные с флагом hasAnalyticsAccess = false, но не ошибку
      return NextResponse.json({
        success: true,
        data: {
          totalViews: 0,
          totalAddToCart: 0,
          totalOrders: 0,
          avgCTR: 0,
          addToCartRate: 0,
          purchaseRate: 0,
          cartAbandonmentRate: 0,
          hasAnalyticsAccess: false,
          message: `Нет доступа к Analytics API: ${accessCheck.error}`
        }
      });
    }

    // Получаем реальные данные конверсии
    console.log('🔄 Загрузка данных конверсии из WB Analytics API...');
    const conversionData = await conversionService.getDashboardConversion(nmIds, startDate, endDate);

    console.log('✅ Данные конверсии получены:', {
      просмотры: conversionData.totalViews,
      вКорзину: conversionData.totalAddToCart,
      CTR: `${conversionData.avgCTR.toFixed(2)}%`,
      конверсияВКорзину: `${conversionData.addToCartRate.toFixed(2)}%`,
      конверсияВЗаказ: `${conversionData.purchaseRate.toFixed(2)}%`
    });

    // Формируем ответ
    const responseData = {
      totalViews: conversionData.totalViews,
      totalAddToCart: conversionData.totalAddToCart,
      totalOrders: conversionData.totalOrders,
      avgCTR: Math.round(conversionData.avgCTR * 100) / 100,
      addToCartRate: Math.round(conversionData.addToCartRate * 100) / 100,
      purchaseRate: Math.round(conversionData.purchaseRate * 100) / 100,
      cartAbandonmentRate: Math.round(conversionData.cartAbandonmentRate * 100) / 100,
      hasAnalyticsAccess: true,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };

    // Сохраняем в кеш
    try {
      const expiresAt = new Date(Date.now() + CACHE_TTL);
      
      await safePrismaOperation(
        () => prismaAnalytics.wbApiCache.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            data: responseData as any,
            expiresAt,
            createdAt: new Date()
          },
          update: {
            data: responseData as any,
            expiresAt,
            createdAt: new Date()
          }
        }),
        'сохранение конверсии в кеш'
      );
      
      console.log(`✅ Данные конверсии сохранены в кеш на 60 минут`);
    } catch (cacheError) {
      console.warn('⚠️ Не удалось сохранить конверсию в кеш:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Ошибка получения данных конверсии:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения данных конверсии',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
