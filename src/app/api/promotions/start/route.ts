import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, duration = 7, checkInterval = 4 } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 });
    }

    // Проверить что товар существует и принадлежит пользователю
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      },
      include: {
        analytics: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Проверить нет ли уже активного продвижения
    const existingPromotion = await prisma.productPromotion.findFirst({
      where: {
        productId,
        status: 'ACTIVE'
      }
    });

    if (existingPromotion) {
      return NextResponse.json(
        { error: 'У товара уже есть активное продвижение' },
        { status: 400 }
      );
    }

    // Получить начальные метрики
    const initialSales = 0; // TODO: получить из аналитики за последние 24 часа
    const initialConversion = product.analytics?.conversionRate || 0;
    const initialCTR = product.analytics?.ctr || 0;
    const initialROAS = 0; // TODO: получить из рекламы

    // Создать продвижение
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    const promotion = await prisma.productPromotion.create({
      data: {
        productId,
        userId: user.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        checkInterval,
        initialSales,
        initialConversion,
        initialCTR,
        initialROAS,
        currentSales: initialSales,
        currentConversion: initialConversion,
        currentCTR: initialCTR,
        currentROAS: initialROAS
      }
    });

    console.log(`✅ Запущено AI продвижение для товара ${product.name} (${duration} дней)`);

    return NextResponse.json({
      success: true,
      promotion
    });

  } catch (error: any) {
    console.error('❌ Ошибка запуска продвижения:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка запуска' },
      { status: 500 }
    );
  }
}
