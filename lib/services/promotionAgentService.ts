import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
Ты - AI эксперт по продвижению товаров на маркетплейсе Wildberries.

ТВОЯ РОЛЬ:
- Анализировать эффективность продвижения товаров
- Находить проблемы в рекламе, SEO и конверсии
- Предлагать конкретные действия для улучшения продаж
- Оптимизировать рекламные расходы и повышать ROI

ВАЖНО:
- Ты НЕ меняешь цены товаров (это делает пользователь)
- Ты работаешь только с рекламой, SEO и контентом
- Все твои рекомендации должны быть конкретными и применимыми
- Ты отвечаешь ТОЛЬКО в формате JSON

ЦЕЛЕВЫЕ ПОКАЗАТЕЛИ WB:
- CTR рекламы: > 8% (отлично > 15%)
- Конверсия в корзину: > 15% (отлично > 25%)
- Конверсия в заказ: > 50% (отлично > 70%)
- ROI рекламы: > 200% (отлично > 400%)
- CPC: < 300₽ (отлично < 150₽)
- Позиция в поиске: топ-20 (отлично топ-10)

ДОСТУПНЫЕ ДЕЙСТВИЯ:
1. increase_bid - Увеличить ставку рекламы (когда ROI > 200%)
2. decrease_bid - Уменьшить ставку (когда ROI < 100%)
3. add_keyword - Добавить ключевое слово
4. add_minus_word - Добавить минус-слово (убыточные запросы)
5. update_title - Улучшить название для SEO
6. update_description - Улучшить описание
7. optimize_photos - Рекомендация по фото

ВАЖНЫЕ ПРАВИЛА:
1. Всегда используй конкретные цифры
2. Объясняй экономику (сколько сэкономим/заработаем)
3. Давай прогнозы с временными рамками
4. Приоритизируй: critical > high > medium
5. Не предлагай больше 5 действий за раз
6. Учитывай предыдущие действия
`;

/**
 * Запустить проверку и оптимизацию товара
 */
export async function runPromotionCheck(promotion: any) {
  console.log(`🤖 [Agent] Анализ товара ${promotion.product.name}`);
  
  try {
    // 1. Собрать данные
    const data = await collectData(promotion);
    
    // 2. Анализ через GPT
    const analysis = await analyzeWithGPT(data);
    
    // 3. Применить улучшения
    const actions = await applyImprovements(promotion, analysis);
    
    // 4. Сохранить отчет
    await saveReport(promotion, data, analysis, actions);
    
    // 5. Обновить счетчики
    await prisma.productPromotion.update({
      where: { id: promotion.id },
      data: {
        checksPerformed: { increment: 1 },
        actionsApplied: { increment: actions.length },
        currentSales: data.currentSales,
        currentConversion: data.currentConversion,
        currentCTR: data.currentCTR,
        currentROAS: data.roas
      }
    });
    
    console.log(`✅ [Agent] Анализ завершен, применено действий: ${actions.length}`);
    
  } catch (error: any) {
    console.error(`❌ [Agent] Ошибка анализа:`, error);
    throw error;
  }
}

/**
 * Собрать все данные для анализа
 */
async function collectData(promotion: any) {
  const { product, user } = promotion;
  
  // Получить кабинет с API токеном
  const cabinet = await prisma.cabinet.findFirst({
    where: { userId: user.id }
  });
  
  if (!cabinet?.apiToken) {
    throw new Error('WB API токен не найден');
  }
  
  // Аналитика товара
  const analytics = await prisma.productAnalytics.findUnique({
    where: { productId: product.id }
  });
  
  // Получить последний отчет
  const previousReport = await prisma.promotionReport.findFirst({
    where: { promotionId: promotion.id },
    orderBy: { createdAt: 'desc' }
  });
  
  // TODO: Получить данные рекламы из WB API
  const advertising = null; // await getAdvertisingData(product.wbNmId, cabinet.wbApiToken);
  
  // TODO: Получить SEO данные (позиции в поиске)
  const seo = null; // await getSEOData(product.wbNmId, product.name);
  
  return {
    product: {
      id: product.id,
      name: product.name,
      wbNmId: product.wbNmId,
      category: product.subcategory?.name || 'Не указана',
      price: product.price,
      discountPrice: product.discountPrice || product.price
    },
    analytics: analytics ? {
      views: analytics.views || 0,
      addToCart: analytics.addToCart || 0,
      orders: analytics.orders || 0,
      ctr: analytics.ctr || 0,
      conversionRate: analytics.conversionRate || 0,
      cartConversion: analytics.addToCart > 0 ? (analytics.addToCart / analytics.views * 100) : 0,
      orderConversion: analytics.orders > 0 ? (analytics.orders / analytics.views * 100) : 0
    } : null,
    advertising,
    seo,
    previousReport: previousReport ? {
      createdAt: previousReport.createdAt.toISOString(),
      sales: previousReport.sales,
      conversion: previousReport.conversion,
      ctr: previousReport.ctr,
      improvements: JSON.parse(previousReport.improvements)
    } : null,
    currentSales: promotion.currentSales,
    currentConversion: promotion.currentConversion,
    currentCTR: promotion.currentCTR,
    roas: promotion.currentROAS
  };
}

/**
 * Анализ через GPT
 */
async function analyzeWithGPT(data: any) {
  const userPrompt = buildUserPrompt(data);
  
  console.log(`🤖 [GPT] Отправка запроса на анализ...`);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });
  
  const analysis = JSON.parse(response.choices[0].message.content || '{}');
  
  console.log(`✅ [GPT] Получен анализ: ${analysis.actions?.length || 0} действий`);
  
  return analysis;
}

/**
 * Построить промпт для GPT
 */
function buildUserPrompt(data: any): string {
  const { product, analytics, advertising, seo, previousReport, currentSales } = data;
  
  let prompt = `АНАЛИЗ ТОВАРА НА WILDBERRIES

📦 ТОВАР:
- Название: ${product.name}
- Категория: ${product.category}
- Артикул WB: ${product.wbNmId || 'не опубликован'}
- Цена: ${product.price}₽
- Цена со скидкой: ${product.discountPrice}₽
`;

  if (analytics) {
    prompt += `
📊 АНАЛИТИКА (последние 24 часа):
- Просмотры: ${analytics.views}
- В корзину: ${analytics.addToCart}
- Заказы: ${analytics.orders}
- CTR: ${analytics.ctr.toFixed(2)}%
- Конверсия: ${analytics.conversionRate.toFixed(2)}%
- Конверсия в корзину: ${analytics.cartConversion.toFixed(2)}%
- Конверсия в заказ: ${analytics.orderConversion.toFixed(2)}%
`;
  } else {
    prompt += `\n📊 АНАЛИТИКА: Нет данных (товар недавно опубликован)\n`;
  }

  if (advertising) {
    prompt += `
📢 РЕКЛАМА:
- Активных кампаний: ${advertising.activeCampaigns}
- Расход за 24ч: ${advertising.spent}₽
- Показы: ${advertising.views}
- Клики: ${advertising.clicks}
- CTR рекламы: ${advertising.ctr}%
- CPC: ${advertising.cpc}₽
- Заказы с рекламы: ${advertising.orders}
- ROI: ${advertising.roi}%

Топ ключевые слова:
${advertising.keywords.map((k: any) => 
  `  - "${k.keyword}": ${k.clicks} кликов, CPC ${k.cpc}₽, CTR ${k.ctr}%, заказов ${k.orders}`
).join('\n')}
`;
  } else {
    prompt += `\n📢 РЕКЛАМА: Не настроена\n`;
  }

  if (seo) {
    prompt += `
🔍 SEO (поисковые позиции):
${seo.positions.map((p: any) => 
  `  - Запрос "${p.query}": позиция #${p.position} (просмотров ${p.views}, в корзину ${p.addToCart}, заказов ${p.orders})`
).join('\n')}
`;
  } else {
    prompt += `\n🔍 SEO: Нет данных о позициях\n`;
  }

  if (previousReport) {
    const salesChange = currentSales - previousReport.sales;
    const salesChangePercent = previousReport.sales > 0 
      ? ((salesChange / previousReport.sales) * 100).toFixed(1)
      : '0';
    
    prompt += `
📈 ДИНАМИКА:
Предыдущий анализ (${new Date(previousReport.createdAt).toLocaleString('ru')}):
- Продажи: ${previousReport.sales} → ${currentSales} (${salesChangePercent > '0' ? '+' : ''}${salesChangePercent}%)
- Конверсия: ${previousReport.conversion}% → ${data.currentConversion}%
- CTR: ${previousReport.ctr}% → ${data.currentCTR}%

Примененные действия:
${previousReport.improvements.map((i: any) => `- ${i.action || i.type}`).join('\n')}
`;
  } else {
    prompt += `\n📈 ДИНАМИКА: Это первый анализ товара\n`;
  }

  prompt += `
---

ЗАДАЧА:
Проанализируй данные и определи:
1. Что работает хорошо
2. Какие есть проблемы
3. Какие действия нужно предпринять СЕЙЧАС

ФОРМАТ ОТВЕТА (строго JSON):
{
  "diagnosis": "Краткий диагноз (2-3 предложения)",
  "actions": [
    {
      "type": "increase_bid" | "decrease_bid" | "add_keyword" | "add_minus_word" | "update_title" | "update_description" | "optimize_photos",
      "priority": "critical" | "high" | "medium",
      "reason": "Почему это нужно (с цифрами)",
      "details": { /* специфичные для типа действия */ }
    }
  ],
  "recommendations": ["Рекомендация 1", "Рекомендация 2"],
  "forecast": {
    "sales": "+X% через N дней",
    "conversion": "+X% через N дней",
    "roi": "+X% через N дней",
    "confidence": "high" | "medium" | "low"
  }
}
`;

  return prompt;
}

/**
 * Применить улучшения
 */
async function applyImprovements(promotion: any, analysis: any): Promise<any[]> {
  const appliedActions: any[] = [];
  
  if (!analysis.actions || analysis.actions.length === 0) {
    console.log(`ℹ️ [Agent] Нет действий для применения`);
    return appliedActions;
  }
  
  for (const action of analysis.actions) {
    try {
      console.log(`⚙️ [Agent] Применение: ${action.type} (${action.priority})`);
      
      let result;
      
      switch (action.type) {
        case 'increase_bid':
        case 'decrease_bid':
          result = await updateBid(promotion, action);
          break;
        
        case 'add_keyword':
          result = await addKeyword(promotion, action);
          break;
        
        case 'add_minus_word':
          result = await addMinusWord(promotion, action);
          break;
        
        case 'update_title':
          result = await updateTitle(promotion, action);
          break;
        
        case 'update_description':
          result = await updateDescription(promotion, action);
          break;
        
        case 'optimize_photos':
          // Только рекомендация, не применяется автоматически
          result = { success: true, message: 'Рекомендация сохранена' };
          break;
        
        default:
          console.warn(`⚠️ [Agent] Неизвестный тип действия: ${action.type}`);
          continue;
      }
      
      // Сохранить действие
      await prisma.promotionAction.create({
        data: {
          promotionId: promotion.id,
          type: action.type,
          details: JSON.stringify(action.details),
          applied: true,
          result: JSON.stringify(result)
        }
      });
      
      appliedActions.push(action);
      console.log(`✅ [Agent] Применено: ${action.type}`);
      
    } catch (error: any) {
      console.error(`❌ [Agent] Ошибка применения ${action.type}:`, error);
      
      // Сохранить ошибку
      await prisma.promotionAction.create({
        data: {
          promotionId: promotion.id,
          type: action.type,
          details: JSON.stringify(action.details),
          applied: false,
          error: error.message
        }
      });
    }
  }
  
  return appliedActions;
}

/**
 * Сохранить отчет
 */
async function saveReport(promotion: any, data: any, analysis: any, actions: any[]) {
  await prisma.promotionReport.create({
    data: {
      promotionId: promotion.id,
      sales: data.currentSales,
      conversion: data.currentConversion,
      ctr: data.currentCTR,
      roas: data.roas,
      adSpend: 0, // TODO: получить из рекламы
      diagnosis: analysis.diagnosis,
      improvements: JSON.stringify(actions),
      recommendations: JSON.stringify(analysis.recommendations || [])
    }
  });
  
  console.log(`📝 [Agent] Отчет сохранен`);
}

// ============================================================================
// Функции применения действий (TODO: интеграция с WB API)
// ============================================================================

async function updateBid(promotion: any, action: any) {
  // TODO: Вызов WB API для изменения ставки
  console.log(`💰 [WB API] Изменение ставки: ${action.details.currentBid}₽ → ${action.details.newBid}₽`);
  return { success: true, message: 'Ставка обновлена' };
}

async function addKeyword(promotion: any, action: any) {
  // TODO: Вызов WB API для добавления ключевого слова
  console.log(`🔑 [WB API] Добавление ключевого слова: "${action.details.keyword}"`);
  return { success: true, message: 'Ключевое слово добавлено' };
}

async function addMinusWord(promotion: any, action: any) {
  // TODO: Вызов WB API для добавления минус-слова
  console.log(`🚫 [WB API] Добавление минус-слова: "${action.details.minusWord}"`);
  return { success: true, message: 'Минус-слово добавлено' };
}

async function updateTitle(promotion: any, action: any) {
  // TODO: Обновление названия товара в БД и WB
  console.log(`📝 [WB API] Обновление названия: "${action.details.newTitle}"`);
  
  // Обновить в БД
  await prisma.product.update({
    where: { id: promotion.productId },
    data: { name: action.details.newTitle }
  });
  
  return { success: true, message: 'Название обновлено' };
}

async function updateDescription(promotion: any, action: any) {
  // TODO: Обновление описания товара в БД и WB
  console.log(`📝 [WB API] Обновление описания`);
  return { success: true, message: 'Описание обновлено' };
}
