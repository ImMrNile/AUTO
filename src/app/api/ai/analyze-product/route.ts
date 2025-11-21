import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 });
    }

    // Получить товар с аналитикой
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      },
      include: {
        analytics: true,
        subcategory: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Собрать данные для анализа
    const analyticsData = product.analytics ? {
      views: product.analytics.views || 0,
      addToCart: product.analytics.addToCart || 0,
      orders: product.analytics.orders || 0,
      ctr: product.analytics.ctr || 0,
      conversionRate: product.analytics.conversionRate || 0
    } : null;

    // Промпт для GPT
    const prompt = `
Ты - AI эксперт по оптимизации товаров на Wildberries.

ДАННЫЕ ТОВАРА:
- Название: ${product.name}
- Категория: ${product.subcategory?.name || 'Не указана'}
- Цена: ${product.price}₽
- Цена со скидкой: ${product.discountPrice || product.price}₽
${analyticsData ? `
АНАЛИТИКА:
- Просмотры: ${analyticsData.views}
- В корзину: ${analyticsData.addToCart}
- Заказы: ${analyticsData.orders}
- CTR: ${analyticsData.ctr}%
- Конверсия: ${analyticsData.conversionRate}%
` : ''}

ЗАДАЧА:
Проанализируй товар и определи проблемы в:
1. Фотографиях (качество, количество, инфографика)
2. Описании (SEO, ключевые слова, полнота)
3. Поисковой оптимизации (название, теги)
4. Конверсии (цена, скидка, позиционирование)

ФОРМАТ ОТВЕТА (JSON):
{
  "diagnosis": "Краткий диагноз ситуации (2-3 предложения)",
  "problems": [
    {
      "category": "photos" | "description" | "seo" | "price",
      "severity": "critical" | "important" | "minor",
      "description": "Описание проблемы",
      "impact": "Влияние на продажи"
    }
  ],
  "recommendations": {
    "critical": [
      {
        "action": "Что сделать",
        "reason": "Почему это важно",
        "effect": "Ожидаемый эффект"
      }
    ],
    "important": [...],
    "improvements": [...]
  },
  "forecast": {
    "conversionChange": "+X%",
    "salesChange": "+X%",
    "timeline": "X дней"
  }
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Ты - эксперт по оптимизации товаров на WB. Отвечай только JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error: any) {
    console.error('❌ Ошибка анализа товара:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка анализа' },
      { status: 500 }
    );
  }
}
