import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/products/update-cost-price
 * Обновление себестоимости товара
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { nmID, costPrice } = await request.json();

    if (!nmID || costPrice === undefined) {
      return NextResponse.json({ 
        error: 'Не указаны обязательные параметры' 
      }, { status: 400 });
    }

    console.log(`💰 Обновление себестоимости товара ${nmID}: ${costPrice}₽`);

    // Находим товар по nmID и userId
    const uniqueId = `wb_${nmID}_${user.id}`;

    const product = await safePrismaOperation(
      () => prisma.product.findUnique({
        where: { id: uniqueId }
      }),
      'поиск товара'
    );

    if (!product) {
      return NextResponse.json({ 
        error: 'Товар не найден' 
      }, { status: 404 });
    }

    // Обновляем себестоимость в wbData
    const currentWbData = product.wbData as any || {};
    const updatedWbData = {
      ...currentWbData,
      costPrice: costPrice,
      lastCostPriceUpdate: new Date().toISOString()
    };

    await safePrismaOperation(
      () => prisma.product.update({
        where: { id: uniqueId },
        data: {
          wbData: updatedWbData,
          updatedAt: new Date()
        }
      }),
      'обновление себестоимости'
    );

    console.log(`✅ Себестоимость товара ${nmID} обновлена: ${costPrice}₽`);

    return NextResponse.json({
      success: true,
      nmID,
      costPrice,
      message: 'Себестоимость успешно обновлена'
    });

  } catch (error) {
    console.error('❌ Ошибка обновления себестоимости:', error);
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
