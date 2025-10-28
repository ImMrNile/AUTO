// src/app/api/cabinets/[id]/update-tax/route.ts - Обновление налоговой ставки кабинета

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';

/**
 * PATCH - Обновление налоговой ставки кабинета
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    const { taxRate } = await request.json();
    const cabinetId = params.id;

    console.log(`📝 Обновление налоговой ставки кабинета ${cabinetId}: ${taxRate}%`);

    if (taxRate === undefined || taxRate === null || taxRate < 0 || taxRate > 100) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная налоговая ставка (должна быть от 0 до 100)'
      }, { status: 400 });
    }

    // Проверяем, что кабинет принадлежит пользователю
    const existingCabinet = await prisma.cabinet.findFirst({
      where: {
        id: cabinetId,
        userId: user.id
      }
    });

    if (!existingCabinet) {
      return NextResponse.json({
        success: false,
        error: 'Кабинет не найден или у вас нет прав для его редактирования'
      }, { status: 404 });
    }

    // Обновляем налоговую ставку кабинета
    const cabinet = await prisma.cabinet.update({
      where: {
        id: cabinetId
      },
      data: {
        taxRate: taxRate
      }
    });

    console.log(`✅ Налоговая ставка обновлена: ${cabinet.taxRate}%`);

    return NextResponse.json({
      success: true,
      message: 'Налоговая ставка обновлена',
      taxRate: cabinet.taxRate
    });

  } catch (error) {
    console.error('❌ Ошибка обновления налоговой ставки:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
