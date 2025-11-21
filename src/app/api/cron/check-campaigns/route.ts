// Cron Job для автоматической проверки рекламных кампаний через AI
// Вызывается каждые 3 часа через оркестратор
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/check-campaigns
 * Автоматическая проверка рекламных кампаний через AI чаты
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации cron запроса
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isOrchestrator = request.headers.get('x-orchestrator') === 'true';
    const isKeepAlive = request.headers.get('x-keep-alive') === 'true';
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized = isVercelCron || isOrchestrator || isKeepAlive || (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized) {
      console.warn('⚠️ [Check Campaigns Cron] Неавторизованный запрос');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🤖 [Check Campaigns Cron] Начало автоматической проверки кампаний: ${new Date().toISOString()}`);

    const results = {
      checked: 0,
      optimized: 0,
      errors: 0,
      skipped: 0,
      details: [] as any[]
    };

    // 1. Получаем все активные AI чаты продвижения
    // ВРЕМЕННО ОТКЛЮЧЕНО - модели не готовы
    /*
    const activePromotionChats = await prisma.productAiChat.findMany({
      where: {
        chatType: 'promotion',
        status: 'ACTIVE'
      },
      include: {
        product: {
          include: {
            analytics: true,
            productCabinets: {
              where: { isSelected: true },
              include: { cabinet: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Последние 5 сообщений для контекста
        }
      }
    });
    */

    // ВРЕМЕННО: заглушка для тестирования
    const activePromotionChats: any[] = [];

    console.log(`📊 [Check Campaigns Cron] Найдено ${activePromotionChats.length} активных AI чатов продвижения`);

    // 2. Обрабатываем каждый чат
    for (const chat of activePromotionChats) {
      try {
        results.checked++;

        const product = chat.product;
        const cabinet = product.productCabinets[0]?.cabinet;

        if (!cabinet || !cabinet.apiToken) {
          console.warn(`⚠️ [Check Campaigns Cron] Кабинет не настроен для товара ${product.name}`);
          results.skipped++;
          results.details.push({
            chatId: chat.id,
            productId: product.id,
            reason: 'cabinet_not_configured'
          });
          continue;
        }

        console.log(`🔍 [Check Campaigns Cron] Анализируем товар: ${product.name} (ID: ${product.id})`);

        // 3. Получаем данные кампаний для товара
        const campaignData = await getProductCampaigns(cabinet.apiToken, product.wbNmId);

        if (!campaignData || campaignData.campaigns.length === 0) {
          console.log(`ℹ️ [Check Campaigns Cron] Нет активных кампаний для товара ${product.name}`);
          results.skipped++;
          results.details.push({
            chatId: chat.id,
            productId: product.id,
            reason: 'no_active_campaigns'
          });
          continue;
        }

        // 4. Получаем статистику кампаний за последние 7 дней
        const statsData = await getCampaignStats(cabinet.apiToken, campaignData.campaignIds, 7);

        // 5. Формируем анализ для AI
        const analysisPrompt = createAnalysisPrompt(product, campaignData, statsData, chat);

        // 6. Отправляем запрос к AI
        // ВРЕМЕННО ОТКЛЮЧЕНО
        // const aiResponse = await sendToAI(chat.aiThreadId, chat.aiAssistantId, analysisPrompt);

        // 7. Парсим рекомендации и применяем изменения
        // ВРЕМЕННО ОТКЛЮЧЕНО
        // const appliedChanges = await applyAIRecommendations(cabinet.apiToken, aiResponse, campaignData);

        // 8. Сохраняем в истории чата
        // ВРЕМЕННО ОТКЛЮЧЕНО
        /*
        await saveChatMessage(chat.id, 'user', `Автоматический анализ кампаний (${new Date().toLocaleString('ru-RU')})`, {
          type: 'auto_analysis',
          campaignData,
          statsData
        });

        await saveChatMessage(chat.id, 'assistant', aiResponse, {
          type: 'auto_response',
          appliedChanges
        });
        */

        results.optimized++;
        results.details.push({
          chatId: chat.id,
          productId: product.id,
          productName: product.name,
          campaignsAnalyzed: campaignData.campaigns.length,
          changesApplied: 0, // appliedChanges.length,
          aiResponseLength: 0 // aiResponse.length
        });

        console.log(`✅ [Check Campaigns Cron] Оптимизирован товар: ${product.name} (0 изменений)`);

        // Задержка между обработкой товаров (уважаем rate limits)
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error: any) {
        console.error(`❌ [Check Campaigns Cron] Ошибка обработки чата ${chat.id}:`, error);
        results.errors++;
        results.details.push({
          chatId: chat.id,
          productId: chat.product.id,
          error: error.message,
          stack: error.stack?.substring(0, 200)
        });
      }
    }

    console.log(`✅ [Check Campaigns Cron] Завершено: проверено ${results.checked}, оптимизировано ${results.optimized}, ошибок ${results.errors}, пропущено ${results.skipped}`);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Check Campaigns Cron] Критическая ошибка:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка проверки кампаний' },
      { status: 500 }
    );
  }
}

/**
 * Получает кампании для товара
 */
async function getProductCampaigns(apiToken: string, wbNmId: string | null) {
  if (!wbNmId) return { campaigns: [], campaignIds: [] };

  const baseUrl = 'https://advert-api.wildberries.ru';

  try {
    // Получаем все кампании
    const countResponse = await fetch(`${baseUrl}/adv/v0/count`, {
      headers: { 'Authorization': apiToken }
    });

    if (!countResponse.ok) return { campaigns: [], campaignIds: [] };

    const countData = await countResponse.json();

    // Фильтруем кампании типа 9 (ручная ставка) - они могут быть связаны с товаром
    const campaignIds = countData.adverts
      ?.filter((adv: any) => adv.type === 9)
      .map((adv: any) => adv.advertId) || [];

    if (campaignIds.length === 0) return { campaigns: [], campaignIds: [] };

    // Получаем детали кампаний
    const idsParam = campaignIds.join(',');
    const campaignsResponse = await fetch(
      `${baseUrl}/adv/v0/auction/adverts?ids=${idsParam}&statuses=9`, // Только активные
      { headers: { 'Authorization': apiToken } }
    );

    if (!campaignsResponse.ok) return { campaigns: [], campaignIds: [] };

    const campaigns = await campaignsResponse.json();

    return {
      campaigns: campaigns || [],
      campaignIds
    };

  } catch (error) {
    console.error('Ошибка получения кампаний:', error);
    return { campaigns: [], campaignIds: [] };
  }
}

/**
 * Получает статистику кампаний
 */
async function getCampaignStats(apiToken: string, campaignIds: number[], days: number) {
  if (campaignIds.length === 0) return [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const baseUrl = 'https://advert-api.wildberries.ru';
  const idsParam = campaignIds.join(',');

  const response = await fetch(
    `${baseUrl}/adv/v3/fullstats?from=${startDateStr}&to=${endDateStr}&ids=${idsParam}`,
    { headers: { 'Authorization': apiToken } }
  );

  if (!response.ok) return [];

  return await response.json();
}

/**
 * Создает промпт для анализа кампаний
 */
function createAnalysisPrompt(product: any, campaignData: any, statsData: any, chat: any) {
  const campaignStats = campaignData.campaigns.map((campaign: any) => {
    const stats = statsData.find((s: any) => s.advertId === campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      dailyBudget: campaign.dailyBudget,
      currentBid: campaign.params?.bid || 0,
      stats: stats ? {
        views: stats.views || 0,
        clicks: stats.clicks || 0,
        ctr: stats.ctr || 0,
        cpc: stats.cpc || 0,
        spend: stats.sum || 0,
        orders: stats.orders || 0,
        cr: stats.cr || 0
      } : null
    };
  });

  return `
🎯 АНАЛИЗ ПРОДВИЖЕНИЯ ТОВАРА

ТОВАР: ${product.name}
WB ID: ${product.wbNmId}

КОНВЕРСИЯ ТОВАРА:
- Просмотры: ${product.analytics?.views || 0}
- Заказы: ${product.analytics?.orders || 0}
- CTR: ${product.analytics?.ctr || 0}%
- Конверсия: ${product.analytics?.conversionRate || 0}%

АКТИВНЫЕ КАМПАНИИ:
${JSON.stringify(campaignStats, null, 2)}

ИСТОРИЯ ПРЕДЫДУЩИХ РЕШЕНИЙ:
${chat.messages.slice(0, 3).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n')}

ЗАДАЧА:
1. Проанализируй эффективность каждой кампании
2. Определи проблемы (низкий CTR, высокая цена клика, низкая конверсия)
3. Предложи конкретные изменения ставок, бюджета, ключевых слов
4. Учти общий бюджет: ${chat.dailyBudget}₽/день, ${chat.weeklyBudget}₽/неделя
5. Дай четкие рекомендации в формате JSON

ФОРМАТ ОТВЕТА:
{
  "analysis": "краткий анализ ситуации",
  "recommendations": [
    {
      "campaignId": 123,
      "action": "increase_bid|decrease_bid|add_keywords|pause_campaign",
      "reason": "причина изменения",
      "value": "новое значение ставки или ключевые слова",
      "expectedImpact": "ожидаемый эффект"
    }
  ]
}
  `.trim();
}

/**
 * Отправляет запрос к OpenAI Assistant
 * ВРЕМЕННО ОТКЛЮЧЕНО
 */
/*
async function sendToAI(threadId: string | null, assistantId: string, prompt: string): Promise<string> {
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
      where: { aiThreadId: null },
      data: { aiThreadId: actualThreadId }
    });
  }

  // Отправляем сообщение
  await openai.beta.threads.messages.create(actualThreadId, {
    role: 'user',
    content: prompt
  });

  // Запускаем assistant
  const run = await openai.beta.threads.runs.create(actualThreadId, {
    assistant_id: assistantId
  });

  // Ждем завершения
  let runStatus;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(actualThreadId, run.id.toString());
  } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

  if (runStatus.status === 'failed') {
    throw new Error(`AI анализ失败: ${runStatus.last_error?.message}`);
  }

  // Получаем ответ
  const messages = await openai.beta.threads.messages.list(actualThreadId, { order: 'desc', limit: 1 });
  const message = messages.data[0];

  if (!message?.content[0] || message.content[0].type !== 'text') {
    throw new Error('Не удалось получить ответ от AI');
  }

  return message.content[0].text.value;
}
*/

/**
 * Сохраняет сообщение в истории чата
 * ВРЕМЕННО ОТКЛЮЧЕНО
 */
/*
async function saveChatMessage(chatId: string, role: string, content: string, metadata?: any) {
  await prisma.productAiMessage.create({
    data: {
      chatId,
      role,
      content,
      metadata
    }
  });
}
*/

/**
 * Применяет рекомендации AI
 */
async function applyAIRecommendations(apiToken: string, aiResponse: string, campaignData: any): Promise<any[]> {
  try {
    // Парсим JSON из ответа AI
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const recommendations = JSON.parse(jsonMatch[0]);
    if (!recommendations.recommendations) return [];

    const appliedChanges = [];
    const baseUrl = 'https://advert-api.wildberries.ru';

    for (const rec of recommendations.recommendations) {
      try {
        const campaign = campaignData.campaigns.find((c: any) => c.id === rec.campaignId);
        if (!campaign) continue;

        switch (rec.action) {
          case 'increase_bid':
            const newBid = Math.min((campaign.params?.bid || 0) * 1.1, 1000); // +10%, макс 1000₽
            await updateCampaignBid(apiToken, rec.campaignId, newBid);
            appliedChanges.push({ campaignId: rec.campaignId, action: 'increase_bid', newBid });
            break;

          case 'decrease_bid':
            const lowerBid = Math.max((campaign.params?.bid || 0) * 0.9, 0.1); // -10%, мин 0.1₽
            await updateCampaignBid(apiToken, rec.campaignId, lowerBid);
            appliedChanges.push({ campaignId: rec.campaignId, action: 'decrease_bid', newBid: lowerBid });
            break;

          case 'pause_campaign':
            await pauseCampaign(apiToken, rec.campaignId);
            appliedChanges.push({ campaignId: rec.campaignId, action: 'pause_campaign' });
            break;
        }

        // Задержка между изменениями
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Ошибка применения рекомендации для кампании ${rec.campaignId}:`, error);
      }
    }

    return appliedChanges;

  } catch (error) {
    console.error('Ошибка парсинга рекомендаций AI:', error);
    return [];
  }
}

/**
 * Обновляет ставку кампании
 */
async function updateCampaignBid(apiToken: string, campaignId: number, newBid: number) {
  const baseUrl = 'https://advert-api.wildberries.ru';

  const response = await fetch(`${baseUrl}/adv/v0/auction/${campaignId}/bid`, {
    method: 'PATCH',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bid: Math.round(newBid * 100) / 100 }) // Округляем до копеек
  });

  if (!response.ok) {
    throw new Error(`Не удалось обновить ставку: ${response.status}`);
  }
}

/**
 * Приостанавливает кампанию
 */
async function pauseCampaign(apiToken: string, campaignId: number) {
  const baseUrl = 'https://advert-api.wildberries.ru';

  const response = await fetch(`${baseUrl}/adv/v0/auction/${campaignId}/pause`, {
    method: 'PATCH',
    headers: { 'Authorization': apiToken }
  });

  if (!response.ok) {
    throw new Error(`Не удалось приостановить кампанию: ${response.status}`);
  }
}
