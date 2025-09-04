// lib/services/unifiedAISystem.ts - ИСПРАВЛЕННЫЕ ПРОМПТЫ

import OpenAI from 'openai';
import { prisma } from '../prisma';

// УВЕЛИЧЕННЫЕ ТАЙМАУТЫ
export const QUALITY_REQUIREMENTS = {
  CHARACTERISTICS_MIN_FILL_RATE: 60,
  SEO_DESCRIPTION_MIN_LENGTH: 1300,
  SEO_DESCRIPTION_MAX_LENGTH: 2000,
  SEO_TITLE_MAX_LENGTH: 60,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT: 180000, // 3 минуты
  AGENT_TIMEOUT: 240000 // 4 минуты
};

// Модели GPT-5 
const MODELS = {
  GPT5_MINI: 'gpt-5-mini',
  GPT5: 'gpt-5'
};

// Стоимость (за 1M токенов)
const PRICING = {
  'gpt-5-mini': { input: 0.25, output: 2.00, cachedInput: 0.025 },
  'gpt-5': { input: 1.25, output: 2.00, cachedInput: 0.025 }
};

interface ProductInput {
  productName: string;
  productImages: string[];
  categoryId: number;
  packageContents: string;
  referenceUrl?: string;
  price: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  hasVariantSizes?: boolean;
  variantSizes?: any[];
  aiPromptComment?: string;
  preserveUserData?: {
    preserveUserData: boolean;
    userProvidedPackageContents: string;
    userProvidedDimensions: any;
    specialInstructions: string;
  };
}

interface CategoryCharacteristic {
  id: number;
  wbCharacteristicId?: number;
  name: string;
  type: 'string' | 'number';
  isRequired: boolean;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  description?: string;
  values?: Array<{
    id: number;
    value: string;
    displayName: string;
  }>;
}

interface AgentResult {
  success: boolean;
  data: any;
  confidence: number;
  tokensUsed: number;
  cost: number;
  processingTime: number;
  error?: string;
}

interface FinalResult {
  characteristics: Array<{
    id: number;
    name: string;
    value: any;
    confidence: number;
    reasoning: string;
    detectedType: string;
    source: string;
  }>;
  seoTitle: string;
  seoDescription: string;
  qualityMetrics: {
    overallScore: number;
    fillRate: number;
    characteristicsFillRate: number;
    seoDescriptionLength: number;
    seoTitleLength: number;
    isQualityAcceptable: boolean;
    issues: string[];
    suggestions: string[];
  };
  analysisReport: {
    totalProcessingTime: number;
    totalCost: number;
    agent1Time: number;
    agent2Time: number;
    agent3Time: number;
    improvementAttempts: number;
    finalScore: number;
  };
  confidence: number;
  fillPercentage: number;
  warnings: string[];
  recommendations: string[];
}

export class UnifiedAISystem {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY не найден');
    }
    
    this.openai = new OpenAI({ 
      apiKey,
      timeout: QUALITY_REQUIREMENTS.REQUEST_TIMEOUT,
      maxRetries: 3,
    });
  }

  /**
   * МАКСИМАЛЬНО ПРОСТОЙ АГЕНТ 1 для GPT-5-mini
   */
 
  // НА ЭТОТ:
  private createAgent1Prompt(input: ProductInput): string {
    const hasReference = input.referenceUrl && input.referenceUrl.trim().length > 0;
    
    if (hasReference) {
      // С референсом - анализируем ссылку + фото
      return `АНАЛИЗИРУЙ товар по РЕФЕРЕНСНОЙ ССЫЛКЕ + фото: "${input.productName}"
  
  РЕФЕРЕНС: ${input.referenceUrl}
  
  ЗАДАЧИ:
  1. Перейди по ссылке и извлеки ВСЕ характеристики
  2. Дополни анализом загруженных фото
  3. Если данные противоречат - приоритет у ссылки
  
  ИЗВЛЕКИ: размеры, вес, материалы, цвета, техпараметры, комплектацию, страну, бренд
  
  JSON ответ:
  {
    "hasReferenceAnalysis": true,
    "referenceData": {
      "url": "${input.referenceUrl}",
      "characteristics": [
        {"name": "Размеры", "value": "точные с сайта", "source": "reference"}
      ]
    },
    "photoData": {
      "characteristics": [
        {"name": "что видно на фото", "value": "значение", "source": "photo"}
      ]
    },
    "finalCharacteristics": [
      {"name": "итоговое", "value": "приоритет референсу", "type": "string", "confidence": 0.95}
    ],
    "confidence": 0.95
  }`;
  
    } else {
      // Без референса - поиск в интернете + фото  
      return `НАЙДИ информацию о товаре "${input.productName}" в интернете + анализ фото.
  
  АКТИВНО ИЩИ В ИНТЕРНЕТЕ:
  - "${input.productName} характеристики"
  - "${input.productName} спецификация" 
  - "${input.productName} обзор параметры"
  
  ИЗВЛЕКИ: размеры, вес, материалы, цвета, техпараметры, комплектацию
  
  JSON ответ:
  {
    "hasReferenceAnalysis": false,
    "internetSearch": {
      "queries": ["использованные запросы"],
      "sources": ["найденные сайты"]
    },
    "photoData": {
      "characteristics": [{"name": "из фото", "value": "значение", "source": "photo"}]
    },
    "finalCharacteristics": [
      {"name": "характеристика", "value": "найденное значение", "type": "string", "confidence": 0.8}
    ],
    "confidence": 0.8
  }`;
    }
  }

  /**
   * ИСПРАВЛЕННЫЙ АГЕНТ 2: Заполнение характеристик с правильными ID
   */
/**
 * ИСПРАВЛЕННЫЙ АГЕНТ 2: Работает с данными от Агента 1 (с референсом или без)
 */
private createAgent2Prompt(
    input: ProductInput, 
    agent1Data: any, 
    characteristics: CategoryCharacteristic[]
  ): string {
    // Определяем были ли использованы референсные данные
    const hasReferenceData = agent1Data.hasReferenceAnalysis && agent1Data.referenceData;
    const finalCharacteristics = agent1Data.finalCharacteristics || [];
    
    // Исключаем ненужные характеристики
    const excludedWbIds = new Set([
      // Габариты и упаковка
      89008, 90630, 90607, 90608, 90652, 90653, 11002, 90654, 90655, 90673,
      // Цвет (определяется автоматически)  
      14177449,
      // Комплектация (защищена пользователем)
      14177441, 378533,
      // НДС/сертификаты/декларации
      14177472, 14177473, 14177474, 15001405, 15001135, 15001136, 15001137, 15001138,
      // Коды и классификаторы
      15001650, 15001706
    ]);
    
    const relevantChars = characteristics.filter(char => 
      !excludedWbIds.has(char.wbCharacteristicId || 0)
    );
    
    const minFillTarget = Math.ceil(relevantChars.length * 0.75); // Цель 75%
    
    return `Сопоставь найденные характеристики товара с характеристиками WB категории.
  
  ТОВАР: "${input.productName}" (${input.price}₽)
  
  ${hasReferenceData ? '📎 ДАННЫЕ С РЕФЕРЕНСНОЙ СТРАНИЦЫ:' : '🔍 ДАННЫЕ ИЗ ИНТЕРНЕТА И ФОТО:'}
  ${finalCharacteristics.length > 0 ? 
    finalCharacteristics.map((char: any, i: number) => 
      `${i+1}. ${char.name}: ${char.value} (источник: ${char.source || 'unknown'}, уверенность: ${char.confidence || 0.8})`
    ).join('\n') : 
    'Характеристики не найдены'
  }
  
  ${hasReferenceData ? `
  🎯 РЕФЕРЕНСНАЯ ССЫЛКА: ${agent1Data.referenceData.url}
  Качество данных с референса: ${agent1Data.referenceData.characteristics?.length || 0} характеристик
  ` : `
  🔍 ИСТОЧНИКИ ДАННЫХ: ${agent1Data.internetSearch ? 
    `Поиск в интернете (${agent1Data.internetSearch.queries?.length || 0} запросов)` : 
    'Анализ фото и базовые данные'
  }`}
  
  ХАРАКТЕРИСТИКИ WB КАТЕГОРИИ (ЦЕЛЬ: заполнить минимум ${minFillTarget} из ${relevantChars.length}):
  
  ОБЯЗАТЕЛЬНЫЕ (заполни ВСЕ):
  ${relevantChars.filter(c => c.isRequired).map((char, i) => 
    `${i+1}. ${char.name} (ID: ${char.id})
     - WB_ID: ${char.wbCharacteristicId}
     - Тип: ${char.type.toUpperCase()}
     - ${char.values?.length ? `Варианты: ${char.values.slice(0, 3).map(v => v.value).join(', ')}` : 'Свободный ввод'}`
  ).join('\n\n')}
  
  ДОПОЛНИТЕЛЬНЫЕ (заполни максимум):
  ${relevantChars.filter(c => !c.isRequired).slice(0, 20).map((char, i) => 
    `${i+1}. ${char.name} (ID: ${char.id}) - ${char.type.toUpperCase()}${
      char.values?.length ? ` [Варианты: ${char.values.slice(0, 2).map(v => v.value).join(', ')}]` : ''
    }`
  ).join('\n')}
  
  ПРАВИЛА СОПОСТАВЛЕНИЯ:
  1. ${hasReferenceData ? 'ИСПОЛЬЗУЙ ДАННЫЕ С РЕФЕРЕНСА как основной источник истины' : 'Используй ВСЕ найденные данные из интернета'}
  2. Сопоставляй по смыслу: "Габариты" → "Длина"/"Ширина"/"Высота", "Материал корпуса" → "Материал"
  3. ТОЧНАЯ ТИПИЗАЦИЯ:
     - STRING: текст с единицами ("Bluetooth 5.0", "пластик ABS", "красный глянцевый")
     - NUMBER: только число без текста (150, 25.5, 1200)
  4. Если нет точного соответствия - используй логику:
     - Цена ${input.price}₽ → определи сегмент и типичные материалы
     - Тип товара → стандартные характеристики категории
  5. НЕ ОСТАВЛЯЙ ПУСТЫМИ обязательные поля
  
  ПРИМЕРЫ СОПОСТАВЛЕНИЯ:
  - Найдено "Размеры: 15x10x5 см" → заполни "Длина": 15, "Ширина": 10, "Высота": 5  
  - Найдено "Вес: 300г" → заполни "Вес": 300
  - Найдено "Материал: пластик" → заполни "Основной материал": "пластик"
  
  JSON ОТВЕТ:
  {
    "characteristics": [
      {
        "id": ${relevantChars[0]?.id || 1},
        "name": "${relevantChars[0]?.name || 'Название'}",
        "value": "${hasReferenceData ? 'точное значение с референса' : 'найденное значение'}",
        "confidence": ${hasReferenceData ? '0.95' : '0.85'},
        "source": "${hasReferenceData ? 'reference_page' : 'internet_analysis'}"
      }
    ],
    "fillStatistics": {
      "totalFilled": число,
      "totalRequired": ${relevantChars.filter(c => c.isRequired).length},
      "requiredFilled": число,
      "totalAvailable": ${relevantChars.length},
      "fillRate": процент,
      "targetAchieved": true/false
    },
    "dataSource": {
      "hasReference": ${hasReferenceData},
      "referenceUrl": "${hasReferenceData ? agent1Data.referenceData?.url || '' : ''}",
      "sourceQuality": "${hasReferenceData ? 'high' : 'medium'}",
      "mappingMethod": "${hasReferenceData ? 'reference_based' : 'internet_analysis'}"
    },
    "confidence": ${hasReferenceData ? '0.95' : '0.85'}
  }
  
  ${hasReferenceData ? 
    `🎯 ПРИОРИТЕТ: Максимально используй данные с референсной страницы для заполнения ${minFillTarget}+ характеристик.` :
    `🔍 ЦЕЛЬ: Используй найденные в интернете данные для заполнения ${minFillTarget}+ характеристик.`
  }`;
  }
  
  /**
   * ИСПРАВЛЕННЫЙ АГЕНТ 3: Краткий SEO
   */
  private createAgent3Prompt(input: ProductInput, agent1Data: any, agent2Data: any): string {
    return `
Создай SEO контент для Wildberries.

ТОВАР: ${input.productName}


ЛИМИТЫ:
- Название: макс ${QUALITY_REQUIREMENTS.SEO_TITLE_MAX_LENGTH} символов
- Описание: ${QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MIN_LENGTH}-${QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MAX_LENGTH} символов

JSON ОТВЕТ:
{
  "seoTitle": "SEO название",
  "seoDescription": "SEO описание",
  "confidence": 0.0-1.0
}

ВАЖНО: Без воды, только суть.`.trim();
  }

  
  // НА:
  private async runAgent1_Research(input: ProductInput): Promise<AgentResult> {
    const startTime = Date.now();
    const hasReference = input.referenceUrl && input.referenceUrl.trim().length > 0;
    
    console.log(`🔍 АГЕНТ 1 (${hasReference ? 'с референсом' : 'поиск в интернете'}): "${input.productName}"`);
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      try {
        const prompt = this.createAgent1Prompt(input);
        
        let messages;
        if (input.productImages && input.productImages.length > 0) {
          messages = await this.prepareMessagesWithImages(prompt, input.productImages);
        } else {
          messages = [{ role: 'user', content: prompt }];
        }
        
        const response = await this.openai.chat.completions.create({
          model: MODELS.GPT5_MINI,
          messages,
          max_completion_tokens: hasReference ? 8000 : 6000, // Больше токенов для референса
          response_format: { type: "json_object" },
          temperature: 1
        });
  
        const result = response.choices[0]?.message?.content;
        if (!result) throw new Error('Пустой ответ от Агента 1');
  
        const parsedResult = JSON.parse(result);
        const processingTime = Date.now() - startTime;
        const cost = this.calculateCost(MODELS.GPT5_MINI, response.usage);
  
        const charCount = parsedResult.finalCharacteristics?.length || 0;
        console.log(`✅ Агент 1: ${charCount} характеристик${hasReference ? ' (с референса)' : ' (из интернета)'}`);
  
        return {
          success: true,
          data: parsedResult,
          confidence: parsedResult.confidence || (hasReference ? 0.95 : 0.85),
          tokensUsed: response.usage?.total_tokens || 0,
          cost,
          processingTime
        };
  
      } catch (error) {
        console.warn(`❌ Попытка ${attempt} не удалась:`, error);
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
  
    return {
      success: false,
      data: { finalCharacteristics: [], confidence: 0 },
      confidence: 0,
      tokensUsed: 0,
      cost: 0,
      processingTime: Date.now() - startTime,
      error: 'Агент 1 не смог найти данные'
    };
  }

  /**
   * АГЕНТ 2 с правильными характеристиками
   */
  private async runAgent2_Characteristics(
    input: ProductInput, 
    agent1Data: any, 
    characteristics: CategoryCharacteristic[]
  ): Promise<AgentResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      try {
        console.log(`📊 АГЕНТ 2: Попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES}`);
        console.log(`📋 Загружено ${characteristics.length} характеристик для категории ${input.categoryId}`);
        
        const prompt = this.createAgent2Prompt(input, agent1Data, characteristics);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        
        const response = await this.openai.chat.completions.create({
          model: MODELS.GPT5_MINI,
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 8000, // Уменьшено
          response_format: { type: "json_object" }
        }, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = response.choices[0]?.message?.content;
        if (!result) throw new Error('Пустой ответ от Агента 2');

        const parsedResult = JSON.parse(result);
        const processingTime = Date.now() - startTime;
        const cost = this.calculateCost(MODELS.GPT5_MINI, response.usage);

        console.log(`✅ Агент 2 завершен на попытке ${attempt}: ${parsedResult.characteristics?.length || 0} характеристик`);

        return {
          success: true,
          data: parsedResult,
          confidence: parsedResult.confidence || 0.85,
          tokensUsed: response.usage?.total_tokens || 0,
          cost,
          processingTime
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Ошибка Агента 2 на попытке ${attempt}:`, error);
        
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          const waitTime = Math.min(2000 * attempt, 10000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    return {
      success: false,
      data: null,
      confidence: 0,
      tokensUsed: 0,
      cost: 0,
      processingTime: Date.now() - startTime,
      error: `Агент 2 failed: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * АГЕНТ 3 с кратким SEO
   */
  private async runAgent3_SEO(
    input: ProductInput,
    agent1Data: any, 
    agent2Data: any
  ): Promise<AgentResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      try {
        console.log(`✍️ АГЕНТ 3: Попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES}`);
        
        const prompt = this.createAgent3Prompt(input, agent1Data, agent2Data);
        
        const controller = new AbortController();
        const timeout = 120000; // 2 минуты для SEO
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await this.openai.chat.completions.create({
          model: MODELS.GPT5_MINI,
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 3000, // Уменьшено для SEO
          response_format: { type: "json_object" }
        }, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = response.choices[0]?.message?.content;
        if (!result) {
          throw new Error(`Пустой ответ от Агента 3`);
        }

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch (parseError) {
          console.error(`❌ Ошибка парсинга JSON:`, parseError);
          console.error(`📄 Ответ:`, result);
          throw new Error(`Невалидный JSON от Агента 3: ${parseError}`);
        }
        
        const processingTime = Date.now() - startTime;
        const cost = this.calculateCost(MODELS.GPT5_MINI, response.usage);

        console.log(`✅ Агент 3 завершен на попытке ${attempt}: SEO контент создан`);

        return {
          success: true,
          data: parsedResult,
          confidence: parsedResult.confidence || 0.92,
          tokensUsed: response.usage?.total_tokens || 0,
          cost,
          processingTime
        };

      } catch (error) {
        lastError = error as Error;
        const isTimeout = error instanceof Error && 
          (error.message.includes('aborted') || error.message.includes('timeout'));
        
        if (isTimeout) {
          console.warn(`⏰ Таймаут на попытке ${attempt}`);
        } else {
          console.warn(`❌ Ошибка Агента 3 на попытке ${attempt}:`, error);
        }
        
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          const waitTime = Math.min(2000 * attempt, 15000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    return {
      success: false,
      data: null,
      confidence: 0,
      tokensUsed: 0,
      cost: 0,
      processingTime: Date.now() - startTime,
      error: `Агент 3 failed: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * ГЛАВНАЯ ФУНКЦИЯ
   */
  async analyzeProductComplete(input: ProductInput): Promise<FinalResult> {
    const startTime = Date.now();
    console.log(`\n🚀 ЗАПУСК 3-АГЕНТНОЙ СИСТЕМЫ: "${input.productName}"`);

    try {
      // Загружаем характеристики ПРАВИЛЬНОЙ категории
      console.log(`📋 Загружаем характеристики категории ID: ${input.categoryId}`);
      const categoryCharacteristics = await this.loadCategoryCharacteristics(input.categoryId);
      const filteredChars = this.filterCharacteristicsForAI(categoryCharacteristics);
      
      console.log(`📋 Категория ${input.categoryId}: ${categoryCharacteristics.length} → ${filteredChars.length} характеристик для ИИ`);

      // Последовательный запуск агентов
      const agent1Result = await this.runAgent1_Research(input);
      
      if (!agent1Result.success) {
        console.warn(`⚠️ Агент 1 не удался, создаем минимальные данные`);
        agent1Result.data = {
          productAnalysis: {
            confirmedName: input.productName,
            detectedBrand: "неизвестно",
            category: "неизвестно"
          },
          technicalSpecs: { confirmed: [], probable: [] },
          confidence: 0.5
        };
      }

      const agent2Result = await this.runAgent2_Characteristics(input, agent1Result.data, filteredChars);
      
      if (!agent2Result.success) {
        console.warn(`⚠️ Агент 2 не удался, создаем пустые характеристики`);
        agent2Result.data = {
          characteristics: [],
          fillStatistics: {
            totalFilled: 0,
            totalAvailable: filteredChars.length,
            fillRate: 0
          },
          confidence: 0.3
        };
      }

      const agent3Result = await this.runAgent3_SEO(input, agent1Result.data, agent2Result.data);
      
      if (!agent3Result.success) {
        console.warn(`⚠️ Агент 3 не удался, создаем базовый SEO`);
        agent3Result.data = {
          seoTitle: input.productName.substring(0, 60),
          seoDescription: `${input.productName}. Качественный товар по выгодной цене.`,
          confidence: 0.4
        };
      }

      // ИСПРАВЛЕНИЕ: Передаем ВСЕ характеристики категории (НЕ фильтрованные)
      const finalResult = this.mergeFinalResults(
        agent1Result,
        agent2Result, 
        agent3Result,
        categoryCharacteristics, // Передаем ВСЕ 42 характеристики, включая исключенные
        startTime
      );

      const hasFailures = !agent1Result.success || !agent2Result.success || !agent3Result.success;
      const statusMessage = hasFailures ? 'ЧАСТИЧНО ЗАВЕРШЕНА' : 'ПОЛНОСТЬЮ ЗАВЕРШЕНА';

      console.log(`\n✅ СИСТЕМА ${statusMessage}:`);
      console.log(`   Время: ${finalResult.analysisReport.totalProcessingTime}ms`);
      console.log(`   Стоимость: ${finalResult.analysisReport.totalCost.toFixed(4)}`);
      console.log(`   Характеристик: ${finalResult.qualityMetrics.fillRate}%`);

      return finalResult;

    } catch (error) {
      console.error('❌ Критическая ошибка системы:', error);
      
      return {
        characteristics: [],
        seoTitle: input.productName.substring(0, 60),
        seoDescription: `${input.productName}. Описание будет дополнено позже.`,
        qualityMetrics: {
          overallScore: 0,
          fillRate: 0,
          characteristicsFillRate: 0,
          seoDescriptionLength: 0,
          seoTitleLength: 0,
          isQualityAcceptable: false,
          issues: ['Системная ошибка анализа'],
          suggestions: ['Повторите попытку позже']
        },
        analysisReport: {
          totalProcessingTime: Date.now() - startTime,
          totalCost: 0,
          agent1Time: 0,
          agent2Time: 0,
          agent3Time: 0,
          improvementAttempts: 0,
          finalScore: 0
        },
        confidence: 0.1,
        fillPercentage: 0,
        warnings: [`Системная ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`],
        recommendations: ['Обратитесь в поддержку']
      };
    }
  }

  /**
   * Подготовка сообщений с изображениями
   */
  private async prepareMessagesWithImages(prompt: string, images: string[]): Promise<any[]> {
    if (images && images.length > 0) {
      return [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      }];
    }
    
    return [{ role: 'user', content: prompt }];
  }

  /**
   * ИСПРАВЛЕНО: Фильтрация характеристик по wbCharacteristicId (не внутренним ID)
   */
  private filterCharacteristicsForAI(characteristics: CategoryCharacteristic[]): CategoryCharacteristic[] {
    const EXCLUDED_WB_IDS = new Set([
      // Габариты (автоматически заполняются системой)
      89008, 90630, 90607, 90608, 90652, 90653, 11002, 90654, 90655, 90673,
      // Цвет (определяется автоматически)
      14177449,
      // Комплектация (защищена пользователем)
      14177441, 378533,
      // НДС/декларации (заполняются отдельно)
      14177472, 14177473, 14177474, 15001405, 15001135, 15001136, 15001137, 15001138,
      // ИКПУ и коды
      15001650, 15001706
    ]);

    const filtered = characteristics.filter(char => {
      const isExcluded = EXCLUDED_WB_IDS.has(char.wbCharacteristicId || 0);
      
      if (isExcluded) {
        console.log(`🚫 Исключена: ${char.name} (wbCharacteristicId: ${char.wbCharacteristicId})`);
      }
      
      return !isExcluded;
    });

    console.log(`📋 Фильтрация: ${characteristics.length} → ${filtered.length} характеристик`);
    
    // Показываем первые 5 оставшихся характеристик
    console.log(`📝 Характеристики для ИИ:`, 
      filtered.slice(0, 5).map(c => `${c.name} (${c.wbCharacteristicId})`).join(', ')
    );
    
    return filtered;
  }

  /**
   * Загрузка ВСЕХ характеристик категории с отметкой о заполнении
   */
  private async loadCategoryCharacteristics(subcategoryId: number): Promise<CategoryCharacteristic[]> {
    try {
      console.log(`🔍 Загружаем ВСЕ характеристики для subcategoryId: ${subcategoryId}`);
      
      // Загружаем все характеристики категории
      const characteristics = await prisma.wbCategoryCharacteristic.findMany({
        where: {
          subcategoryId: subcategoryId
        },
        include: {
          values: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: [{ isRequired: 'desc' }, { sortOrder: 'asc' }]
      });

      if (characteristics.length === 0) {
        console.warn(`⚠️ Не найдены характеристики для subcategoryId: ${subcategoryId}`);
        return [];
      }

      console.log(`✅ Загружено ${characteristics.length} характеристик для subcategoryId: ${subcategoryId}`);

      return characteristics.map((char: any) => ({
        id: char.id,
        wbCharacteristicId: char.wbCharacteristicId,
        name: char.name,
        type: char.type === 'number' ? 'number' : 'string',
        isRequired: !!char.isRequired,
        maxLength: char.maxLength,
        minValue: char.minValue,
        maxValue: char.maxValue,
        description: char.description,
        values: char.values?.map((v: any) => ({
          id: v.id,
          value: v.value,
          displayName: v.displayName || v.value
        })) || []
      }));

    } catch (error) {
      console.error('❌ Ошибка загрузки характеристик:', error);
      throw error;
    }
  }

  /**
   * Объединение результатов всех агентов
   */
  private mergeFinalResults(
    agent1: AgentResult,
    agent2: AgentResult, 
    agent3: AgentResult,
    characteristics: CategoryCharacteristic[],
    startTime: number
  ): FinalResult {
    const totalTime = Date.now() - startTime;
    const totalCost = agent1.cost + agent2.cost + agent3.cost;
    
    // Обрабатываем характеристики с правильной типизацией
    const processedCharacteristics = (agent2.data.characteristics || []).map((char: any) => {
      const dbChar = characteristics.find(c => c.id === char.id);
      const detectedType = dbChar?.type || 'string';
      
      // Правильная типизация значения
      let typedValue = char.value;
      if (detectedType === 'number' && typedValue) {
        const num = parseFloat(String(typedValue).replace(/[^\d.,]/g, '').replace(',', '.'));
        typedValue = isNaN(num) ? char.value : num;
      }
      
      return {
        id: char.id,
        name: char.name,
        value: typedValue,
        confidence: char.confidence || 0,
        reasoning: char.source || 'ai_analysis', // Убрали длинные reasoning
        detectedType,
        source: char.source || 'ai_analysis'
      };
    });
    
    // Метрики качества
    const fillRate = Math.round((processedCharacteristics.length / characteristics.length) * 100);
    const seoTitleLength = (agent3.data.seoTitle || '').length;
    const seoDescriptionLength = (agent3.data.seoDescription || '').length;

    return {
      characteristics: processedCharacteristics,
      seoTitle: this.truncateTitle(agent3.data.seoTitle || '', QUALITY_REQUIREMENTS.SEO_TITLE_MAX_LENGTH),
      seoDescription: agent3.data.seoDescription || '',
      
      qualityMetrics: {
        overallScore: this.calculateOverallScore(fillRate, seoDescriptionLength, seoTitleLength),
        fillRate,
        characteristicsFillRate: fillRate,
        seoDescriptionLength,
        seoTitleLength,
        isQualityAcceptable: fillRate >= 60,
        issues: [],
        suggestions: []
      },
      
      analysisReport: {
        totalProcessingTime: totalTime,
        totalCost,
        agent1Time: agent1.processingTime,
        agent2Time: agent2.processingTime,
        agent3Time: agent3.processingTime,
        improvementAttempts: 1,
        finalScore: this.calculateOverallScore(fillRate, seoDescriptionLength, seoTitleLength)
      },
      
      confidence: (agent1.confidence + agent2.confidence + agent3.confidence) / 3,
      fillPercentage: fillRate,
      warnings: [],
      recommendations: [
        `Заполнено ${processedCharacteristics.length} характеристик`,
        'Проверьте данные при необходимости'
      ]
    };
  }

  /**
   * Расчет общего балла качества
   */
  private calculateOverallScore(fillRate: number, descLength: number, titleLength: number): number {
    let score = 0;
    
    // Балл за заполнение характеристик (50 баллов)
    score += Math.min(50, (fillRate / 60) * 50);
    
    // Балл за описание (30 баллов)
    if (descLength >= QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MIN_LENGTH && 
        descLength <= QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MAX_LENGTH) {
      score += 30;
    } else {
      const optimal = (QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MIN_LENGTH + QUALITY_REQUIREMENTS.SEO_DESCRIPTION_MAX_LENGTH) / 2;
      const deviation = Math.abs(descLength - optimal);
      score += Math.max(0, 30 - (deviation / 50));
    }
    
    // Балл за название (20 баллов)
    if (titleLength <= QUALITY_REQUIREMENTS.SEO_TITLE_MAX_LENGTH) {
      score += Math.max(0, 20 - (QUALITY_REQUIREMENTS.SEO_TITLE_MAX_LENGTH - titleLength) * 0.5);
    }
    
    return Math.round(score);
  }

  /**
   * Обрезка названия до нужной длины
   */
  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) return title;
    
    const words = title.split(' ');
    let truncated = '';
    
    for (const word of words) {
      if ((truncated + ' ' + word).trim().length <= maxLength) {
        truncated = (truncated + ' ' + word).trim();
      } else {
        break;
      }
    }
    
    return truncated || title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Расчет стоимости
   */
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;
    
    const pricing = PRICING[model as keyof typeof PRICING];
    if (!pricing) return 0;
    
    const inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }
}

export const unifiedAISystem = new UnifiedAISystem();