// lib/services/unifiedAISystem.ts - НОВАЯ АРХИТЕКТУРА С OPENAI ASSISTANT API

import OpenAI from 'openai';
import { prisma } from '../prisma';

// Простой интерфейс для поисковых запросов (для внутреннего использования)
interface WbSearchQuery {
  query: string;
  frequency: number;
  position: number;
  ctr: number;
  conversion: number;
}

// НОВАЯ АРХИТЕКТУРА С OPENAI ASSISTANT API
export const QUALITY_REQUIREMENTS = {
  CHARACTERISTICS_MIN_FILL_RATE: 60,
  SEO_DESCRIPTION_MIN_LENGTH: 1300,
  SEO_DESCRIPTION_MAX_LENGTH: 2000,
  SEO_TITLE_MAX_LENGTH: 60,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT: 180000, // 3 минуты
  AGENT_TIMEOUT: 240000 // 4 минуты
};

// OpenAI Assistant API IDs
const ASSISTANT_IDS = {
  AGENT1_ANALYSIS: 'pmpt_68e918917c348193be58c918c0df29d308fa5acf83a10a63',
  AGENT2_FORMATTING: 'pmpt_68ebc5ae442c819495f491b20bda329106c667b99b09c310',
  AGENT3_ERROR_FIXING: 'pmpt_68f24208b15c8193ae4449f16494d7440c3a6a23998d2b80' // WB Error Fixing Agent
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

// НАСТРОЙКИ RATE LIMITING
const RATE_LIMIT_CONFIG = {
  DELAY_BETWEEN_AGENTS: 2000, // 2 секунды между агентами
  MAX_IMAGES: 3, // Максимум 3 изображения вместо всех
  RETRY_DELAYS: [2000, 5000, 10000], // Задержки для повторных попыток: 2с, 5с, 10с
  MAX_RETRIES: 3
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
  userId?: string; // Добавлено для получения токенов WB
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

export interface WBPublishError {
  vendorCode: string;
  errors: string[]; // Массив текстовых ошибок от WB
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
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY не найден. AI функции будут недоступны.');
      return;
    }
    
    this.openai = new OpenAI({ 
      apiKey,
      timeout: QUALITY_REQUIREMENTS.REQUEST_TIMEOUT,
      maxRetries: 3,
    });
  }

  /**
   * АГЕНТ 1: Анализ товара с помощью OpenAI Assistant API (Prompt-based)
   * Получает: название товара, фото, JSON характеристики категории
   * Возвращает: характеристики в свободном формате, SEO слова, описание
   * ВАЖНО: Делает ОДИН запрос к GPT-5
   */
  private async runAgent1_AssistantAnalysis(input: ProductInput, categoryCharacteristics?: CategoryCharacteristic[]): Promise<AgentResult> {
    if (!this.openai) {
      throw new Error('OpenAI client не инициализирован. Проверьте OPENAI_API_KEY.');
    }
    
    const startTime = Date.now();
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔍 АГЕНТ 1 [${callId}] (Prompt API): "${input.productName}" - НАЧАЛО в ${new Date().toISOString()}`);
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      console.log(`🔄 АГЕНТ 1 [${callId}] Попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES} в ${new Date().toISOString()}`);
      try {
        // Подготавливаем данные для агента 1
        const allImages = input.productImages || [];
        
        // Передаем ВСЕ изображения без ограничения
        const productImages = allImages;
        
        console.log(`📸 [${callId}] Передача ВСЕХ изображений напрямую в API: ${productImages.length} фото`);
        
        // Подготавливаем текстовые данные БЕЗ изображений (они будут отдельно)
        // ВАЖНО: Agent 1 НЕ получает характеристики с ID - это работа Agent 2!
        const textInput = {
          productName: input.productName,
          packageContents: input.packageContents || '',
          referenceUrl: input.referenceUrl || '',
          aiPromptComment: input.aiPromptComment || '',
          price: input.price || 0,
          categoryId: input.categoryId || 0
        };
        
        const imageTypes = productImages.map(img => img.startsWith('data:') ? 'base64' : 'url');
        
        console.log(`📤 Отправка данных в Агент 1:`, {
          productName: textInput.productName,
          imagesCount: productImages.length,
          imageTypes: imageTypes.join(', '),
          packageContents: textInput.packageContents.substring(0, 50) + '...',
          price: textInput.price,
          method: 'content_array_with_images'
        });

        // ИСПРАВЛЕНИЕ: Responses API требует специфические типы контента
        // Используем 'input_text' вместо 'text' и 'input_image' вместо 'image_url'
        const messageContent: any[] = [
          {
            type: 'input_text',
            text: JSON.stringify(textInput)
          }
        ];
        
        // Добавляем изображения в content массив с правильным типом
        // ВАЖНО: Responses API использует image_url напрямую, а не объект source
        const imageUrls: string[] = [];
        
        for (const image of productImages) {
          if (image.startsWith('data:image')) {
            // Base64 изображения - передаем полный data URI в image_url
            messageContent.push({
              type: 'input_image',
              image_url: image  // Передаем полный data:image/jpeg;base64,... URI
            });
            imageUrls.push(`Base64 изображение (${image.substring(0, 30)}...)`);
          } else if (image.startsWith('http')) {
            // URL изображения - передаем URL напрямую в image_url
            messageContent.push({
              type: 'input_image',
              image_url: image
            });
            imageUrls.push(image);
          } else if (image.startsWith('/uploads/')) {
            // Локальный путь - конвертируем в URL
            const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${image}`;
            messageContent.push({
              type: 'input_image',
              image_url: publicUrl
            });
            imageUrls.push(publicUrl);
          }
        }
        
        // Логируем публичные URL для тестирования в промпте
        if (imageUrls.length > 0) {
          console.log('🔗 Публичные URL изображений для тестирования промпта:');
          imageUrls.forEach((url, i) => {
            console.log(`   ${i + 1}. ${url}`);
          });
        }
        
        // Оборачиваем content в message для Responses API
        const inputForResponsesAPI = [
          {
            type: 'message',
            role: 'user',
            content: messageContent
          }
        ];
        
        console.log(`🔍 Input подготовлен: message с ${messageContent.length} элементами (1 input_text + ${productImages.length} input_images)`);
        
        // ОТЛАДКА: Логируем полную структуру запроса
        console.log('🔍 Полная структура запроса к Agent 1:');
        console.log(JSON.stringify(inputForResponsesAPI, (key, value) => {
          // Обрезаем длинные base64 строки для читаемости
          if (key === 'image_url' && typeof value === 'string' && value.startsWith('data:image')) {
            return value.substring(0, 50) + '...[обрезано]';
          }
          if (key === 'text' && typeof value === 'string' && value.length > 200) {
            return value.substring(0, 200) + '...[обрезано]';
          }
          return value;
        }, 2));
        
        // Вызываем OpenAI Responses API (Agent 1) с правильным форматом
        console.log(`📤 [${callId}] Отправка запроса к OpenAI Responses API в ${new Date().toISOString()}...`);
        const response = await this.openai.responses.create({
          prompt: {
            id: ASSISTANT_IDS.AGENT1_ANALYSIS
          },
          input: inputForResponsesAPI
        } as any);
        
        console.log(`✅ [${callId}] Получен ответ от OpenAI Responses API в ${new Date().toISOString()}`);
  
        // Получаем результат
        let result = (response as any).output || (response as any).content;
        if (!result) throw new Error('Пустой ответ от Агента 1 (Prompt API)');
  
        // ИСПРАВЛЕНИЕ: Responses API возвращает массив с разными типами элементов
        // Нужно найти элемент с type="message" и извлечь content[0].text
        if (Array.isArray(result)) {
          const messageItem = result.find((item: any) => item.type === 'message');
          if (messageItem && messageItem.content && messageItem.content[0]) {
            // Ищем текстовый контент
            const textContent = messageItem.content.find((c: any) => c.type === 'output_text' || c.text);
            if (textContent && textContent.text) {
              result = textContent.text;
              console.log('🔄 Извлечен текст из message content');
            }
          }
        }
        
        // УПРОЩЕННАЯ ЛОГИКА: Agent 1 просто возвращает результат КАК ЕСТЬ
        // Agent 2 займется форматированием и типизацией
        console.log(`✅ Agent 1 вернул результат (${typeof result}, длина: ${typeof result === 'string' ? result.length : 'N/A'})`);
        console.log(`📝 Agent 1 результат (первые 500 символов):`, 
          typeof result === 'string' ? result.substring(0, 500) : JSON.stringify(result).substring(0, 500)
        );
        
        // Минимальная обработка - просто возвращаем результат
        // Если это строка - пробуем распарсить JSON, но не критично если не получится
        let parsedResult: any;
        
        if (typeof result === 'string') {
          // Пробуем найти JSON в тексте
          try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
              console.log('✅ Найден JSON в ответе Agent 1');
            } else {
              // Если JSON не найден - сохраняем как rawText
              parsedResult = { rawText: result };
              console.log('⚠️ JSON не найден, сохраняем как rawText');
            }
          } catch (e) {
            // Парсинг не удался - не проблема, Agent 2 разберется
            parsedResult = { rawText: result };
            console.log('⚠️ Парсинг JSON не удался, передаем текст как есть');
          }
        } else {
          // Если уже объект - используем как есть
          parsedResult = result;
        }
        
        const processingTime = Date.now() - startTime;
        
        // Расчет стоимости (если доступна информация о токенах)
        const usage = (response as any).usage;
        const cost = usage ? this.calculateCost(MODELS.GPT5_MINI, usage) : 0;
        const tokensUsed = usage?.total_tokens || 0;
  
        console.log(`✅ АГЕНТ 1 [${callId}] ЗАВЕРШЕН: ${processingTime}ms, ${tokensUsed} токенов, попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES}`);
  
        return {
          success: true,
          data: parsedResult,
          confidence: parsedResult.confidence || 0.9,
          tokensUsed,
          cost,
          processingTime
        };
  
      } catch (error) {
        console.error(`❌ АГЕНТ 1 [${callId}] Попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES} ОШИБКА:`, error);
        
        // Логируем полную информацию об ошибке
        if (error instanceof Error) {
          console.error(`❌ [${callId}] Error name: ${error.name}`);
          console.error(`❌ [${callId}] Error message: ${error.message}`);
          console.error(`❌ [${callId}] Error stack:`, error.stack?.substring(0, 500));
        }
        
        // Если это ошибка формата, не делаем повторные попытки
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Invalid value') || errorMessage.includes('Unknown parameter')) {
          console.error('❌ Ошибка формата данных Agent 1, повторные попытки бесполезны');
          break; // Прерываем цикл
        }
        
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          const waitTime = 2000 * attempt;
          console.log(`⏳ Ожидание ${waitTime}ms перед повторной попыткой Agent 1...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  
    return {
      success: false,
      data: { characteristics: {}, confidence: 0 },
      confidence: 0,
      tokensUsed: 0,
      cost: 0,
      processingTime: Date.now() - startTime,
      error: 'Агент 1 (Prompt API) не смог проанализировать товар'
    };
  }

  /**
   * АГЕНТ 2: Форматирование JSON с помощью OpenAI Prompt API
   * Получает: текстовый результат от Агента 1 + характеристики категории с ID
   * Возвращает: JSON с форматом "characteristics": [{"id": 12345, "name": "...", "value": "..."}]
   * ВАЖНО: Делает ОДИН запрос к GPT-5
   */
  private async runAgent2_AssistantFormatting(
    input: ProductInput, 
    agent1Data: any, 
    characteristics: CategoryCharacteristic[]
  ): Promise<AgentResult> {
    if (!this.openai) {
      throw new Error('OpenAI client не инициализирован. Проверьте OPENAI_API_KEY.');
    }
    
    const startTime = Date.now();
    
    console.log(`📊 АГЕНТ 2 (Prompt API): форматирование в JSON с ID для WB`);
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      try {
        // Подготавливаем ПОЛНЫЕ данные для агента 2
        // Agent 2 получает ВСЕ: результат Agent 1 + данные пользователя + характеристики с ID
        const agentInput = {
          // Результат от Agent 1 (полностью)
          agent1Result: agent1Data,
          
          // Данные от пользователя (комплектация, размеры)
          userProvidedData: {
            packageContents: input.packageContents || '',
            dimensions: input.dimensions || {
              length: 0,
              width: 0,
              height: 0,
              weight: 0
            },
            price: input.price || 0,
            productName: input.productName,
            hasVariantSizes: input.hasVariantSizes || false,
            variantSizes: input.variantSizes || []
          },
          
          // JSON характеристики категории с ID и типизацией
          categoryCharacteristics: characteristics.map(char => ({
            id: char.wbCharacteristicId || char.id,
            name: char.name,
            type: char.type,
            isRequired: char.isRequired,
            maxLength: char.maxLength,
            minValue: char.minValue,
            maxValue: char.maxValue,
            description: char.description,
            values: char.values?.slice(0, 10).map(v => ({
              id: v.id,
              value: v.value,
              displayName: v.displayName || v.value
            })) || []
          }))
        };
        
        console.log(`📤 Отправка данных в Агент 2:`, {
          hasAgent1Result: !!agent1Data,
          characteristicsCount: characteristics.length,
          packageContents: input.packageContents?.substring(0, 30) + '...',
          dimensions: input.dimensions,
          price: input.price
        });

        console.log(`📤 [Agent 2] Отправка запроса к OpenAI Responses API в ${new Date().toISOString()}...`);
        
        // Вызываем Agent 2 с таймаутом
        const responsePromise = this.openai.responses.create({
          prompt: {
            id: ASSISTANT_IDS.AGENT2_FORMATTING
          },
          input: JSON.stringify(agentInput)
        } as any);
        
        // Добавляем периодическое логирование прогресса
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          console.log(`⏳ [Agent 2] Ожидание ответа... (${Math.round(elapsed / 1000)}с)`);
        }, 10000); // Каждые 10 секунд
        
        // Добавляем таймаут
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Agent 2 timeout after ${QUALITY_REQUIREMENTS.AGENT_TIMEOUT}ms`)), 
          QUALITY_REQUIREMENTS.AGENT_TIMEOUT)
        );
        
        const response = await Promise.race([responsePromise, timeoutPromise]) as any;
        
        console.log(`✅ [Agent 2] Получен ответ от OpenAI Responses API в ${new Date().toISOString()}`);

        // Получаем результат
        let result = (response as any).output || (response as any).content;
        if (!result) throw new Error('Пустой ответ от Агента 2 (Prompt API)');

        // ИСПРАВЛЕНИЕ: Responses API возвращает массив с разными типами элементов
        // Нужно найти элемент с type="message" и извлечь content[0].text
        if (Array.isArray(result)) {
          const messageItem = result.find((item: any) => item.type === 'message');
          if (messageItem && messageItem.content && messageItem.content[0] && messageItem.content[0].text) {
            result = messageItem.content[0].text;
            console.log('🔄 Извлечен текст из message.content[0].text (Agent 2)');
          } else {
            console.warn('⚠️ Не найден message в массиве результата Agent 2, используем весь массив');
          }
        }

        // Парсим JSON если результат - строка
        let parsedResult;
        if (typeof result === 'string') {
          try {
            // Пробуем найти JSON объект в тексте
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
              console.log('✅ JSON успешно извлечен из текста (Agent 2)');
            } else {
              parsedResult = JSON.parse(result);
            }
          } catch (parseError) {
            console.error('❌ Ошибка парсинга JSON (Agent 2):', parseError);
            console.log('📝 Первые 500 символов результата:', result.substring(0, 500));
            parsedResult = { rawText: result };
          }
        } else {
          parsedResult = result;
        }
        
        const processingTime = Date.now() - startTime;
        
        // Расчет стоимости (если доступна информация о токенах)
        const usage = (response as any).usage;
        const cost = usage ? this.calculateCost(MODELS.GPT5_MINI, usage) : 0;
        const tokensUsed = usage?.total_tokens || 0;

        // 🔍 ОТЛАДКА: Проверяем результат Agent 2
        console.log(`🔍 Agent 2 raw result (first 500 chars):`, JSON.stringify(result).substring(0, 500) + '...');
        console.log(`🔍 Agent 2 parsed keys:`, Object.keys(parsedResult));
        console.log(`🔍 Agent 2 characteristics count:`, parsedResult.characteristics?.length || 0);
        console.log(`✅ АГЕНТ 2 ЗАВЕРШЕН: ${processingTime}ms, ${tokensUsed} токенов, попытка ${attempt}/${QUALITY_REQUIREMENTS.MAX_RETRIES}`);

        return {
          success: true,
          data: parsedResult,
          confidence: parsedResult.confidence || 0.9,
          tokensUsed,
          cost,
          processingTime
        };

      } catch (error) {
        console.error(`❌ Попытка ${attempt} не удалась (Agent 2):`, error);
        
        // Логируем информацию об ошибке
        if (error instanceof Error) {
          console.error(`❌ Error message: ${error.message}`);
        }
        
        // Если это ошибка формата, не делаем повторные попытки
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Invalid value') || errorMessage.includes('Unknown parameter')) {
          console.error('❌ Ошибка формата данных Agent 2, повторные попытки бесполезны');
          break;
        }
        
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          const waitTime = 2000 * attempt;
          console.log(`⏳ Ожидание ${waitTime}ms перед повторной попыткой Agent 2...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } finally {
        // КРИТИЧЕСКИ ВАЖНО: Очищаем интервал в любом случае
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
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
      error: 'Агент 2 (Prompt API) не смог отформатировать данные'
    };
  }

  /**
   * AGENT 3: Исправление ошибок WB с помощью AI
   * Получает: ошибки от WB, данные товара, правила категории
   * Возвращает: исправленные данные
   */
  async fixWBErrors(
    wbErrors: string[], // Массив текстовых ошибок от WB
    productData: {
      characteristics: any[];
      seoTitle: string;
      seoDescription: string;
      vendorCode: string;
      sentToWB?: any; // Данные, которые были отправлены на WB API
    },
    categoryCharacteristics: CategoryCharacteristic[],
    detailedErrors?: Array<{ field: string; error: string; characteristicName?: string }> // Детальные структурированные ошибки
  ): Promise<AgentResult> {
    if (!this.openai) {
      throw new Error('OpenAI client не инициализирован. Проверьте OPENAI_API_KEY.');
    }
    
    const startTime = Date.now();
    
    console.log(`🔧 АГЕНТ 3 (Error Fixing): исправление ${wbErrors.length} ошибок от WB`);
    console.log(`📋 Ошибки от WB:`, wbErrors);
    
    for (let attempt = 1; attempt <= QUALITY_REQUIREMENTS.MAX_RETRIES; attempt++) {
      try {
        // Подготавливаем данные для Agent 3 с детальными ошибками
        const agentInput = {
          wbErrors, // Ошибки от WB API (текстовые)
          detailedErrors: detailedErrors || [], // Структурированные ошибки с указанием полей
          currentData: {
            vendorCode: productData.vendorCode,
            characteristics: productData.characteristics,
            seoTitle: productData.seoTitle,
            seoDescription: productData.seoDescription
          },
          sentToWB: productData.sentToWB || null, // Данные, которые были отправлены на WB для анализа
          categoryCharacteristics: categoryCharacteristics.map(char => ({
            id: char.wbCharacteristicId || char.id,
            name: char.name,
            type: char.type,
            isRequired: char.isRequired,
            maxLength: char.maxLength,
            minValue: char.minValue,
            maxValue: char.maxValue,
            description: char.description,
            values: char.values?.slice(0, 20).map(v => ({
              id: v.id,
              value: v.value,
              displayName: v.displayName || v.value
            })) || []
          })),
          task: `КРИТИЧЕСКИ ВАЖНО! Исправь ВСЕ ошибки типов данных для WB API.

ДОКУМЕНТАЦИЯ WB: https://dev.wildberries.ru/en/openapi/work-with-products

ТИПЫ ДАННЫХ В WB API (charcType):
- charcType 0 = STRING  → значение: строка
- charcType 1 = NUMBER  → значение: ТОЛЬКО ЧИСЛО (не строка, не массив!)
- charcType 4 = OPTION  → значение: строка из справочника
- charcType 5 = BOOLEAN → значение: true/false

ПРАВИЛА ИСПРАВЛЕНИЯ:

1️⃣ NUMBER (type: "number") - САМАЯ ЧАСТАЯ ОШИБКА!
   ❌ НЕПРАВИЛЬНО: {"id": 90630, "value": ["19"]}  (строка в массиве)
   ❌ НЕПРАВИЛЬНО: {"id": 90630, "value": [19]}    (число в массиве)
   ❌ НЕПРАВИЛЬНО: {"id": 90630, "value": "19"}    (строка)
   ✅ ПРАВИЛЬНО:   {"id": 90630, "value": 19}      (просто число!)
   
   Убирай единицы измерения:
   - "407 г" → 407
   - "2.1 A" → 2.1
   - "20%" → 20
   - "19 мм" → 19

2️⃣ STRING (type: "string")
   ✅ ПРАВИЛЬНО: {"id": 4370, "value": "ABS-пластик"}

АЛГОРИТМ:
1. Посмотри sentToWB.variants[0].characteristics - это данные с ошибкой
2. Сравни с categoryCharacteristics - узнай правильный type
3. Исправь ТОЛЬКО типы данных (НЕ меняй сами значения!)
4. Для type="number": убери кавычки, убери массив, убери единицы
5. Для type="string": оставь строкой

Верни ТОЛЬКО JSON (без markdown):
{
  "characteristics": [
    {"id": 90630, "name": "Высота предмета", "value": 19},
    {"id": 4370, "name": "Материал корпуса", "value": "ABS-пластик"}
  ],
  "seoTitle": "оригинальный заголовок",
  "seoDescription": "оригинальное описание"
}`
        };
        
        console.log(`📤 Отправка данных в Агент 3:`, {
          errorsCount: wbErrors.length,
          detailedErrorsCount: detailedErrors?.length || 0,
          characteristicsCount: productData.characteristics.length,
          vendorCode: productData.vendorCode,
          hasSentToWBData: !!productData.sentToWB,
          sentToWBCharacteristicsCount: productData.sentToWB?.variants?.[0]?.characteristics?.length || 0,
          detailedErrorsSample: detailedErrors?.slice(0, 3) || []
        });

        // Вызываем Agent 3
        const response = await this.openai.responses.create({
          prompt: {
            id: ASSISTANT_IDS.AGENT3_ERROR_FIXING
          },
          input: JSON.stringify(agentInput)
        } as any);

        // Получаем результат
        let result = (response as any).output || (response as any).content;
        if (!result) throw new Error('Пустой ответ от Агента 3');

        // Извлекаем текст из message
        if (Array.isArray(result)) {
          const messageItem = result.find((item: any) => item.type === 'message');
          if (messageItem && messageItem.content && messageItem.content[0]) {
            const textContent = messageItem.content.find((c: any) => c.type === 'output_text' || c.text);
            if (textContent && textContent.text) {
              result = textContent.text;
              console.log('🔄 Извлечен текст из message content (Agent 3)');
            }
          }
        }

        // Парсим JSON
        let parsedResult;
        if (typeof result === 'string') {
          try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
              console.log('✅ JSON успешно извлечен (Agent 3)');
            } else {
              parsedResult = JSON.parse(result);
            }
          } catch (parseError) {
            console.error('❌ Ошибка парсинга JSON (Agent 3):', parseError);
            console.log('📝 Первые 500 символов результата:', result.substring(0, 500));
            throw parseError;
          }
        } else {
          parsedResult = result;
        }
        
        const processingTime = Date.now() - startTime;
        const usage = (response as any).usage;
        const cost = usage ? this.calculateCost(MODELS.GPT5_MINI, usage) : 0;
        const tokensUsed = usage?.total_tokens || 0;

        console.log(`✅ Агент 3 завершил исправление:`, {
          characteristics: parsedResult.characteristics?.length || 0,
          hasSeoTitle: !!parsedResult.seoTitle,
          hasSeoDescription: !!parsedResult.seoDescription
        });

        return {
          success: true,
          data: parsedResult, // Возвращает { characteristics, seoTitle, seoDescription }
          confidence: 0.95,
          tokensUsed,
          cost,
          processingTime
        };

      } catch (error) {
        console.error(`❌ Попытка ${attempt} не удалась (Agent 3):`, error);
        
        if (attempt < QUALITY_REQUIREMENTS.MAX_RETRIES) {
          const waitTime = 2000 * attempt;
          console.log(`⏳ Ожидание ${waitTime}ms перед повторной попыткой Agent 3...`);
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
      error: 'Агент 3 не смог исправить ошибки'
    };
  }

  /**
   * Получение списка исключенных полей
   */
  private getExcludedFields(): number[] {
    return [
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
    ];
  }

  /**
   * Оптимизация характеристик для уменьшения количества токенов
   */
  private optimizeCharacteristicsForTokens(characteristics: CategoryCharacteristic[], aggressive: boolean = false): any[] {
    const excludedFields = this.getExcludedFields();
    
    return characteristics
      .filter(char => !excludedFields.includes(char.wbCharacteristicId || 0))
      .map(char => ({
        id: char.wbCharacteristicId || char.id,
        name: char.name,
        type: char.type,
        isRequired: char.isRequired,
        description: char.description,
        maxLength: char.maxLength,
        minValue: char.minValue,
        maxValue: char.maxValue,
        // Ограничиваем значения в зависимости от режима
        values: char.values?.slice(0, aggressive ? 2 : 5).map(v => ({
          id: v.id,
          value: v.value,
          displayName: v.displayName || v.value
        })) || []
      }))
      .slice(0, aggressive ? 15 : 25); // Ограничиваем общее количество характеристик
  }





  /**
   * ГЛАВНАЯ ФУНКЦИЯ - ПОСЛЕДОВАТЕЛЬНЫЙ ПОТОК: Agent 1 → Agent 2
   * Agent 1 (1 запрос): Анализ товара с фото
   * Agent 2 (1 запрос): Форматирование в JSON с ID
   */
  async analyzeProductComplete(input: ProductInput): Promise<FinalResult> {
    const startTime = Date.now();
    console.log(`\n🚀 ЗАПУСК ПОСЛЕДОВАТЕЛЬНОГО ПОТОКА (Agent 1 → Agent 2): "${input.productName}"`);

    try {
      // ОПТИМИЗАЦИЯ: Загружаем характеристики категории параллельно с подготовкой
      console.log(`📋 Загружаем характеристики категории ID: ${input.categoryId}`);
      
      const categoryCharacteristicsPromise = this.loadCategoryCharacteristics(input.categoryId);
      
      console.log(`📸 Фото для анализа: ${input.productImages?.length || 0} изображений`);
      
      // ШАГ 1: Запуск Agent 1 - анализ товара
      console.log(`\n🔍 ШАГ 1/2: Запуск Agent 1 (анализ товара)...`);
      const agent1StartTime = Date.now();
      
      // Получаем характеристики категории для Agent 1
      const categoryCharacteristics = await categoryCharacteristicsPromise;
      console.log(`📋 Категория ${input.categoryId}: ${categoryCharacteristics.length} характеристик`);
      
      const agent1Result = await this.runAgent1_AssistantAnalysis(input, categoryCharacteristics);
      const agent1EndTime = Date.now();
      
      if (!agent1Result.success) {
        console.warn(`⚠️ Agent 1 не удался, создаем минимальные данные`);
        agent1Result.data = {
          характеристики: {},
          seo_ключевые_слова: [],
          описание: `${input.productName}. Описание будет дополнено позже.`,
          seo_название: input.productName.substring(0, 60),
          дополнительное: "Данные будут дополнены"
        };
      }

      console.log(`✅ Agent 1 завершен (${agent1Result.processingTime}ms, ${agent1Result.tokensUsed} токенов)`);
      console.log(`⏱️ Agent 1 время: ${agent1EndTime - agent1StartTime}ms`);

      // ОПТИМИЗАЦИЯ: Проверяем готовность Agent 1 немедленно
      const agent1ProcessingTime = agent1EndTime - agent1StartTime;
      console.log(`🚀 Скорость обработки Agent 1: ${agent1ProcessingTime}ms`);

      // ШАГ 2: Запуск Agent 2 - форматирование JSON и создание ID
      console.log(`\n📊 ШАГ 2/2: Запуск Agent 2 (форматирование JSON + создание ID)...`);
      console.log(`⚡ НЕМЕДЛЕННЫЙ ЗАПУСК Agent 2 без задержки`);
      console.log(`📤 Передача данных от Agent 1 к Agent 2: ${JSON.stringify(agent1Result.data).substring(0, 200)}...`);
      
      const agent2StartTime = Date.now();
      const agent2Result = await this.runAgent2_AssistantFormatting(input, agent1Result.data, categoryCharacteristics);
      const agent2EndTime = Date.now();
      
      console.log(`✅ Agent 2 завершен (${agent2Result.processingTime}ms, ${agent2Result.tokensUsed} токенов)`);
      console.log(`⏱️ Agent 2 время: ${agent2EndTime - agent2StartTime}ms`);
      console.log(`⚡ Общее время последовательной обработки: ${(agent2EndTime - agent1StartTime)}ms`);
      console.log(`📊 ЗАДЕРЖКА МЕЖДУ АГЕНТАМИ: ${(agent2StartTime - agent1EndTime)}ms`);

      // Объединяем результаты
      const finalResult = this.mergeAssistantResults(
        agent1Result,
        agent2Result,
        categoryCharacteristics,
        startTime
      );

      const hasFailures = !agent1Result.success || !agent2Result.success;
      const statusMessage = hasFailures ? 'ЧАСТИЧНО ЗАВЕРШЕНА' : 'ПОЛНОСТЬЮ ЗАВЕРШЕНА';

      console.log(`\n✅ ПОСЛЕДОВАТЕЛЬНЫЙ ПОТОК ${statusMessage}:`);
      console.log(`   📊 Agent 1: ${agent1Result.tokensUsed} токенов, ${agent1Result.processingTime}ms`);
      console.log(`   📊 Agent 2: ${agent2Result.tokensUsed} токенов, ${agent2Result.processingTime}ms`);
      console.log(`   ⏱️  Общее время: ${finalResult.analysisReport.totalProcessingTime}ms`);
      console.log(`   💰 Общая стоимость: $${finalResult.analysisReport.totalCost.toFixed(4)}`);
      console.log(`   📈 Характеристик: ${finalResult.qualityMetrics.fillRate}%`);

      return finalResult;

    } catch (error) {
      console.error('❌ Критическая ошибка последовательного потока:', error);
      
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
   * Объединение результатов Assistant API
   */
  private mergeAssistantResults(
    agent1: AgentResult,
    agent2: AgentResult, 
    characteristics: CategoryCharacteristic[],
    startTime: number
  ): FinalResult {
    const totalTime = Date.now() - startTime;
    const totalCost = agent1.cost + agent2.cost;
    
    // 🔍 ОТЛАДКА: Проверяем данные от агентов
    console.log('🔍 ОТЛАДКА Agent 1 данные:', JSON.stringify(agent1.data, null, 2));
    console.log('🔍 ОТЛАДКА Agent 2 данные:', JSON.stringify(agent2.data, null, 2));
    
    // Обрабатываем характеристики - приоритет Agent 2 (он уже форматирует с ID)
    let agent2Characteristics = [];
    
    // Agent 2 возвращает characteristics с ID
    if (agent2.data?.characteristics && Array.isArray(agent2.data.characteristics)) {
      agent2Characteristics = agent2.data.characteristics;
      console.log(`✅ Agent 2 вернул ${agent2Characteristics.length} характеристик с ID`);
    } else if (agent2.data?.results?.characteristics) {
      agent2Characteristics = agent2.data.results.characteristics;
    } else if (agent2.data?.data?.characteristics) {
      agent2Characteristics = agent2.data.data.characteristics;
    } else if (Array.isArray(agent2.data)) {
      agent2Characteristics = agent2.data;
    }
    
    console.log(`🔍 Agent 2 characteristics: ${agent2Characteristics.length} элементов`);
    
    // Если Agent 2 не дал характеристик, пробуем из Agent 1 (text format)
    let agent1Characteristics = [];
    if (agent2Characteristics.length === 0 && agent1.data) {
      // Если Agent 1 вернул rawText, пробуем извлечь данные из него
      if (agent1.data.rawText) {
        try {
          // Пробуем найти JSON в rawText
          const jsonMatch = agent1.data.rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            if (extractedData.характеристики) {
              agent1Characteristics = Object.entries(extractedData.характеристики).map(([name, value]) => ({
                name: name.replace(/_/g, ' '),
                value,
                id: 0
              }));
            }
          }
        } catch (e) {
          console.warn('⚠️ Не удалось извлечь характеристики из rawText');
        }
      } else if (agent1.data.характеристики) {
        // Обрабатываем русские ключи характеристик
        agent1Characteristics = Object.entries(agent1.data.характеристики).map(([name, value]) => ({
          name: name.replace(/_/g, ' '), // Заменяем подчеркивания на пробелы
          value,
          id: 0 // Временный ID
        }));
      } else if (agent1.data.characteristics) {
        agent1Characteristics = agent1.data.characteristics;
      } else if (typeof agent1.data === 'object') {
        // Пробуем найти характеристики в других полях
        const possibleKeys = ['features', 'params', 'attributes', 'properties'];
        for (const key of possibleKeys) {
          if (agent1.data[key]) {
            agent1Characteristics = Object.entries(agent1.data[key]).map(([name, value]) => ({
              name,
              value,
              id: 0
            }));
            break;
          }
        }
      }
      console.log(`🔍 Agent 1 characteristics: ${agent1Characteristics.length} элементов`);
    }
    
    const allCharacteristics = agent2Characteristics.length > 0 ? agent2Characteristics : agent1Characteristics;
    console.log(`🔍 Используем характеристики: ${allCharacteristics.length} элементов`);
    
    const processedCharacteristics = allCharacteristics.map((char: any) => {
      // Если Agent 2 уже вернул характеристику с ID, используем его напрямую
      if (char.id && agent2Characteristics.length > 0) {
        // Agent 2 уже сопоставил с БД, используем как есть
        const dbChar = characteristics.find(c => c.wbCharacteristicId === char.id || c.id === char.id);
        const detectedType = dbChar?.type || (typeof char.value === 'number' ? 'number' : 'string');
        
        return {
          id: char.id,
          name: char.name,
          value: char.value,
          confidence: 0.95, // Высокая уверенность от Agent 2
          reasoning: 'agent2_formatted',
          detectedType,
          source: 'assistant_api_agent2'
        };
      }
      
      // Для данных от Agent 1 ищем в БД
      let dbChar = characteristics.find(c => c.wbCharacteristicId === char.id);
      if (!dbChar) {
        dbChar = characteristics.find(c => c.id === char.id);
      }
      if (!dbChar) {
        // Нормализуем имя для поиска
        const normalizedCharName = char.name
          ?.toLowerCase()
          .trim()
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ');
        
        dbChar = characteristics.find(c => {
          const normalizedDbName = c.name
            ?.toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
          return normalizedDbName === normalizedCharName;
        });
      }
      
      // Дополнительный поиск по частичному совпадению
      if (!dbChar && char.name) {
        const charWords = char.name.toLowerCase().split(/[\s_]+/);
        dbChar = characteristics.find(c => {
          const dbWords = c.name?.toLowerCase().split(/\s+/) || [];
          const commonWords = charWords.filter((w: string) => dbWords.includes(w));
          return commonWords.length >= Math.min(2, charWords.length);
        });
      }
      
      const detectedType = dbChar?.type || 'string';
      
      // Правильная типизация значения
      let typedValue = char.value;
      if (detectedType === 'number' && typedValue !== null && typedValue !== undefined && typedValue !== '') {
        if (typeof typedValue === 'string') {
          const cleanedValue = typedValue.replace(/[^\d.,-]/g, '').replace(',', '.');
          const num = parseFloat(cleanedValue);
          typedValue = isNaN(num) ? null : num;
        } else if (typeof typedValue === 'number') {
          typedValue = typedValue;
        } else {
          const num = parseFloat(String(typedValue));
          typedValue = isNaN(num) ? null : num;
        }
      }
      
      return {
        id: dbChar?.wbCharacteristicId || dbChar?.id || 0,
        name: char.name,
        value: typedValue,
        confidence: 0.85,
        reasoning: 'agent1_analysis',
        detectedType,
        source: 'assistant_api_agent1'
      };
    });
    
    // Метрики качества
    const fillRate = Math.round((processedCharacteristics.length / characteristics.length) * 100);
    
    // Извлекаем SEO данные из Agent 2 или Agent 1
    let seoTitle = '';
    let seoDescription = '';
    let seoKeywords = '';
    
    // Приоритет Agent 2 (уже оптимизированный формат)
    if (agent2.data?.seoContent?.title) {
      seoTitle = agent2.data.seoContent.title;
      console.log('✅ SEO title от Agent 2');
    } else if (agent2.data?.productInfo?.shortTitle) {
      seoTitle = agent2.data.productInfo.shortTitle;
      console.log('✅ SEO title от Agent 2 (shortTitle)');
    } else if (agent1.data?.seo_название) {
      seoTitle = agent1.data.seo_название;
      console.log('⚠️ SEO title от Agent 1 (fallback)');
    }
    
    if (agent2.data?.seoContent?.description) {
      seoDescription = agent2.data.seoContent.description;
      console.log('✅ SEO description от Agent 2');
    } else if (agent1.data?.описание) {
      seoDescription = agent1.data.описание;
      console.log('⚠️ SEO description от Agent 1 (fallback)');
    }
    
    // Ключевые слова
    if (agent2.data?.seoContent?.keywords) {
      seoKeywords = agent2.data.seoContent.keywords;
    } else if (Array.isArray(agent1.data?.seo_ключевые_слова)) {
      seoKeywords = agent1.data.seo_ключевые_слова.join(', ');
    }
    
    const seoTitleLength = seoTitle.length;
    const seoDescriptionLength = seoDescription.length;
    
    console.log('📝 SEO данные:', {
      title: seoTitle.substring(0, 60) + (seoTitle.length > 60 ? '...' : ''),
      titleLength: seoTitleLength,
      descriptionLength: seoDescriptionLength,
      hasKeywords: !!seoKeywords
    });

    return {
      characteristics: processedCharacteristics,
      seoTitle: this.truncateTitle(seoTitle, QUALITY_REQUIREMENTS.SEO_TITLE_MAX_LENGTH),
      seoDescription,
      
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
        agent3Time: 0,
        improvementAttempts: 1,
        finalScore: this.calculateOverallScore(fillRate, seoDescriptionLength, seoTitleLength)
      },
      
      confidence: (agent1.confidence + agent2.confidence) / 2,
      fillPercentage: fillRate,
      warnings: [],
      recommendations: [
        `Заполнено ${processedCharacteristics.length} характеристик`,
        'Проверьте данные при необходимости'
      ]
    };
  }


  /**
   * Загрузка характеристик категории для Assistant API
   */
  private async loadCategoryCharacteristics(subcategoryId: number): Promise<CategoryCharacteristic[]> {
    try {
      console.log(`🔍 Загружаем характеристики для subcategoryId: ${subcategoryId}`);
      
      // Загружаем характеристики категории
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

  /**
   * Примерная оценка количества токенов в тексте
   */
  private estimateTokens(text: string): number {
    // Примерная оценка: 1 токен ≈ 4 символа для английского, ≈ 2-3 символа для русского
    return Math.ceil(text.length / 2.5);
  }

  /**
   * Проверка лимита токенов перед отправкой запроса
   */
  private checkTokenLimit(messages: any[], maxTokens: number = 200000): boolean {
    const messageText = messages.map(msg => msg.content || '').join(' ');
    const estimatedTokens = this.estimateTokens(messageText);
    
    console.log(`🔍 Оценка токенов: ${estimatedTokens} (лимит: ${maxTokens})`);
    
    if (estimatedTokens > maxTokens) {
      console.warn(`⚠️ Предупреждение: оценка токенов (${estimatedTokens}) превышает лимит (${maxTokens})`);
      return false;
    }
    
    return true;
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