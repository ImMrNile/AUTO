import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

/**
 * GET /api/products/[id]/ai-chat
 * Получить историю чата AI для товара
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const productId = params.id;
    const { searchParams } = new URL(request.url);
    const chatType = searchParams.get('type') || 'promotion'; // promotion | content

    // Получаем активный чат для товара
    const chat = await prisma.productAiChat.findFirst({
      where: {
        productId,
        userId: user.id,
        chatType,
        status: 'ACTIVE'
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chat) {
      return NextResponse.json({
        chat: null,
        messages: [],
        canCreate: true
      });
    }

    // Этот код никогда не выполнится, пока AI чат отключен
    return NextResponse.json({
      chat: null,
      messages: [],
      canCreate: false
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения чата:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка получения чата' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const productId = params.id;
    const { message, chatType = 'promotion' } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    // Получаем товар
    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
      include: { analytics: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    // Находим или создаем чат
    let chat = await prisma.productAiChat.findFirst({
      where: {
        productId,
        userId: user.id,
        chatType,
        status: 'ACTIVE'
      }
    });

    let isNewChat = false;
    if (!chat) {
      // Создаем новый чат
      const assistantId = chatType === 'promotion'
        ? process.env.OPENAI_ASSISTANT_ID
        : process.env.OPENAI_CONTENT_ASSISTANT_ID;

      if (!assistantId) {
        return NextResponse.json({ error: `Assistant ID для ${chatType} не настроен` }, { status: 500 });
      }

      chat = await prisma.productAiChat.create({
        data: {
          productId,
          userId: user.id,
          aiAssistantId: assistantId,
          chatType,
          title: chatType === 'promotion' ? 'Оптимизация продвижения' : 'Оптимизация контента',
          dailyBudget: chatType === 'promotion' ? 100 : 0,
          weeklyBudget: chatType === 'promotion' ? 700 : 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Неделя
        }
      });
      isNewChat = true;
    }

    // Сохраняем сообщение пользователя
    await prisma.productAiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
        metadata: {
          type: 'user_message',
          isNewChat
        }
      }
    });

    // Отправляем запрос к OpenAI
    let aiResponse: string;
    try {
      aiResponse = await sendToAI(chat.aiThreadId, chat.aiAssistantId, message, product, chat);
    } catch (error: any) {
      console.error('Ошибка AI:', error);
      aiResponse = `Извините, произошла ошибка при обработке запроса: ${error.message}`;
    }

    // Сохраняем ответ AI
    const aiMessage = await prisma.productAiMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse,
        metadata: {
          type: 'ai_response'
        }
      }
    });

    // Обновляем время последнего сообщения
    await prisma.productAiChat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      chatId: chat.id,
      message: {
        id: aiMessage.id,
        role: 'assistant',
        content: aiResponse,
        createdAt: aiMessage.createdAt,
        metadata: aiMessage.metadata
      },
      isNewChat
    });

  } catch (error: any) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка отправки сообщения' },
      { status: 500 }
    );
  }
}

/**
 * Отправляет запрос к OpenAI Assistant
 */
async function sendToAI(threadId: string | null, assistantId: string, message: string, product: any, chat: any): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY не настроен');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let actualThreadId = threadId;

  // Создаем новый thread если его нет
  if (!actualThreadId) {
    const thread = await openai.beta.threads.create();
    actualThreadId = thread.id;

    // Обновляем threadId в базе данных
    await prisma.productAiChat.update({
      where: { id: chat.id },
      data: { aiThreadId: actualThreadId }
    });
  }

  // Добавляем системный контекст если это новый чат
  if (!threadId) {
    const systemMessage = createSystemPrompt(product, chat);
    await openai.beta.threads.messages.create(actualThreadId, {
      role: 'assistant',
      content: systemMessage
    });
  }

  // Отправляем сообщение пользователя
  await openai.beta.threads.messages.create(actualThreadId, {
    role: 'user',
    content: message
  });

  // Запускаем assistant
  const run = await openai.beta.threads.runs.create(actualThreadId, {
    assistant_id: assistantId
  });

  // Ждем завершения
  let runStatus;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(actualThreadId, run.id as any);
  } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

  if (runStatus.status === 'failed') {
    throw new Error(`AI ответил с ошибкой: ${runStatus.last_error?.message}`);
  }

  // Получаем ответ
  const messages = await openai.beta.threads.messages.list(actualThreadId, { order: 'desc', limit: 1 });
  const responseMessage = messages.data[0];

  if (!responseMessage?.content[0] || responseMessage.content[0].type !== 'text') {
    throw new Error('Не удалось получить ответ от AI');
  }

  return responseMessage.content[0].text.value;
}

/**
 * Создает системный промпт для AI
 */
function createSystemPrompt(product: any, chat: any): string {
  const baseInfo = `
ТОВАР: ${product.name}
WB ID: ${product.wbNmId}

КОНВЕРСИЯ ТОВАРА:
- Просмотры: ${product.analytics?.views || 0}
- Заказы: ${product.analytics?.orders || 0}
- CTR: ${product.analytics?.ctr || 0}%
- Конверсия: ${product.analytics?.conversionRate || 0}%

БЮДЖЕТ: ${chat.dailyBudget}₽/день, ${chat.weeklyBudget}₽/неделя
ПЕРИОД: ${chat.startDate.toLocaleDateString('ru-RU')} - ${chat.endDate.toLocaleDateString('ru-RU')}
  `.trim();

  if (chat.chatType === 'promotion') {
    return `
${baseInfo}

ТЫ - СПЕЦИАЛИСТ ПО ПРОДВИЖЕНИЮ НА WILDBERRIES

ТВОИ ЗАДАЧИ:
1. Анализировать эффективность рекламных кампаний
2. Предлагать оптимизацию ставок и бюджета
3. Рекомендовать изменения в стратегии продвижения
4. Отслеживать ROI и конверсию
5. Автоматически применять изменения через API

ПРАВИЛА:
- Всегда обосновывай свои рекомендации данными
- Учитывай бюджетные ограничения
- Предлагай конкретные действия с ожидаемым эффектом
- Будь консервативен в рекомендациях по увеличению бюджета
    `.trim();
  } else {
    return `
${baseInfo}

ТЫ - СПЕЦИАЛИСТ ПО ОПТИМИЗАЦИИ КОНТЕНТА НА WILDBERRIES

ТВОИ ЗАДАЧИ:
1. Анализировать текущий контент товара (название, описание)
2. Предлагать улучшения для увеличения CTR
3. Оптимизировать под поисковые запросы
4. Создавать более привлекательные описания
5. Автоматически применять изменения через API

ПРАВИЛА:
- Фокус на психологических триггерах и выгодах
- Учитывай специфику категории товара
- Используй эмоциональный язык
- Оптимизируй под мобильных пользователей
- Предлагай A/B тесты для проверки гипотез
    `.trim();
  }
}
