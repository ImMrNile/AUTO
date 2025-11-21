import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

/**
 * POST /api/products/[id]/optimize
 * Запускает AI оптимизацию товара
 *
 * Запрос:
 * {
 *   "weeklyBudget": 1000,    // Бюджет на неделю (рублей)
 *   "optimizationType": "both" | "promotion" | "content"  // Тип оптимизации
 * }
 *
 * Ответ:
 * {
 *   "success": true,
 *   "chats": [
 *     {
 *       "id": "...",
 *       "chatType": "promotion",
 *       "title": "Оптимизация продвижения"
 *     },
 *     {
 *       "id": "...",
 *       "chatType": "content",
 *       "title": "Оптимизация контента"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Проверка авторизации
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const productId = params.id;
    const userId = user.id;

    // 2. Получаем параметры запроса
    const body = await request.json();
    const {
      weeklyBudget = 1000, // Бюджет на неделю по умолчанию 1000₽
      optimizationType = 'both' // both | promotion | content
    } = body;

    console.log(`🤖 [AI] Запуск оптимизации товара ${productId} для пользователя ${userId}`);
    console.log(`   Бюджет: ${weeklyBudget}₽/неделя`);
    console.log(`   Тип: ${optimizationType}`);

    // 3. Проверяем товар и получаем данные
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: userId
      },
      include: {
        analytics: true,
        subcategory: true,
        characteristics: {
          select: {
            name: true,
            value: true,
            isRequired: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // 4. Рассчитываем бюджет
    const dailyBudget = Math.round(weeklyBudget / 7);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Неделя оптимизации

    console.log(`💰 [AI] Бюджет: ${dailyBudget}₽/день, ${weeklyBudget}₽/неделя`);

    // 5. Создаем чаты AI
    const createdChats = [];

    // Создаем чат для продвижения
    if (optimizationType === 'both' || optimizationType === 'promotion') {
      const promotionChat = await createAiChat({
        productId,
        userId,
        chatType: 'promotion',
        title: 'Оптимизация продвижения',
        dailyBudget,
        weeklyBudget,
        startDate,
        endDate,
        assistantId: process.env.OPENAI_ASSISTANT_ID || 'asst_NpQhCcbeA4ueRdrGR9BgYktN'
      });
      createdChats.push(promotionChat);
    }

    // Создаем чат для контента
    if (optimizationType === 'both' || optimizationType === 'content') {
      const contentChat = await createAiChat({
        productId,
        userId,
        chatType: 'content',
        title: 'Оптимизация контента',
        dailyBudget: 0, // Контент не имеет бюджета
        weeklyBudget: 0,
        startDate,
        endDate,
        assistantId: process.env.OPENAI_CONTENT_ASSISTANT_ID || 'asst_IClCvs26y24HB6FqQdoRwERw'
      });
      createdChats.push(contentChat);
    }

    // 6. Отправляем начальные сообщения AI
    for (const chat of createdChats) {
      await sendInitialMessage(chat, product, weeklyBudget);
    }

    console.log(`✅ [AI] Создано ${createdChats.length} чатов оптимизации для товара ${product.name}`);

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name
      },
      chats: createdChats.map(chat => ({
        id: chat.id,
        chatType: chat.chatType,
        title: chat.title,
        status: chat.status,
        dailyBudget: chat.dailyBudget,
        weeklyBudget: chat.weeklyBudget
      })),
      optimization: {
        weeklyBudget,
        dailyBudget,
        startDate,
        endDate,
        optimizationType
      }
    });

  } catch (error: any) {
    console.error('❌ [AI] Ошибка запуска оптимизации:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Ошибка запуска оптимизации',
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * Создает чат AI для товара
 */
async function createAiChat(params: {
  productId: string;
  userId: string;
  chatType: string;
  title: string;
  dailyBudget: number;
  weeklyBudget: number;
  startDate: Date;
  endDate: Date;
  assistantId: string;
}) {
  // Создаем Thread в OpenAI
  let threadId: string | null = null;

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      console.log(`🧵 [AI] Создан Thread для ${params.chatType}: ${threadId}`);
    } catch (error) {
      console.warn(`⚠️ [AI] Не удалось создать Thread:`, error);
    }
  }

  // Создаем чат в БД
  const chat = await prisma.productAiChat.create({
    data: {
      productId: params.productId,
      userId: params.userId,
      aiThreadId: threadId,
      aiAssistantId: params.assistantId,
      chatType: params.chatType,
      title: params.title,
      dailyBudget: params.dailyBudget,
      weeklyBudget: params.weeklyBudget,
      startDate: params.startDate,
      endDate: params.endDate,
      status: 'ACTIVE'
    }
  });

  return chat;
}

/**
 * Отправляет начальное сообщение AI с данными товара
 */
async function sendInitialMessage(chat: any, product: any, weeklyBudget: number) {
  if (!process.env.OPENAI_API_KEY || !chat.aiThreadId) {
    console.warn(`⚠️ [AI] Нет API ключа или Thread для ${chat.chatType}`);
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Формируем сообщение с данными товара
    const productData = {
      id: product.id,
      name: product.name,
      wbNmId: product.wbNmId,
      category: product.subcategory?.name,
      price: product.price,
      discountPrice: product.discountPrice,
      costPrice: product.costPrice,
      analytics: product.analytics ? {
        views: product.analytics.views,
        addToCart: product.analytics.addToCart,
        orders: product.analytics.orders,
        ctr: product.analytics.ctr,
        conversionRate: product.analytics.conversionRate,
        revenue: product.analytics.revenue
      } : null,
      characteristics: product.characteristics?.map((c: any) => ({
        name: c.name,
        value: c.value,
        required: c.isRequired
      })) || []
    };

    let messageContent = '';

    if (chat.chatType === 'promotion') {
      messageContent = `
🎯 ЗАПУСК ОПТИМИЗАЦИИ ПРОДВИЖЕНИЯ

ТОВАР: ${product.name}
БЮДЖЕТ: ${weeklyBudget}₽ на неделю (${Math.round(weeklyBudget / 7)}₽ в день)

Текущие данные товара:
${JSON.stringify(productData, null, 2)}

ЗАДАЧА:
1. Проанализируй текущую ситуацию с продвижением товара
2. Определи оптимальную стратегию (просмотры/клики/позиции)
3. Предложи начальные настройки кампаний
4. Настрой автоматическое управление бюджетом на неделю
5. Отслеживай эффективность и корректируй стратегию

Требования:
- Максимально эффективно использовать бюджет ${weeklyBudget}₽
- Фокус на увеличении продаж и ROI
- Автоматическая оптимизация в течение недели
- Ежедневные отчеты о результатах
      `.trim();
    } else if (chat.chatType === 'content') {
      messageContent = `
📝 ЗАПУСК ОПТИМИЗАЦИИ КОНТЕНТА

ТОВАР: ${product.name}

Текущие данные товара:
${JSON.stringify(productData, null, 2)}

ЗАДАЧА:
1. Проанализируй текущий контент товара (название, описание)
2. Определи сильные и слабые стороны
3. Предложи улучшения для увеличения конверсии
4. Создай план оптимизации контента
5. Автоматически применяй изменения

Требования:
- Фокус на увеличение CTR и конверсии
- Учитывай специфику категории ${product.subcategory?.name || 'общая'}
- Используй психологические триггеры
- Оптимизируй под поисковые запросы
      `.trim();
    }

    // Отправляем сообщение
    await openai.beta.threads.messages.create(chat.aiThreadId, {
      role: 'user',
      content: messageContent
    });

    // Запускаем Assistant
    const run = await openai.beta.threads.runs.create(chat.aiThreadId, {
      assistant_id: chat.aiAssistantId
    });

    // Сохраняем сообщение в БД
    await prisma.productAiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: messageContent,
        metadata: {
          type: 'initial_message',
          productData,
          weeklyBudget
        }
      }
    });

    console.log(`✅ [AI] Отправлено начальное сообщение для ${chat.chatType}`);

    // Ждем завершения (асинхронно)
    // В реальном приложении это можно делать в фоне или через вебхуки

  } catch (error) {
    console.error(`❌ [AI] Ошибка отправки сообщения для ${chat.chatType}:`, error);
  }
}
