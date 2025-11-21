// src/app/api/analytics/product-detailed/route.ts - Подробная аналитика товара

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nmId = searchParams.get('nmId');
    
    if (!nmId) {
      return NextResponse.json({ error: 'Не указан nmId товара' }, { status: 400 });
    }

    // Получаем товар из БД
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { wbNmId: nmId },
          { id: nmId }
        ],
        userId: user.id
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Генерируем mock данные для демонстрации
    // TODO: Заменить на реальные данные из WB API
    const salesByDay = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString(),
        orders: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 50000) + 10000
      };
    });

    const totalRevenue = salesByDay.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = salesByDay.reduce((sum, day) => sum + day.orders, 0);

    const data = {
      product: {
        nmId: parseInt(nmId),
        name: product.name || product.generatedName || `Товар ${nmId}`,
        vendorCode: product.vendorCode,
        image: product.originalImage || undefined
      },
      metrics: {
        revenue: totalRevenue,
        revenueChange: 15.2,
        profit: Math.floor(totalRevenue * 0.35),
        profitChange: 12.1,
        orders: Math.floor(totalOrders / 30),
        inStock: 210,
        inTransit: 50
      },
      salesByDay,
      expenses: {
        commission: Math.floor(totalRevenue * 0.15),
        logistics: Math.floor(totalRevenue * 0.08),
        storage: Math.floor(totalRevenue * 0.01),
        total: Math.floor(totalRevenue * 0.24)
      },
      conversion: {
        views: 125430,
        ctr: 8.2,
        addToCart: 1832,
        addToCartRate: 1.5,
        purchases: totalOrders,
        purchaseRate: 19.1
      },
      inventory: {
        total: 260,
        inStock: 210,
        inTransit: 50
      },
      searchQueries: [
        { query: product.name?.split(' ').slice(0, 3).join(' ') || 'товар', orders: 120 },
        { query: 'умные часы для спорта', orders: 85 },
        { query: 'часы с пульсометром', orders: 62 },
        { query: 'подарок на день рождения', orders: 45 }
      ]
    };

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ Ошибка получения подробной аналитики:', error);
    return NextResponse.json({
      error: 'Ошибка получения данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
