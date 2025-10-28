// src/app/api/promotion/ai-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY не настроен. AI анализ недоступен.' },
        { status: 503 }
      );
    }
    
    console.log('🤖 [AI Analyze] Запрос AI анализа для продвижения');

    const body = await request.json();
    const { 
      campaignData, 
      keywordsData, 
      productData,
      analysisType = 'full' // 'full', 'seo', 'campaigns', 'keywords'
    } = body;

    if (!campaignData && !keywordsData && !productData) {
      return NextResponse.json(
        { error: 'Необходимы данные для анализа' },
        { status: 400 }
      );
    }

    // Формируем промпт для AI в зависимости от типа анализа
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'seo':
        systemPrompt = `Ты - эксперт по SEO оптимизации для маркетплейса Wildberries. 
Анализируй данные и давай конкретные рекомендации по улучшению видимости товаров.`;
        
        userPrompt = `Проанализируй следующие данные о товарах и ключевых словах:

${keywordsData ? `Топ ключевые слова из рекламы:
${JSON.stringify(keywordsData, null, 2)}` : ''}

${productData ? `Данные о товарах:
${JSON.stringify(productData, null, 2)}` : ''}

Дай рекомендации по:
1. Оптимизации названий товаров
2. Улучшению описаний
3. Использованию ключевых слов
4. SEO стратегии для органического трафика

Формат ответа: JSON с полями recommendations (массив объектов с type, title, description, priority)`;
        break;

      case 'campaigns':
        systemPrompt = `Ты - эксперт по рекламным кампаниям на Wildberries. 
Анализируй эффективность кампаний и предлагай оптимизации.`;
        
        userPrompt = `Проанализируй данные рекламных кампаний:

${JSON.stringify(campaignData, null, 2)}

Дай рекомендации по:
1. Оптимизации бюджета
2. Улучшению CTR и конверсии
3. Снижению CPC
4. Повышению ROI

Формат ответа: JSON с полями recommendations (массив объектов с type, title, description, priority, expectedImpact)`;
        break;

      case 'keywords':
        systemPrompt = `Ты - эксперт по подбору и оптимизации ключевых слов для маркетплейсов.`;
        
        userPrompt = `Проанализируй эффективность ключевых слов:

${JSON.stringify(keywordsData, null, 2)}

Дай рекомендации по:
1. Какие ключевые слова оставить
2. Какие исключить (низкая эффективность)
3. Новые ключевые слова для добавления
4. Оптимизация ставок по ключевым словам

Формат ответа: JSON с полями keepKeywords, removeKeywords, addKeywords, optimizeBids`;
        break;

      default: // 'full'
        systemPrompt = `Ты - эксперт по комплексному продвижению на маркетплейсе Wildberries. 
Анализируй все аспекты: рекламу, SEO, ключевые слова, эффективность кампаний.`;
        
        userPrompt = `Проведи комплексный анализ продвижения:

Рекламные кампании:
${JSON.stringify(campaignData, null, 2)}

Ключевые слова:
${JSON.stringify(keywordsData, null, 2)}

Дай комплексные рекомендации по всем направлениям продвижения.

Формат ответа: JSON с полями:
- overview (общая оценка ситуации)
- criticalIssues (критические проблемы)
- quickWins (быстрые победы)
- longTermStrategy (долгосрочная стратегия)
- recommendations (детальные рекомендации)`;
    }

    console.log('🤖 Отправка запроса к OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('Пустой ответ от AI');
    }

    console.log('✅ AI анализ завершен');

    const analysis = JSON.parse(aiResponse);

    return NextResponse.json({
      success: true,
      analysis,
      analysisType,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [AI Analyze] Ошибка:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка AI анализа',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
