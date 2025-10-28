// src/app/api/products/[id]/update-cost/route.ts - Обновление себестоимости товара

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';

/**
 * PATCH - Обновление себестоимости товара
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

    const { costPrice } = await request.json();
    const productId = params.id;

    console.log(`📝 Обновление себестоимости товара ${productId}: ${costPrice}₽`);

    if (costPrice === undefined || costPrice === null || costPrice < 0) {
      return NextResponse.json({
        success: false,
        error: 'Некорректная себестоимость (должна быть >= 0)'
      }, { status: 400 });
    }

    // Сначала находим товар
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { wbNmId: productId },
          { id: productId }
        ],
        userId: user.id
      }
    });

    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден или у вас нет прав для его редактирования'
      }, { status: 404 });
    }

    console.log(`📝 Обновляем товар: ID=${existingProduct.id}, wbNmId=${existingProduct.wbNmId}, старая себестоимость=${existingProduct.costPrice}₽`);
    
    // Обновляем ТОЛЬКО себестоимость конкретного товара
    const product = await prisma.product.update({
      where: {
        id: existingProduct.id
      },
      data: {
        costPrice: costPrice
      }
    });

    console.log(`✅ Себестоимость обновлена: ${product.costPrice}₽ (ID=${product.id}, wbNmId=${product.wbNmId})`);

    return NextResponse.json({
      success: true,
      message: 'Себестоимость обновлена',
      costPrice: product.costPrice,
      productId: product.id
    });

  } catch (error) {
    console.error('❌ Ошибка обновления себестоимости:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
