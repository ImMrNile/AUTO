import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем товар с привязками к кабинетам
    const product = await safePrismaOperation(
      () => prisma.product.findUnique({
        where: { id: params.id },
        include: {
          productCabinets: {
            include: { cabinet: true }
          }
        }
      }),
      'загрузка товара для диагностики публикации'
    );

    if (!product) {
      return NextResponse.json({ success: false, error: 'Товар не найден' }, { status: 404 });
    }

    // Ищем активный кабинет с токеном
    const activePc = product.productCabinets?.find((pc: any) => pc.cabinet?.isActive && pc.cabinet?.apiToken && pc.isSelected)
      || product.productCabinets?.find((pc: any) => pc.cabinet?.isActive && pc.cabinet?.apiToken);

    if (!activePc) {
      return NextResponse.json({ success: false, error: 'Не найден активный кабинет с API токеном' }, { status: 400 });
    }

    // Извлекаем wbData
    let wbData: any = null;
    try {
      wbData = product.wbData ? (typeof product.wbData === 'object' ? product.wbData : JSON.parse(product.wbData as any)) : null;
    } catch (e) {
      // Игнорируем, если wbData невалиден
    }

    const taskId = wbData?.wbTaskId || wbData?.taskId || null;
    const vendorCode = wbData?.vendorCode || (product as any).vendorCode || null;

    // Диагностика публикации через сервис
    const diagnostic = await wbApiService.diagnosePublicationStatus({
      taskId,
      vendorCode,
      apiToken: activePc.cabinet.apiToken || ''
    });

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        status: product.status,
        publishedAt: product.publishedAt,
        taskId,
        vendorCode,
        diagnostic
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}



