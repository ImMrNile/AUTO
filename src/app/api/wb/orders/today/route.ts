// src/app/api/wb/orders/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';
import { prisma } from '../../../../../../lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Получение заказов за сегодня
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const nmId = searchParams.get('nmId');

    if (!cabinetId) {
      return NextResponse.json({ error: 'ID кабинета обязателен' }, { status: 400 });
    }

    // Получаем API токен кабинета
    const cabinet = await prisma.cabinet.findFirst({
      where: {
        id: cabinetId,
        userId: user.id
      }
    });

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или отсутствует API токен' }, { status: 404 });
    }

    console.log(`📋 [Today Orders] Загрузка заказов за сегодня для кабинета ${cabinetId}${nmId ? ` (товар ${nmId})` : ''}`);

    // Получаем сегодняшнюю дату в формате YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Используем WB API для получения заказов за сегодня
    const ordersData = await wbApiService.getOrders(cabinet.apiToken, {
      dateFrom: today,
      dateTo: today,
      limit: 1000 // Максимальное количество заказов
    });

    if (!ordersData || !Array.isArray(ordersData.orders)) {
      console.warn('❌ [Today Orders] Некорректные данные от WB API');
      return NextResponse.json({ 
        success: true, 
        data: { 
          orders: [],
          summary: { totalOrders: 0, totalSum: 0 },
          byProduct: {}
        }
      });
    }

    // Фильтруем заказы по nmId если указан
    let filteredOrders = ordersData.orders;
    if (nmId) {
      filteredOrders = ordersData.orders.filter((order: any) => 
        order.nmId === parseInt(nmId) || order.nm_id === parseInt(nmId)
      );
    }

    // Группируем заказы по товарам
    const ordersByProduct = new Map();
    let totalOrders = 0;
    let totalSum = 0;

    filteredOrders.forEach((order: any) => {
      const productNmId = order.nmId || order.nm_id;
      const orderPrice = order.totalPriceV2 || order.total_price || 0;
      const orderQuantity = order.quantity || 1;

      if (!ordersByProduct.has(productNmId)) {
        ordersByProduct.set(productNmId, {
          nmId: productNmId,
          ordersCount: 0,
          totalQuantity: 0,
          totalSum: 0,
          orders: []
        });
      }

      const productOrders = ordersByProduct.get(productNmId);
      productOrders.ordersCount += 1;
      productOrders.totalQuantity += orderQuantity;
      productOrders.totalSum += orderPrice;
      productOrders.orders.push({
        orderId: order.id || order.orderId,
        date: order.date || order.createdAt,
        price: orderPrice,
        quantity: orderQuantity,
        status: order.orderState || order.status
      });

      totalOrders += 1;
      totalSum += orderPrice;
    });

    // Сохраняем данные о заказах в БД для аналитики
    try {
      for (const [nmId, data] of ordersByProduct.entries()) {
        await prisma.product.updateMany({
          where: {
            wbNmId: nmId.toString(),
            userId: user.id
          },
          data: {}
        });
      }
      console.log(`💾 [Today Orders] Сохранены данные о заказах для ${ordersByProduct.size} товаров`);
    } catch (dbError) {
      console.warn('⚠️ [Today Orders] Ошибка сохранения в БД:', dbError);
    }

    const result = {
      success: true,
      data: {
        date: today,
        orders: Array.from(ordersByProduct.values()),
        summary: {
          totalOrders: totalOrders,
          totalSum: totalSum,
          totalProducts: ordersByProduct.size
        },
        byProduct: Object.fromEntries(ordersByProduct)
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [Today Orders] Загружено заказов: ${result.data.summary.totalOrders} заказов, ${result.data.summary.totalProducts} товаров`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [Today Orders] Ошибка получения заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
