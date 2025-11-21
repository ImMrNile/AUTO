// src/app/api/analytics/today-orders/route.ts - API для получения заказов за сегодня

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Получение данных о продажах с WB API
 */
async function getWBSales(apiToken: string, startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const dateFrom = startDate.toISOString().split('T')[0];
    const url = `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WB API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Фильтруем по дате
    const filtered = data.filter((sale: any) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate < endDate;
    });
    
    return filtered;
  } catch (error) {
    console.error('Ошибка получения продаж с WB:', error);
    return [];
  }
}

/**
 * GET /api/analytics/today-orders - Получение заказов за сегодня по товарам
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Today Orders] Запрос заказов за сегодня');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    // Получаем активный кабинет
    const cabinets = await safePrismaOperation(
      () => prisma.cabinet.findMany({
        where: {
          userId: user.id,
          isActive: true,
          apiToken: { not: null }
        }
      }),
      'получение активного кабинета'
    );

    if (!cabinets || cabinets.length === 0) {
      return NextResponse.json({
        error: 'Не найден активный кабинет с API токеном'
      }, { status: 400 });
    }

    const cabinet = cabinets[0];

    if (!cabinet.apiToken) {
      return NextResponse.json({
        error: 'API токен не найден'
      }, { status: 400 });
    }

    // Получаем дату начала и конца сегодняшнего дня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFrom = today.toISOString().split('T')[0];

    console.log(`📅 [Today Orders] Период: ${today.toISOString()} - ${tomorrow.toISOString()}`);

    // Получаем продажи за сегодня через WB API
    const sales = await getWBSales(
      cabinet.apiToken,
      today,
      tomorrow
    );

    if (!sales || sales.length === 0) {
      console.log('⚠️ [Today Orders] Нет продаж за сегодня');
      return NextResponse.json({
        success: true,
        orders: [],
        date: today.toISOString().split('T')[0],
        totalOrders: 0
      });
    }

    // Группируем заказы по nmId
    const ordersByProduct = new Map<number, number>();

    sales.forEach((sale: any) => {
      // Считаем только реальные продажи (не возвраты и не отмены)
      const docType = sale.saleID || sale.docTypeName || '';
      const isRealSale = (
        (typeof docType === 'string' && (docType.includes('Продажа') || docType.includes('Выкуп'))) ||
        (typeof docType === 'number' && docType !== 0)
      ) && !sale.isReturn && !sale.isCancel;

      if (isRealSale && sale.nmId) {
        const currentCount = ordersByProduct.get(sale.nmId) || 0;
        ordersByProduct.set(sale.nmId, currentCount + 1);
      }
    });

    // Преобразуем в массив
    const orders = Array.from(ordersByProduct.entries()).map(([nmId, count]) => ({
      nmId,
      count
    }));

    console.log(`✅ [Today Orders] Найдено заказов: ${orders.length} товаров, ${orders.reduce((sum, o) => sum + o.count, 0)} заказов`);

    return NextResponse.json({
      success: true,
      orders,
      date: dateFrom,
      totalOrders: orders.reduce((sum, o) => sum + o.count, 0)
    });

  } catch (error) {
    console.error('❌ [Today Orders] Ошибка получения заказов за сегодня:', error);
    return NextResponse.json({
      error: 'Ошибка получения заказов за сегодня',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
