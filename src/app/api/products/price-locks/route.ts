// src/app/api/products/price-locks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';

// GET - Получить статусы закрепления цен для всех товаров пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nmIds = searchParams.get('nmIds')?.split(',').filter(Boolean) || [];

    if (nmIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: {} 
      });
    }

    // Получаем все товары с указанными nmId
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        wbNmId: {
          in: nmIds
        }
      },
      select: {
        id: true,
        wbNmId: true,
        priceLocked: true,
        lockedPrice: true
      }
    });

    // Формируем объект с результатами, где ключ - nmId
    const result: Record<string, { locked: boolean; price: number | null }> = {};
    products.forEach((product: { wbNmId: string | null; priceLocked: boolean | null; lockedPrice: number | null }) => {
      if (product.wbNmId) {
        result[product.wbNmId] = {
          locked: product.priceLocked || false,
          price: product.lockedPrice || null
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [Price Locks] Ошибка получения статусов:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Установить/снять закрепление цены по nmId
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { nmId, locked, price } = body;

    if (!nmId) {
      return NextResponse.json({ error: 'Параметр nmId обязателен' }, { status: 400 });
    }

    if (typeof locked !== 'boolean') {
      return NextResponse.json({ error: 'Параметр locked обязателен' }, { status: 400 });
    }

    if (locked && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Укажите корректную цену для закрепления' }, { status: 400 });
    }

    // Находим товар по nmId
    const product = await prisma.product.findFirst({
      where: {
        userId: user.id,
        wbNmId: nmId.toString()
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Обновляем статус закрепления
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        priceLocked: locked,
        lockedPrice: locked ? price : null
      }
    });

    console.log(`🔒 [Price Lock] Товар ${product.name} (nmId: ${nmId}): закрепление ${locked ? 'включено' : 'выключено'}${locked ? ` на ${price}₽` : ''}`);

    return NextResponse.json({
      success: true,
      message: locked ? `Цена закреплена на ${price}₽` : 'Закрепление цены отключено',
      data: {
        nmId: nmId,
        priceLocked: updatedProduct.priceLocked,
        lockedPrice: updatedProduct.lockedPrice
      }
    });
  } catch (error) {
    console.error('❌ [Price Lock] Ошибка установки закрепления:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
