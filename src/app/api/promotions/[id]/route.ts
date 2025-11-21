import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!['ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    // Проверить что продвижение принадлежит пользователю
    const existingPromotion = await prisma.productPromotion.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!existingPromotion) {
      return NextResponse.json({ error: 'Продвижение не найдено' }, { status: 404 });
    }

    // Обновить статус
    const promotion = await prisma.productPromotion.update({
      where: { id: params.id },
      data: { status }
    });

    console.log(`✅ Статус продвижения ${params.id} изменен на ${status}`);

    return NextResponse.json({
      success: true,
      promotion
    });

  } catch (error: any) {
    console.error('❌ Ошибка обновления продвижения:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка обновления' },
      { status: 500 }
    );
  }
}
