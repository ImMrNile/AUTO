import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/products/by-nmId/[nmId]
 * Получить товар по nmID Wildberries
 */
export async function GET(request: NextRequest, { params }: { params: { nmId: string } }) {
  try {
    // Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const nmId = parseInt(params.nmId);
    if (isNaN(nmId)) {
      return NextResponse.json({ error: 'Неверный nmID' }, { status: 400 });
    }

    // Ищем товар по nmID
    const product = await prisma.product.findFirst({
      where: {
        wbNmId: nmId.toString(),
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        wbNmId: true,
        status: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json({
      product
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения товара по nmID:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка получения товара' },
      { status: 500 }
    );
  }
}
