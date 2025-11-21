// src/app/api/products/[id]/price-lock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Получить статус закрепления цены
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        priceLocked: true,
        lockedPrice: true,
        wbNmId: true,
        userId: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    if (product.userId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        priceLocked: product.priceLocked,
        lockedPrice: product.lockedPrice,
        currentPrice: product.discountPrice || product.price
      }
    });
  } catch (error) {
    console.error('❌ [Price Lock] Ошибка получения статуса:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Включить/выключить закрепление цены
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { locked, price } = body;

    if (typeof locked !== 'boolean') {
      return NextResponse.json({ error: 'Параметр locked обязателен' }, { status: 400 });
    }

    if (locked && (!price || price <= 0)) {
      return NextResponse.json({ error: 'Укажите корректную цену для закрепления' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        userId: true,
        wbNmId: true,
        price: true,
        discountPrice: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    if (product.userId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Обновляем статус закрепления
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        priceLocked: locked,
        lockedPrice: locked ? price : null
      }
    });

    console.log(`🔒 [Price Lock] Товар ${product.name} (${params.id}): закрепление ${locked ? 'включено' : 'выключено'}${locked ? ` на ${price}₽` : ''}`);

    return NextResponse.json({
      success: true,
      message: locked ? `Цена закреплена на ${price}₽` : 'Закрепление цены отключено',
      data: {
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

// PATCH - Проверить и восстановить цену (вызывается из cron)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        productCabinets: {
          where: { isSelected: true },
          include: {
            cabinet: {
              select: {
                id: true,
                name: true,
                apiToken: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    if (product.userId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (!product.priceLocked || !product.lockedPrice) {
      return NextResponse.json({ 
        success: true, 
        message: 'Закрепление цены не активно',
        restored: false
      });
    }

    if (!product.wbNmId) {
      return NextResponse.json({ error: 'Товар не опубликован на WB' }, { status: 400 });
    }

    // Получаем кабинет
    if (!product.productCabinets || product.productCabinets.length === 0) {
      return NextResponse.json({ error: 'Не указан кабинет' }, { status: 400 });
    }

    const cabinet = product.productCabinets[0].cabinet;
    if (!cabinet || !cabinet.isActive || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет неактивен или нет API токена' }, { status: 400 });
    }

    // Получаем текущую цену с WB
    console.log(`🔍 [Price Lock] Проверка цены товара ${product.name} (nmId: ${product.wbNmId})`);
    
    const priceInfo = await wbApiService.getProductPrice(cabinet.apiToken, parseInt(product.wbNmId));
    
    if (!priceInfo.success || !priceInfo.data) {
      console.warn(`⚠️ [Price Lock] Не удалось получить цену с WB: ${priceInfo.error}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Не удалось получить цену с WB',
        details: priceInfo.error
      }, { status: 500 });
    }

    const currentWbPrice = priceInfo.data.price;
    const lockedPrice = product.lockedPrice;

    console.log(`💰 [Price Lock] Текущая цена на WB: ${currentWbPrice}₽, закрепленная: ${lockedPrice}₽`);

    // Если цена изменилась - восстанавливаем
    if (Math.abs(currentWbPrice - lockedPrice) > 0.01) {
      console.log(`🔄 [Price Lock] Обнаружено изменение цены! Восстанавливаем ${lockedPrice}₽`);
      
      const restoreResult = await wbApiService.setProductPriceWithRetry(
        cabinet.apiToken,
        parseInt(product.wbNmId),
        lockedPrice,
        3,
        5000
      );

      if (!restoreResult.success) {
        console.error(`❌ [Price Lock] Не удалось восстановить цену: ${restoreResult.error}`);
        return NextResponse.json({
          success: false,
          error: 'Не удалось восстановить цену',
          details: restoreResult.error,
          priceChanged: true,
          currentPrice: currentWbPrice,
          lockedPrice: lockedPrice
        }, { status: 500 });
      }

      // Обновляем цену в БД
      await prisma.product.update({
        where: { id: params.id },
        data: {
          discountPrice: lockedPrice,
          price: lockedPrice
        }
      });

      console.log(`✅ [Price Lock] Цена успешно восстановлена: ${lockedPrice}₽`);

      return NextResponse.json({
        success: true,
        message: `Цена восстановлена с ${currentWbPrice}₽ на ${lockedPrice}₽`,
        restored: true,
        previousPrice: currentWbPrice,
        restoredPrice: lockedPrice
      });
    }

    console.log(`✅ [Price Lock] Цена не изменилась, восстановление не требуется`);

    return NextResponse.json({
      success: true,
      message: 'Цена не изменилась',
      restored: false,
      currentPrice: currentWbPrice
    });
  } catch (error) {
    console.error('❌ [Price Lock] Ошибка проверки/восстановления цены:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
