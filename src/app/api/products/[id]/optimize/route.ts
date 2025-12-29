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
      optimizationType = 'unified' // unified | both | promotion | content (для обратной совместимости)
    } = body;

    console.log(`🤖 [AI] Запуск оптимизации товара ${productId} для пользователя ${userId}`);
    console.log(`   Бюджет: ${weeklyBudget}₽/неделя`);
    console.log(`   Тип: ${optimizationType}`);

    // 3. Проверяем товар и получаем данные
    console.log(`📦 [AI] Шаг 1/5: Загрузка данных товара из БД...`);
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
        },
        productCabinets: {
          where: { isSelected: true },
          include: { cabinet: true }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    console.log(`✅ [AI] Товар загружен: ${product.name}`);
    console.log(`   📊 Аналитика: ${product.analytics ? 'Есть' : 'Нет'}`);
    console.log(`   🏷️ Категория: ${product.subcategory?.name || 'Не указана'}`);
    console.log(`   📝 Характеристик: ${product.characteristics?.length || 0}`);
    console.log(`   💰 Цена: ${product.price}₽ → ${product.discountPrice}₽ (скидка ${product.discount}%)`);
    
    // Получаем кабинет для доступа к WB API
    const cabinet = product.productCabinets[0]?.cabinet;
    if (!cabinet || !cabinet.apiToken) {
      console.warn(`⚠️ [AI] Кабинет не настроен для товара`);
    } else {
      console.log(`✅ [AI] Кабинет WB подключен: ${cabinet.name}`);
    }

    // 4. Рассчитываем бюджет
    const dailyBudget = Math.round(weeklyBudget / 7);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Неделя оптимизации

    console.log(`💰 [AI] Бюджет: ${dailyBudget}₽/день, ${weeklyBudget}₽/неделя`);

    // 5. Создаем чаты AI
    console.log(`🧵 [AI] Шаг 2/5: Создание AI чата...`);
    const createdChats = [];

    // Для unified создаем один универсальный чат
    if (optimizationType === 'unified') {
      console.log(`   Тип чата: Универсальный агент`);
      console.log(`   Assistant ID: ${process.env.OPENAI_ASSISTANT_ID || 'asst_NpQhCcbeA4ueRdrGR9BgYktN'}`);
      
      const unifiedChat = await createAiChat({
        productId,
        userId,
        chatType: 'unified',
        title: 'Универсальная AI оптимизация',
        dailyBudget,
        weeklyBudget,
        startDate,
        endDate,
        assistantId: process.env.OPENAI_ASSISTANT_ID || 'asst_NpQhCcbeA4ueRdrGR9BgYktN'
      });
      createdChats.push(unifiedChat);
      console.log(`✅ [AI] Чат создан: ${unifiedChat.id}`);
    } else {
      // Для обратной совместимости: создаем отдельные чаты
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

      if (optimizationType === 'both' || optimizationType === 'content') {
        const contentChat = await createAiChat({
          productId,
          userId,
          chatType: 'content',
          title: 'Оптимизация контента',
          dailyBudget: 0,
          weeklyBudget: 0,
          startDate,
          endDate,
          assistantId: process.env.OPENAI_CONTENT_ASSISTANT_ID || 'asst_IClCvs26y24HB6FqQdoRwERw'
        });
        createdChats.push(contentChat);
      }
    }

    // 6. Отправляем начальные сообщения AI
    console.log(`📤 [AI] Шаг 3/5: Подготовка данных для AI агента...`);
    console.log(`   Собираем: аналитику, цены, характеристики, историю продаж`);
    
    for (const chat of createdChats) {
      await sendInitialMessage(chat, product, weeklyBudget, cabinet);
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
async function sendInitialMessage(chat: any, product: any, weeklyBudget: number, cabinet?: any) {
  if (!process.env.OPENAI_API_KEY || !chat.aiThreadId) {
    console.warn(`⚠️ [AI] Нет API ключа или Thread для ${chat.chatType}`);
    return;
  }

  try {
    console.log(`📊 [AI] Формирование данных для ${chat.chatType}...`);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Получаем расширенные данные оптимизации (поисковые запросы, конверсии, кампании)
    console.log(`   🔍 Загрузка данных оптимизации (до 12 недель)...`);
    let optimizationData: any = null;
    
    if (cabinet?.apiToken && product.wbNmId) {
      try {
        // Вызываем API напрямую (внутренний запрос)
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        const response = await fetch(`${baseUrl}/api/products/${product.id}/smart-optimization-data`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET || 'internal'}`,
            'x-internal-request': 'true'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          optimizationData = result.data || result.rawData;
          
          console.log(`   ✅ Данные оптимизации загружены:`);
          console.log(`      • Поисковые запросы: ${optimizationData?.searchQueries?.length || 0}`);
          console.log(`      • Конверсии: ${optimizationData?.conversionData?.length || 0} периодов`);
          console.log(`      • Кампании: ${optimizationData?.campaignStats?.length || 0}`);
          console.log(`      • Ключевые слова: ${optimizationData?.keywordStats?.length || 0}`);
          console.log(`      • Воронка продаж: ${optimizationData?.salesFunnel?.length || 0} дней`);
        } else {
          console.warn(`   ⚠️ Не удалось загрузить данные оптимизации: ${response.status}`);
        }
      } catch (error) {
        console.error(`   ❌ Ошибка загрузки данных оптимизации:`, error);
        // Продолжаем без данных оптимизации
      }
    } else {
      console.warn(`   ⚠️ Пропускаем загрузку данных оптимизации: нет API токена или nmId`);
    }

    // Формируем сообщение с данными товара
    console.log(`   ✓ Данные товара: название, цены, характеристики`);
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

    if (chat.chatType === 'unified') {
      // Формируем секцию с данными оптимизации (компактная версия для AI)
      let optimizationSection = '';
      if (optimizationData) {
        try {
          // Топ-10 запросов вместо 20
          const topQueries = optimizationData.searchQueries?.slice(0, 10) || [];
          
          // Суммарная конверсия
          const totalConversion = optimizationData.conversionData?.reduce((acc: any, c: any) => ({
            views: (acc.views || 0) + (c.statistic?.selected?.openCount || 0),
            addToCart: (acc.addToCart || 0) + (c.statistic?.selected?.addToCartCount || 0),
            orders: (acc.orders || 0) + (c.statistic?.selected?.orderCount || 0)
          }), {}) || {};
          
          // Топ-5 кампаний
          const topCampaigns = optimizationData.campaignStats?.filter((c: any) => c.status === 9).slice(0, 5) || [];
          
          // Топ-5 ключевых слов
          const topKeywords = optimizationData.keywordStats?.slice(0, 5) || [];

          optimizationSection = `

ДАННЫЕ ОПТИМИЗАЦИИ (последние недели):

1. ТОП ПОИСКОВЫЕ ЗАПРОСЫ:
${topQueries.map((q: any, i: number) => 
  `   ${i+1}. "${q.keyword}" - ${q.clicks} кликов, CTR ${(q.ctr || 0).toFixed(1)}%`
).join('\n') || '   Нет данных'}

2. КОНВЕРСИЯ:
   Просмотры: ${totalConversion.views || 0} → Корзина: ${totalConversion.addToCart || 0} → Заказы: ${totalConversion.orders || 0}
   Конверсия в корзину: ${totalConversion.views ? ((totalConversion.addToCart / totalConversion.views) * 100).toFixed(1) : 0}%
   Конверсия в заказ: ${totalConversion.addToCart ? ((totalConversion.orders / totalConversion.addToCart) * 100).toFixed(1) : 0}%

3. АКТИВНЫЕ КАМПАНИИ:
${topCampaigns.map((c: any) => 
  `   • ${c.name}: ${c.budget}₽, CTR ${(c.ctr || 0).toFixed(1)}%`
).join('\n') || '   Нет активных кампаний'}

4. ЭФФЕКТИВНЫЕ КЛЮЧЕВЫЕ СЛОВА:
${topKeywords.map((k: any, i: number) => 
  `   ${i+1}. "${k.keyword}" - ${k.clicks} кликов, ${k.orders || 0} заказов`
).join('\n') || '   Нет данных'}
`;
        } catch (error) {
          console.error(`   ❌ Ошибка форматирования данных оптимизации:`, error);
          optimizationSection = '\n(Данные оптимизации недоступны)';
        }
      }

      messageContent = `Запуск AI оптимизации для товара "${product.name || 'Без названия'}".

Бюджет: ${weeklyBudget}₽ на неделю.

Данные товара:
- ID: ${product.wbNmId || 'не указан'}
- Категория: ${product.subcategory?.name || 'не указана'}
- Цена: ${product.price || 0}₽
- Цена со скидкой: ${product.discountPrice || 0}₽
${optimizationData ? `
Данные оптимизации (последние недели):
- Поисковые запросы: ${optimizationData.searchQueries?.length || 0}
- Заказов за период: ${optimizationData.conversionData?.reduce((sum: number, c: any) => sum + (c.statistic?.selected?.orderCount || 0), 0) || 0}
- Просмотров за период: ${optimizationData.conversionData?.reduce((sum: number, c: any) => sum + (c.statistic?.selected?.openCount || 0), 0) || 0}
- Активных кампаний: ${optimizationData.campaignStats?.filter((c: any) => c.status === 9)?.length || 0}
` : ''}

Твоя задача:
1. Проанализируй товар
2. Определи проблемы и возможности
3. Предложи план оптимизации
4. Начни с самых важных действий

Целевые показатели:
- CTR > 8%
- Конверсия > 15%
- ROI > 200%

Начни с краткого анализа и первых рекомендаций.`.trim();
    } else if (chat.chatType === 'promotion') {
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
    console.log(`📤 [AI] Шаг 4/5: Отправка данных AI агенту...`);
    console.log(`   Thread ID: ${chat.aiThreadId}`);
    console.log(`   Размер данных: ${Math.round(messageContent.length / 1024)}KB`);
    
    await openai.beta.threads.messages.create(chat.aiThreadId, {
      role: 'user',
      content: messageContent
    });

    // Запускаем Assistant
    console.log(`🤖 [AI] Шаг 5/5: Запуск AI агента...`);
    let run = await openai.beta.threads.runs.create(chat.aiThreadId, {
      assistant_id: chat.aiAssistantId
    });

    console.log(`🚀 [AI] Run запущен: ${run.id}`);

    // Ждем завершения Run (максимум 60 секунд)
    let attempts = 0;
    const maxAttempts = 30; // 30 попыток по 2 секунды = 60 секунд
    
    while (attempts < maxAttempts) {
      // Получаем статус Run
      run = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: chat.aiThreadId
      });
      
      if (run.status === 'completed') {
        console.log(`✅ [AI] Run завершен для ${chat.chatType}`);
        
        // Получаем ответ Assistant
        const messages = await openai.beta.threads.messages.list(chat.aiThreadId, {
          limit: 1,
          order: 'desc'
        });
        
        const assistantMessage = messages.data[0];
        if (assistantMessage && assistantMessage.role === 'assistant') {
          const content = assistantMessage.content[0];
          const responseText = content.type === 'text' ? content.text.value : '';
          
          console.log(`💬 [AI] Ответ от ${chat.chatType}:`, responseText.substring(0, 200) + '...');
          
          // Сохраняем ответ в БД
          await prisma.productAiMessage.create({
            data: {
              chatId: chat.id,
              role: 'assistant',
              content: responseText,
              metadata: {
                type: 'initial_response',
                runId: run.id
              }
            }
          });
        }
        break;
      } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        console.error(`❌ [AI] Run завершился с ошибкой для ${chat.chatType}: ${run.status}`);
        if (run.last_error) {
          console.error(`   Код ошибки: ${run.last_error.code}`);
          console.error(`   Сообщение: ${run.last_error.message}`);
          
          // Сохраняем ошибку в БД
          await prisma.productAiMessage.create({
            data: {
              chatId: chat.id,
              role: 'system',
              content: `Ошибка выполнения: ${run.last_error.message}`,
              metadata: {
                type: 'error',
                runId: run.id,
                errorCode: run.last_error.code,
                status: run.status
              }
            }
          });
        }
        break;
      } else if (run.status === 'requires_action') {
        console.log(`⚠️ [AI] Run требует действий для ${chat.chatType}`);
        // TODO: Обработка function calling если нужно
        break;
      }
      
      // Ждем 2 секунды перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      if (attempts % 5 === 0) {
        console.log(`⏳ [AI] Ожидание ответа от ${chat.chatType}... (${attempts * 2}с)`);
      }
    }

    if (attempts >= maxAttempts) {
      console.warn(`⚠️ [AI] Превышено время ожидания для ${chat.chatType}`);
    }

    // Сохраняем начальное сообщение пользователя в БД
    await prisma.productAiMessage.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: messageContent,
        metadata: {
          type: 'initial_message',
          productData,
          weeklyBudget,
          runId: run.id
        }
      }
    });

    console.log(`✅ [AI] Обработка сообщения для ${chat.chatType} завершена`);

  } catch (error) {
    console.error(`❌ [AI] Ошибка отправки сообщения для ${chat.chatType}:`, error);
  }
}
