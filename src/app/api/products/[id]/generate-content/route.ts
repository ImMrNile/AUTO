// API для генерации SEO-контента через Content Writer Assistant
// DEPRECATED: Используйте unifiedAISystem вместо content-writer
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
// import { generateProductDescription, generateProductName, chatWithContentAssistant } from '@/lib/ai/content-writer';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/products/[id]/generate-content
 * Генерирует SEO-контент для товара
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const productId = params.id;
    const body = await request.json();
    const { type, message, maxLength } = body;

    console.log(`✍️ [Content Writer] Генерация контента для товара ${productId}, тип: ${type}`);

    // Получаем данные товара
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        analytics: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Получаем поисковые запросы (из аналитики или из API)
    const searchQueries = product.analytics?.topSearchQueries as any[] || [];

    // Формируем характеристики
    const characteristics = `
Название: ${product.name}
Цена: ${product.price}₽
${product.brand ? `Бренд: ${product.brand}` : ''}
${product.packaging ? `Комплектация: ${product.packaging}` : ''}
    `.trim();

    // TODO: Реализовать генерацию контента через unifiedAISystem
    return NextResponse.json({
      success: false,
      error: 'API генерации контента временно недоступен. Используйте основной процесс создания товара.',
      productId,
      timestamp: new Date().toISOString()
    }, { status: 501 });

  } catch (error: any) {
    console.error('❌ [Content Writer] Ошибка:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка генерации контента' },
      { status: 500 }
    );
  }
}
