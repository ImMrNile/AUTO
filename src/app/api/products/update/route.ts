import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';

/**
 * POST /api/products/update
 * Обновление данных товара
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { nmID, updates } = await request.json();

    if (!nmID) {
      return NextResponse.json({ 
        error: 'Не указан nmID товара' 
      }, { status: 400 });
    }

    console.log(`📝 Обновление товара ${nmID}:`, updates);

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

    // Подготавливаем данные для обновления
    const updateData: any = {
      updatedAt: new Date()
    };

    // Обновляем основные поля
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.generatedName !== undefined) updateData.generatedName = updates.generatedName;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.discountPrice !== undefined) updateData.discountPrice = updates.discountPrice;
    if (updates.discount !== undefined) updateData.discount = updates.discount;
    if (updates.costPrice !== undefined) updateData.costPrice = updates.costPrice;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.vendorCode !== undefined) updateData.vendorCode = updates.vendorCode;
    if (updates.seoDescription !== undefined) updateData.seoDescription = updates.seoDescription;

    // Обновляем wbData если есть изменения
    if (Object.keys(updates).length > 0) {
      const currentWbData = product.wbData as any || {};
      updateData.wbData = {
        ...currentWbData,
        ...updates,
        lastUpdate: new Date().toISOString()
      };
    }

    const updatedProduct = await safePrismaOperation(
      () => prisma.product.update({
        where: { id: uniqueId },
        data: updateData
      }),
      'обновление товара'
    );

    console.log(`✅ Товар ${nmID} успешно обновлен`);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Товар успешно обновлен'
    });

  } catch (error) {
    console.error('❌ Ошибка обновления товара:', error);
    return NextResponse.json({
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
