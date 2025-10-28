import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Получаем товар из базы данных
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        subcategory: true,
        characteristics: true,
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' },
        { status: 404 }
      );
    }

    // Получаем размеры из JSON поля
    const sizes = product.sizes ? (typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes) : [];
    const sizesArray = Array.isArray(sizes) ? sizes : [];

    // Получаем баркод из vendorCode или генерируем дефолтный
    const barcode = product.vendorCode || 'Не указан';

    // Формируем данные для отображения
    const productResult = {
      id: product.id,
      name: product.name,
      description: product.seoDescription || product.generatedName || '',
      message: 'Товар успешно создан и готов к публикации',
      status: product.status,
      category: product.subcategory?.name || product.suggestedCategory || 'Не указана',
      wbSubjectId: product.subcategoryId || 0,
      hasVariantSizes: sizesArray.length > 0,
      variantSizesCount: sizesArray.length,
      hasReferenceUrl: !!product.referenceUrl,
      barcode: barcode,
      priceInfo: {
        original: product.price || 0,
        discount: product.discountPrice || undefined,
        final: product.discountPrice || product.price || 0,
        hasDiscount: !!product.discountPrice,
        discountPercent: product.discountPrice 
          ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
          : undefined
      },
      imagesCount: {
        total: product.originalImage ? 1 : 0
      }
    };

    return NextResponse.json({
      success: true,
      product: productResult
    });

  } catch (error) {
    console.error('Ошибка получения данных товара:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
