import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const where: any = {
      userId: user.id
    };

    if (productId) {
      where.productId = productId;
    }

    const promotions = await prisma.productPromotion.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            wbNmId: true
          }
        },
        reports: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedPromotions = promotions.map((promo: any) => ({
      id: promo.id,
      productId: promo.productId,
      product: promo.product,
      status: promo.status,
      startDate: promo.startDate,
      endDate: promo.endDate,
      checkInterval: promo.checkInterval,
      initialSales: promo.initialSales,
      initialConversion: promo.initialConversion,
      initialCTR: promo.initialCTR,
      initialROAS: promo.initialROAS,
      currentSales: promo.currentSales,
      currentConversion: promo.currentConversion,
      currentCTR: promo.currentCTR,
      currentROAS: promo.currentROAS,
      checksPerformed: promo.checksPerformed,
      actionsApplied: promo.actionsApplied,
      lastReport: promo.reports[0] ? {
        diagnosis: promo.reports[0].diagnosis,
        createdAt: promo.reports[0].createdAt
      } : null
    }));

    return NextResponse.json(formattedPromotions);

  } catch (error: any) {
    console.error('❌ Ошибка получения продвижений:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка загрузки' },
      { status: 500 }
    );
  }
}
