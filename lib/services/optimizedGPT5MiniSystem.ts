// lib/services/optimizedGPT5MiniSystem.ts - ОПТИМИЗИРОВАННАЯ СИСТЕМА С GPT-5-MINI И GPT-4.1

import OpenAI from 'openai';

// Конфигурация доступных моделей из вашего проекта
export const AVAILABLE_MODELS = {
  // Основные рабочие модели
  GPT5_MINI: 'gpt-5-mini',           // Основная модель для исследования (83% дешевле GPT-5)
  GPT5_MINI_DATED: 'gpt-5-mini-2025-08-07', // Версия с датой (резервная)
  GPT4_1: 'gpt-4.1',                 // Для характеристик и SEO
  
  // Дополнительные модели (если понадобятся)
  GPT5_NANO: 'gpt-5-nano',           // Самая экономичная
  GPT5_NANO_DATED: 'gpt-5-nano-2025-08-07',
  GPT5_FULL: 'gpt-5',                // Полная версия (дорогая)
  GPT5_DATED: 'gpt-5-2025-08-07',
  GPT5_CHAT: 'gpt-5-chat-latest',    // Для диалогов
  
  // Модель для изображений
  DALL_E: 'dall-e-2',                // Генерация изображений
  
  // Аудио модель
  GPT4O_AUDIO: 'gpt-4o-mini-audio-preview' // Аудио превью
};

// Стоимость использования (за 1M токенов)
const MODEL_PRICING = {
  'gpt-5-mini': { input: 0.25, output: 2.00 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-5-nano': { input: 0.05, output: 0.40 },
  'gpt-5': { input: 1.25, output: 10.00 }
};

// Возможности моделей
const MODEL_CAPABILITIES = {
  'gpt-5-mini': {
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    supportsJsonMode: true,
    supportsImages: true,
    supportsFunctionCalling: true,
    bestFor: 'Исследование товаров, поиск информации, анализ изображений'
  },
  'gpt-4.1': {
    maxInputTokens: 1000000, // 1 миллион токенов!
    maxOutputTokens: 32000,
    supportsJsonMode: true,
    supportsImages: true,
    supportsFunctionCalling: true,
    bestFor: 'Детальный анализ характеристик, SEO оптимизация, работа с большими данными'
  }
};

interface AgentContext {
  productId: string;

  productName: string;
  categoryId: number;
  categoryInfo: {
    id: number;
    name: string;
    parentName: string;
    characteristics: any[];
  };
  images: string[];
  referenceUrl?: string;
  price: number;
  dimensions: any;
packageContents?: string;
  userComments?: string;
  additionalData?: any;
}

interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  confidence: number;
  processingTime: number;
  tokensUsed?: number;
  modelUsed?: string;
  cost?: number;
}

interface WorkflowResult {
  phase1: AgentResult; // GPT-5-mini: Исследование
  phase2: AgentResult; // GPT-4.1: Характеристики
  phase3: AgentResult; // GPT-4.1: SEO
  finalResult: any;
  totalTime: number;
  totalCost: number;
  confidence: number;
}

export class OptimizedGPT5MiniSystem {
  private openai: OpenAI;
  private maxRetries = 3;
  private timeout = 120000;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY не найден в переменных окружения');
    }

    this.openai = new OpenAI({ apiKey });
    
    console.log('🚀 Инициализация системы с GPT-5-mini и GPT-4.1');
    console.log(`📊 GPT-5-mini: ${MODEL_CAPABILITIES['gpt-5-mini'].maxInputTokens} токенов, $${MODEL_PRICING['gpt-5-mini'].input}/$${MODEL_PRICING['gpt-5-mini'].output} за 1M`);
    console.log(`📊 GPT-4.1: ${MODEL_CAPABILITIES['gpt-4.1'].maxInputTokens} токенов, $${MODEL_PRICING['gpt-4.1'].input}/$${MODEL_PRICING['gpt-4.1'].output} за 1M`);
  }

  /**
   * ГЛАВНАЯ ФУНКЦИЯ - полный анализ товара с 2 моделями
   */
  async analyzeProduct(context: AgentContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    console.log(`\n🎯 АНАЛИЗ ТОВАРА: ${context.productName}`);
    console.log(`📂 Категория: ${context.categoryInfo.name} (ID: ${context.categoryId})`);
    console.log(`💰 Цена: ${context.price}₽`);
    console.log(`🖼️ Изображений: ${context.images.length}`);
    console.log(`🔗 Референс: ${context.referenceUrl ? 'ДА' : 'НЕТ'}`);

    try {
      // ФАЗА 1: GPT-5-mini - Исследование и поиск
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 ФАЗА 1: GPT-5-mini - Исследование товара');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const phase1Result = await this.runPhase1_GPT5MiniResearch(context);
      
      if (!phase1Result.success) {
        throw new Error(`Фаза 1 failed: ${phase1Result.error}`);
      }

      // ФАЗА 2: GPT-4.1 - Анализ характеристик
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 ФАЗА 2: GPT-4.1 - Анализ характеристик');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const phase2Result = await this.runPhase2_GPT41Characteristics(context, phase1Result.data);
      
      if (!phase2Result.success) {
        throw new Error(`Фаза 2 failed: ${phase2Result.error}`);
      }

      // ФАЗА 3: GPT-4.1 - SEO оптимизация
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✍️ ФАЗА 3: GPT-4.1 - SEO оптимизация');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const phase3Result = await this.runPhase3_GPT41SEO(context, phase1Result.data, phase2Result.data);
      
      if (!phase3Result.success) {
        throw new Error(`Фаза 3 failed: ${phase3Result.error}`);
      }

      // Расчет общих метрик
      const totalTime = Date.now() - startTime;
      const totalCost = this.calculateTotalCost([phase1Result, phase2Result, phase3Result]);
      const avgConfidence = (phase1Result.confidence + phase2Result.confidence + phase3Result.confidence) / 3;

      // Формирование финального результата
      const finalResult = this.mergeFinalResults(phase1Result.data, phase2Result.data, phase3Result.data);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ АНАЛИЗ ЗАВЕРШЕН');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`⏱️ Общее время: ${totalTime}мс`);
      console.log(`💵 Общая стоимость: $${totalCost.toFixed(4)}`);
      console.log(`📊 Характеристик заполнено: ${finalResult.characteristics?.length || 0}`);
      console.log(`🎯 Средняя уверенность: ${Math.round(avgConfidence * 100)}%`);

      return {
        phase1: phase1Result,
        phase2: phase2Result,
        phase3: phase3Result,
        finalResult,
        totalTime,
        totalCost,
        confidence: avgConfidence
      };

    } catch (error) {
      console.error('❌ Ошибка системы:', error);
      throw error;
    }
  }

  /**
   * ФАЗА 1: GPT-5-mini - Исследование товара
   */
  private async runPhase1_GPT5MiniResearch(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const model = AVAILABLE_MODELS.GPT5_MINI;
    
    try {
      console.log(`🤖 Используется модель: ${model}`);
      
      const prompt = this.createGPT5MiniResearchPrompt(context);
      const messages = await this.prepareMessagesWithImages(prompt, context.images);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: 1, // Низкая для точности
         max_completion_tokens: 8000,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('Пустой ответ от GPT-5-mini');
      }

      const parsedResult = JSON.parse(result);
      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(model, response.usage);
      
      console.log(`✅ GPT-5-mini завершила исследование за ${processingTime}мс`);
      console.log(`📊 Токенов использовано: ${tokensUsed}`);
      console.log(`💵 Стоимость: $${cost.toFixed(4)}`);
      
      return {
        success: true,
        data: parsedResult,
        confidence: parsedResult.confidence || 0.9,
        processingTime,
        tokensUsed,
        modelUsed: model,
        cost
      };

    } catch (error) {
      console.error('❌ Ошибка GPT-5-mini:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: model,
        cost: 0
      };
    }
  }

  /**
   * ФАЗА 2: GPT-4.1 - Анализ характеристик
   */
  private async runPhase2_GPT41Characteristics(context: AgentContext, researchData: any): Promise<AgentResult> {
    const startTime = Date.now();
    const model = AVAILABLE_MODELS.GPT4_1;
    
    try {
      console.log(`🤖 Используется модель: ${model}`);
      
      const prompt = this.createGPT41CharacteristicsPrompt(context, researchData);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Очень низкая для точности
        max_completion_tokens: 12000,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('Пустой ответ от GPT-4.1');
      }

      const parsedResult = JSON.parse(result);
      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(model, response.usage);
      
      console.log(`✅ GPT-4.1 завершила анализ характеристик за ${processingTime}мс`);
      console.log(`📊 Характеристик создано: ${parsedResult.characteristics?.length || 0}`);
      console.log(`💵 Стоимость: $${cost.toFixed(4)}`);
      
      return {
        success: true,
        data: parsedResult,
        confidence: parsedResult.confidence || 0.85,
        processingTime,
        tokensUsed,
        modelUsed: model,
        cost
      };

    } catch (error) {
      console.error('❌ Ошибка GPT-4.1:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: model,
        cost: 0
      };
    }
  }

  /**
   * ФАЗА 3: GPT-4.1 - SEO оптимизация
   */
  private async runPhase3_GPT41SEO(context: AgentContext, researchData: any, characteristicsData: any): Promise<AgentResult> {
    const startTime = Date.now();
    const model = AVAILABLE_MODELS.GPT4_1;
    
    try {
      console.log(`🤖 Используется модель: ${model}`);
      
      const prompt = this.createGPT41SEOPrompt(context, researchData, characteristicsData);
      
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Немного креативности для SEO
        max_completion_tokens: 12000,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('Пустой ответ от GPT-4.1 SEO');
      }

      const parsedResult = JSON.parse(result);
      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(model, response.usage);
      
      console.log(`✅ GPT-4.1 завершила SEO оптимизацию за ${processingTime}мс`);
      console.log(`✍️ Заголовок: ${parsedResult.seoTitle?.length || 0} символов`);
      console.log(`📝 Описание: ${parsedResult.seoDescription?.length || 0} символов`);
      console.log(`💵 Стоимость: $${cost.toFixed(4)}`);
      
      return {
        success: true,
        data: parsedResult,
        confidence: parsedResult.confidence || 0.92,
        processingTime,
        tokensUsed,
        modelUsed: model,
        cost
      };

    } catch (error) {
      console.error('❌ Ошибка GPT-4.1 SEO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        confidence: 0,
        processingTime: Date.now() - startTime,
        modelUsed: model,
        cost: 0
      };
    }
  }

  /**
   * ПРОМПТ для GPT-5-mini: Исследование товара
   */
  private createGPT5MiniResearchPrompt(context: AgentContext): string {
    return `Вы — GPT-5-mini Исследователь товаров. Используйте свои расширенные возможности для глубокого анализа.

🎯 **ВАША МИССИЯ:** Провести МАКСИМАЛЬНО глубокое исследование товара используя все доступные данные.

📦 **ТОВАР ДЛЯ АНАЛИЗА:**
- **Название:** ${context.productName}
- **Категория:** ${context.categoryInfo.parentName} / ${context.categoryInfo.name}
- **Цена:** ${context.price}₽
- **Комплектация от пользователя:** ${context.packageContents}
${context.referenceUrl ? `- **Референсная ссылка:** ${context.referenceUrl}` : ''}
${context.userComments ? `- **Комментарии пользователя:** ${context.userComments}` : ''}

🔍 **ЗАДАЧИ ДЛЯ GPT-5-mini:**

1. **АНАЛИЗ ИЗОБРАЖЕНИЙ** (если есть):
   - Используйте vision capabilities для детального анализа
   - Найдите ВСЕ видимые характеристики, маркировки, тексты
   - Определите бренд, модель, материалы, цвета, особенности
   - Оцените качество и премиальность товара

2. **ИНТЕЛЛЕКТУАЛЬНЫЙ ПОИСК** (симулируйте веб-поиск):
   - Найдите информацию о "${context.productName}"
   - Изучите характеристики аналогичных товаров
   - Определите технические спецификации
   - Найдите отзывы и рейтинги
   - Изучите конкурентов и их предложения

3. **АНАЛИЗ РЕФЕРЕНСНОЙ ССЫЛКИ** (если указана):
${context.referenceUrl ? `   - Проанализируйте товар по ссылке: ${context.referenceUrl}
   - Извлеките ВСЕ характеристики
   - Скопируйте успешные SEO элементы
   - Найдите уникальные преимущества` : 
   '   - Референсная ссылка не указана'}

4. **MARKET INTELLIGENCE:**
   - Определите позиционирование товара на рынке
   - Найдите уникальные торговые предложения (УТП)
   - Оцените конкурентоспособность цены
   - Предложите маркетинговые углы

📤 **ФОРМАТ ОТВЕТА (строго JSON):**
{
  "productAnalysis": {
    "confirmedName": "точное название товара",
    "detectedBrand": "бренд",
    "detectedModel": "модель/артикул",
    "category": "уточненная категория",
    "targetAudience": "целевая аудитория",
    "priceSegment": "премиум/средний/эконом"
  },
  
  "imageFindings": {
    "brandVisible": true/false,
    "modelVisible": true/false,
    "materials": ["материал1", "материал2"],
    "colors": ["цвет1", "цвет2"],
    "features": ["особенность1", "особенность2"],
    "qualityIndicators": ["индикатор1", "индикатор2"],
    "technicalMarkings": ["маркировка1", "маркировка2"]
  },
  
  "webSearchResults": {
    "foundSources": [
      {
        "source": "название источника",
        "relevance": "высокая/средняя/низкая",
        "extractedData": {
          "specifications": {},
          "reviews": [],
          "ratings": 0
        }
      }
    ],
    "competitorPrices": {
      "min": 0,
      "max": 0,
      "average": 0
    },
    "marketTrends": ["тренд1", "тренд2"]
  },
  
  "technicalSpecifications": {
    "confirmed": {
      "ключ": "значение с единицами измерения"
    },
    "probable": {
      "ключ": "значение с единицами измерения"
    },
    "sourceReliability": "высокая/средняя/низкая"
  },
  
  "marketingInsights": {
    "uniqueSellingPoints": ["УТП1", "УТП2", "УТП3"],
    "competitiveAdvantages": ["преимущество1", "преимущество2"],
    "suggestedKeywords": ["ключевое слово1", "слово2"],
    "emotionalTriggers": ["триггер1", "триггер2"],
    "painPoints": ["боль1", "боль2"]
  },
  
  "recommendations": {
    "positioning": "рекомендации по позиционированию",
    "pricing": "рекомендации по цене",
    "improvements": ["улучшение1", "улучшение2"]
  },
  
  "confidence": 0.9,
  "dataCompleteness": "высокая/средняя/низкая",
  "researchQuality": "отличное/хорошее/удовлетворительное"
}

🚨 **КРИТИЧЕСКИ ВАЖНО для GPT-5-mini:**
✅ Используйте ВСЕ свои возможности: vision, reasoning, analysis
✅ Симулируйте веб-поиск через свои знания
✅ Будьте максимально точны в технических характеристиках
✅ НЕ придумывайте данные - основывайтесь на реальной информации
✅ Фокусируйтесь на качестве, а не количестве

🎯 **ЦЕЛЬ:** Собрать МАКСИМУМ достоверной информации для создания идеальной карточки товара!`;
  }

  /**
   * ПРОМПТ для GPT-4.1: Характеристики
   */
  private createGPT41CharacteristicsPrompt(context: AgentContext, researchData: any): string {
    const characteristics = context.categoryInfo.characteristics;
    const filteredChars = this.filterNonGabaritCharacteristics(characteristics);
    
    return `Вы — GPT-4.1 Специалист по характеристикам. У вас есть доступ к 1M токенов контекста!

🎯 **ЗАДАЧА:** Заполнить МАКСИМУМ характеристик на основе исследования GPT-5-mini.

📊 **ДАННЫЕ ОТ GPT-5-mini:**
${JSON.stringify(researchData, null, 2)}

📦 **ТОВАР:**
- **Название:** ${context.productName}
- **Категория:** ${context.categoryInfo.name}
- **Цена:** ${context.price}₽

🔥 **ХАРАКТЕРИСТИКИ ДЛЯ ЗАПОЛНЕНИЯ (${filteredChars.length} шт):**

${filteredChars.map((char: any, i: number) => 
  `${i+1}. **${char.name}** (ID: ${char.id})
   Тип: ${char.type.toUpperCase()}
   ${char.isRequired ? '🚨 ОБЯЗАТЕЛЬНАЯ' : '📌 Опциональная'}
   ${char.values?.length > 0 ? `Варианты: ${char.values.slice(0, 3).map((v: any) => v.value).join(', ')}` : ''}`
).join('\n')}

📤 **ФОРМАТ ОТВЕТА (строго JSON):**
{
  "characteristics": [
    {
      "id": число,
      "name": "название характеристики",
      "value": "значение с правильной типизацией",
      "confidence": 0.9,
      "source": "откуда взято из данных GPT-5-mini",
      "reasoning": "логика выбора значения"
    }
  ],
  "fillStatistics": {
    "totalFilled": число,
    "requiredFilled": число,
    "optionalFilled": число,
    "fillRate": процент
  },
  "confidence": 0.85,
  "processingNotes": "заметки о процессе заполнения"
}

🚨 **ПРАВИЛА ТИПИЗАЦИИ для GPT-4.1:**
✅ STRING тип → строка С единицами измерения ("2 часа", "400 мАч")
✅ NUMBER тип → ТОЛЬКО число без единиц (2, 400)
✅ Используйте ВСЕ данные от GPT-5-mini
✅ НЕ заполняйте габаритные характеристики
✅ Приоритет обязательным характеристикам
✅ Минимум 70% заполнения

🎯 **ЦЕЛЬ:** Максимально точное заполнение характеристик!`;
  }

  /**
   * ПРОМПТ для GPT-4.1: SEO
   */
  private createGPT41SEOPrompt(context: AgentContext, researchData: any, characteristicsData: any): string {
    const categoryLimits = this.getCategoryLimits(context.categoryInfo.name);
    
    return `Вы — GPT-4.1 SEO Специалист. Создайте идеальный контент для Wildberries.

📊 **ДАННЫЕ ДЛЯ РАБОТЫ:**
- Исследование GPT-5-mini: ${JSON.stringify(researchData.marketingInsights, null, 2)}
- Заполненные характеристики: ${characteristicsData.characteristics?.length} шт
- НАЗВАНИЕ ТОВАРА МАКСИМУМ 60 СИМВОЛОВ
- ОПИСАНИЕ ТОВАРА МАКСИМУМ 2000 СИМВОЛОВ

📦 **ТОВАР:**
- **Название:** ${context.productName}
- **Категория:** ${context.categoryInfo.name}
- **Цена:** ${context.price}₽

⚠️ **ЛИМИТЫ WILDBERRIES:**
- Максимум   заголовка: ${categoryLimits.maxTitleLength} символов
- Минимум 1500 символов описания: ${categoryLimits.miniDescriptionLength} символов. Максимум  2000 символов  описания: ${categoryLimits.maxDescriptionLength} символов

📤 **ФОРМАТ ОТВЕТА (строго JSON):**
{
  "seoTitle": "SEO-оптимизированное название",
  "seoDescription": "SEO-оптимизированное описание",
  "bulletPoints": [
    "• Преимущество 1",
    "• Преимущество 2",
    "• Преимущество 3",
    "• Преимущество 4",
    "• Преимущество 5"
  ],
  "keywords": ["ключевое слово1", "слово2"],
  "searchTags": ["тег1", "тег2"],
  "emotionalHooks": ["крючок1", "крючок2"],
  "callToAction": "призыв к действию",
  "wbCompliance": {
    "titleLength": число,
    "descriptionLength": число,
    "isCompliant": true/false
  },
  "confidence": 0.92
}

🚨 **ТРЕБОВАНИЯ GPT-4.1 для SEO:**
✅ Используйте ВСЕ маркетинговые инсайты от GPT-5-mini
✅ Включите главные характеристики в заголовок
✅ Оптимизируйте под поисковые запросы WB
✅ Добавьте эмоциональные триггеры
✅ Соблюдайте лимиты символов
✅ Фокус на конверсию

🎯 **ЦЕЛЬ:** Создать контент, который продает!`;
  }

  /**
   * Подготовка сообщений с изображениями
   */
  private async prepareMessagesWithImages(prompt: string, images: string[]): Promise<any[]> {
    const messages = [];
    
    if (images && images.length > 0) {
      const imageContent = images.map(img => ({
        type: 'image_url',
        image_url: { url: img }
      }));
      
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageContent
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt
      });
    }
    
    return messages;
  }

  /**
   * Фильтрация габаритных характеристик
   */
  private filterNonGabaritCharacteristics(characteristics: any[]): any[] {
    const GABARIT_IDS = new Set([
      89008,  // Вес товара без упаковки (г)
      90630,  // Высота предмета
      90607,  // Ширина предмета  
      90608,  // Длина предмета
      90652,  // Глубина предмета
      90653,  // Объем предмета
      11002,  // Толщина
      90654,  // Площадь предмета
      90655,  // Периметр предмета
    ]);
    
    return characteristics.filter(char => !GABARIT_IDS.has(char.id));
  }

  /**
   * Получение лимитов категории
   */
  private getCategoryLimits(categoryName: string): any {
    // Стандартные лимиты WB
    const DEFAULT_LIMITS = {
      maxTitleLength: 60,
      maxDescriptionLength: 2000,
      miniDescriptionLength: 1500,
      maxBulletPoints: 5,
      maxKeywords: 50
    };
    
    // Специальные лимиты для категорий
    const CATEGORY_LIMITS: Record<string, any> = {
      'Наушники': {
        maxTitleLength: 60,
        maxDescriptionLength: 2000,
         miniDescriptionLength: 1500,
        maxBulletPoints: 5,
        maxKeywords: 50,
        requiredInTitle: ['бренд', 'модель', 'тип']
      },
      'Электроника': {
        maxTitleLength: 60,
        maxDescriptionLength: 2000,
         miniDescriptionLength: 1500,
        maxBulletPoints: 5,
        maxKeywords: 50,
        requiredInTitle: ['бренд', 'модель']
      }
    };
    
    return CATEGORY_LIMITS[categoryName] || DEFAULT_LIMITS;
  }

  /**
   * Расчет стоимости
   */
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;
    
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) return 0;
    
    const inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Расчет общей стоимости
   */
  private calculateTotalCost(results: AgentResult[]): number {
    return results.reduce((total, result) => total + (result.cost || 0), 0);
  }

  /**
   * Объединение финальных результатов
   */
  private mergeFinalResults(researchData: any, characteristicsData: any, seoData: any): any {
    return {
      // Основная информация о товаре
      productInfo: {
        name: researchData.productAnalysis?.confirmedName,
        brand: researchData.productAnalysis?.detectedBrand,
        model: researchData.productAnalysis?.detectedModel,
        category: researchData.productAnalysis?.category,
        priceSegment: researchData.productAnalysis?.priceSegment
      },
      
      // Характеристики
      characteristics: characteristicsData.characteristics || [],
      fillStatistics: characteristicsData.fillStatistics,
      
      // SEO контент
      seoTitle: seoData.seoTitle,
      seoDescription: seoData.seoDescription,
      bulletPoints: seoData.bulletPoints,
      keywords: seoData.keywords,
      searchTags: seoData.searchTags,
      
      // Маркетинг
      marketingInsights: {
        uniqueSellingPoints: researchData.marketingInsights?.uniqueSellingPoints,
        competitiveAdvantages: researchData.marketingInsights?.competitiveAdvantages,
        emotionalTriggers: seoData.emotionalHooks,
        callToAction: seoData.callToAction
      },
      
      // Метрики качества
      qualityMetrics: {
        researchConfidence: researchData.confidence,
        characteristicsConfidence: characteristicsData.confidence,
        seoConfidence: seoData.confidence,
        dataCompleteness: researchData.dataCompleteness,
        wbCompliance: seoData.wbCompliance
      },
      
      // Рекомендации
      recommendations: researchData.recommendations
    };
  }

  /**
   * ЭКСПЕРИМЕНТАЛЬНАЯ ФУНКЦИЯ: A/B тестирование моделей
   */
  async compareModels(context: AgentContext): Promise<{
    gpt5Mini: WorkflowResult;
    gpt5Nano: WorkflowResult;
    comparison: {
      costDifference: number;
      timeDifference: number;
      qualityDifference: number;
      recommendation: string;
    };
  }> {
    console.log('\n🔬 A/B ТЕСТИРОВАНИЕ: GPT-5-mini vs GPT-5-nano');
    
    // Запускаем анализ с GPT-5-mini
    const gpt5MiniResult = await this.analyzeProduct(context);
    
    // Меняем модель на GPT-5-nano для теста
    const originalModel = AVAILABLE_MODELS.GPT5_MINI;
    AVAILABLE_MODELS.GPT5_MINI = AVAILABLE_MODELS.GPT5_NANO;
    
    // Запускаем анализ с GPT-5-nano
    const gpt5NanoResult = await this.analyzeProduct(context);
    
    // Восстанавливаем оригинальную модель
    AVAILABLE_MODELS.GPT5_MINI = originalModel;
    
    // Сравнение результатов
    const comparison = {
      costDifference: gpt5MiniResult.totalCost - gpt5NanoResult.totalCost,
      timeDifference: gpt5MiniResult.totalTime - gpt5NanoResult.totalTime,
      qualityDifference: gpt5MiniResult.confidence - gpt5NanoResult.confidence,
      recommendation: ''
    };
    
    // Рекомендация
    if (comparison.qualityDifference > 0.1) {
      comparison.recommendation = 'GPT-5-mini рекомендуется для лучшего качества';
    } else if (comparison.costDifference > 0.001) {
      comparison.recommendation = 'GPT-5-nano рекомендуется для экономии';
    } else {
      comparison.recommendation = 'Модели показывают схожие результаты';
    }
    
    console.log('\n📊 РЕЗУЛЬТАТЫ СРАВНЕНИЯ:');
    console.log(`💵 Разница в стоимости: ${comparison.costDifference.toFixed(4)}`);
    console.log(`⏱️ Разница во времени: ${comparison.timeDifference}мс`);
    console.log(`🎯 Разница в качестве: ${(comparison.qualityDifference * 100).toFixed(1)}%`);
    console.log(`✅ Рекомендация: ${comparison.recommendation}`);
    
    return {
      gpt5Mini: gpt5MiniResult,
      gpt5Nano: gpt5NanoResult,
      comparison
    };
  }

  /**
   * Проверка доступности модели
   */
  async checkModelAvailability(modelName: string): Promise<boolean> {
    try {
      console.log(`🔍 Проверка доступности модели: ${modelName}`);
      
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: 'test' }],
        max_completion_tokens: 1,
        temperature: 0
      });
      
      console.log(`✅ Модель ${modelName} доступна`);
      return true;
      
    } catch (error: any) {
      console.warn(`❌ Модель ${modelName} недоступна: ${error.message}`);
      return false;
    }
  }

  /**
   * Инициализация и проверка всех моделей
   */
  async initializeAndValidate(): Promise<{
    available: string[];
    unavailable: string[];
    recommendations: string[];
  }> {
    console.log('\n🔍 ПРОВЕРКА ДОСТУПНОСТИ МОДЕЛЕЙ...');
    
    const available: string[] = [];
    const unavailable: string[] = [];
    const recommendations: string[] = [];
    
    // Проверяем основные модели
    const modelsToCheck = [
      AVAILABLE_MODELS.GPT5_MINI,
      AVAILABLE_MODELS.GPT5_MINI_DATED,
      AVAILABLE_MODELS.GPT4_1,
      AVAILABLE_MODELS.GPT5_NANO
    ];
    
    for (const model of modelsToCheck) {
      const isAvailable = await this.checkModelAvailability(model);
      if (isAvailable) {
        available.push(model);
      } else {
        unavailable.push(model);
      }
    }
    
    // Рекомендации
    if (available.includes(AVAILABLE_MODELS.GPT5_MINI)) {
      recommendations.push('✅ GPT-5-mini доступна - рекомендуется для исследования');
    } else if (available.includes(AVAILABLE_MODELS.GPT5_MINI_DATED)) {
      recommendations.push('✅ GPT-5-mini-2025-08-07 доступна как резервная');
    }
    
    if (available.includes(AVAILABLE_MODELS.GPT4_1)) {
      recommendations.push('✅ GPT-4.1 доступна - идеально для характеристик');
    } else {
      recommendations.push('⚠️ GPT-4.1 недоступна - используйте GPT-5-mini для всех фаз');
    }
    
    if (available.includes(AVAILABLE_MODELS.GPT5_NANO)) {
      recommendations.push('💡 GPT-5-nano доступна для экономии средств');
    }
    
    console.log('\n📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
    console.log(`✅ Доступно: ${available.join(', ')}`);
    console.log(`❌ Недоступно: ${unavailable.join(', ')}`);
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    recommendations.forEach(rec => console.log(rec));
    
    return { available, unavailable, recommendations };
  }

  /**
   * Получение статистики использования
   */
  getUsageStatistics(): {
    modelsUsed: string[];
    capabilities: any;
    pricing: any;
    recommendations: string[];
  } {
    return {
      modelsUsed: [AVAILABLE_MODELS.GPT5_MINI, AVAILABLE_MODELS.GPT4_1],
      capabilities: MODEL_CAPABILITIES,
      pricing: MODEL_PRICING,
      recommendations: [
        'Используйте GPT-5-mini для исследования (дешевле на 83%)',
        'GPT-4.1 идеальна для работы с большими данными (1M токенов)',
        'Для экономии можно попробовать GPT-5-nano',
        'Комбинация GPT-5-mini + GPT-4.1 оптимальна по цене/качеству'
      ]
    };
  }
}

// Экспорт системы
export const optimizedGPT5MiniSystem = new OptimizedGPT5MiniSystem();