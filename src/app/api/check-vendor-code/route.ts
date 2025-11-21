// src/app/api/check-vendor-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorCode = searchParams.get('code');

    if (!vendorCode) {
      return NextResponse.json({ 
        success: false,
        error: 'Не указан артикул для проверки' 
      }, { status: 400 });
    }

    console.log(`🔍 Проверяем уникальность артикула: ${vendorCode}`);

    // Проверяем в нашей базе данных
    const existingProduct = await prisma.product.findFirst({
      where: {
        vendorCode: vendorCode
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      }
    });

    const isUnique = !existingProduct;
    
    console.log(`${isUnique ? '✅' : '❌'} Артикул ${vendorCode} ${isUnique ? 'уникален' : 'уже используется'}`);

    const response = {
      success: true,
      vendorCode: vendorCode,
      isUnique: isUnique,
      message: isUnique ? 'Артикул уникален' : 'Артикул уже используется',
      ...(existingProduct && {
        existingProduct: {
          id: existingProduct.id,
          name: existingProduct.name,
          status: existingProduct.status,
          createdAt: existingProduct.createdAt
        }
      })
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Ошибка проверки уникальности артикула:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Ошибка проверки артикула', 
      details: error.message 
    }, { status: 500 });
  }
}
