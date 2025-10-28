// lib/services/categoryDetectionAgent.ts - AI агент для определения категории товара по фото

import OpenAI from 'openai';
import { prisma } from '../prisma';

// Интерфейсы
interface CategoryDetectionInput {
  productName: string;
  productImages: string[];
}

interface DetectedCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number;
  confidence: number;
  reasoning: string;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

interface CategoryDetectionResult {
  success: boolean;
  detectedCategory: DetectedCategory | null;
  alternatives: DetectedCategory[];
  confidence: number;
  reasoning: string;
  processingTime: number;
  cost: number;
  error?: string;
}

// Агент для определения категории товара
export class CategoryDetectionAgent {
  private openai: OpenAI | null = null;
  private readonly PROMPT_ID = 'pmpt_68f8a1479ffc81958dceb1a2df3f7b530cb79867ef1a35f7';
  private readonly PROMPT_VERSION = '7';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY не найден. Агент определения категории не будет работать.');
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Определение категории товара по названию и фото используя Responses API
   */
  async detectCategory(input: CategoryDetectionInput): Promise<CategoryDetectionResult> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new Error('OpenAI API не инициализирован. Проверьте OPENAI_API_KEY.');
      }

      console.log('🔍 [CategoryAgent] Начало определения категории для:', input.productName);
      console.log(`🖼️ Анализируем ${input.productImages.length} изображений`);

      // Формируем content для message
      const messageContent: any[] = [
        {
          type: 'input_text',
          text: input.productName
        }
      ];

      // Добавляем изображения
      for (const imageUrl of input.productImages) {
        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:'))) {
          messageContent.push({
            type: 'input_image',
            image_url: imageUrl
          });
        } else {
          console.warn('⚠️ Пропущен невалидный URL изображения:', imageUrl?.substring(0, 50));
        }
      }

      // Оборачиваем в message для Responses API
      const inputForResponsesAPI = [
        {
          type: 'message',
          role: 'user',
          content: messageContent
        }
      ];

      console.log('📤 Отправка запроса к Responses API...');
      console.log('📋 Input: message с', messageContent.length, 'элементами');

      // Вызываем Responses API с промптом
      const response = await (this.openai as any).responses.create({
        prompt: {
          id: this.PROMPT_ID,
          version: this.PROMPT_VERSION
        },
        input: inputForResponsesAPI
      });

      console.log('📥 Получен ответ от Responses API');

      // Извлекаем результат из ответа
      let result = (response as any).output || (response as any).content;
      
      if (!result) {
        throw new Error('Пустой ответ от Responses API');
      }

      // Responses API возвращает массив, ищем message с текстом
      let responseText = '';
      if (Array.isArray(result)) {
        const messageItem = result.find((item: any) => item.type === 'message');
        if (messageItem && messageItem.content && messageItem.content[0]) {
          const textContent = messageItem.content.find((c: any) => c.type === 'output_text' || c.text);
          if (textContent && textContent.text) {
            responseText = textContent.text;
          }
        }
      } else if (typeof result === 'string') {
        responseText = result;
      }

      console.log('📥 Ответ от промпта:', responseText);

      // Парсим ответ
      let categoryId: number;
      try {
        // Извлекаем JSON из ответа
        const jsonMatch = responseText.match(/\{[\s\S]*"categoryId"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          categoryId = parseInt(parsed.categoryId);
        } else {
          throw new Error('JSON не найден в ответе');
        }
      } catch (parseError) {
        console.error('❌ Ошибка парсинга ответа:', parseError);
        throw new Error('Не удалось распарсить ответ от AI');
      }

      if (!categoryId || isNaN(categoryId)) {
        throw new Error('Не удалось извлечь categoryId из ответа');
      }

      console.log(`🎯 Определена категория ID: ${categoryId}`);

      // Получаем информацию о категории из БД
      const selectedCategory = await prisma.wbSubcategory.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          name: true,
          slug: true,
          parentCategoryId: true,
          wbSubjectId: true,
          commissionFbw: true,
          commissionFbs: true,
          commissionDbs: true,
          commissionCc: true,
          commissionEdbs: true,
          commissionBooking: true,
          parentCategory: {
            select: {
              name: true
            }
          }
        }
      });

      if (!selectedCategory) {
        throw new Error(`Категория с ID ${categoryId} не найдена в базе данных`);
      }

      // Формируем результат
      const detectedCategory: DetectedCategory = {
        id: selectedCategory.id,
        name: selectedCategory.name,
        slug: selectedCategory.slug,
        parentId: selectedCategory.parentCategoryId,
        parentName: selectedCategory.parentCategory.name,
        displayName: selectedCategory.name,
        wbSubjectId: selectedCategory.wbSubjectId || undefined,
        confidence: 0.9,
        reasoning: 'Определено AI агентом по фото и названию',
        commissions: {
          fbw: selectedCategory.commissionFbw,
          fbs: selectedCategory.commissionFbs,
          dbs: selectedCategory.commissionDbs,
          cc: selectedCategory.commissionCc,
          edbs: selectedCategory.commissionEdbs,
          booking: selectedCategory.commissionBooking,
        },
      };

      const processingTime = Date.now() - startTime;
      
      // Примерная стоимость (зависит от модели в промпте)
      const cost = 0.001; // Примерная оценка

      console.log(`✅ [CategoryAgent] Категория определена: ${detectedCategory.displayName} (${processingTime}ms)`);

      return {
        success: true,
        detectedCategory,
        alternatives: [],
        confidence: detectedCategory.confidence,
        reasoning: detectedCategory.reasoning,
        processingTime,
        cost,
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [CategoryAgent] Ошибка определения категории:', error);

      return {
        success: false,
        detectedCategory: null,
        alternatives: [],
        confidence: 0,
        reasoning: error.message || 'Неизвестная ошибка',
        processingTime,
        cost: 0,
        error: error.message,
      };
    }
  }
}

// Экспортируем функцию для удобства
export async function detectProductCategory(input: CategoryDetectionInput): Promise<CategoryDetectionResult> {
  const agent = new CategoryDetectionAgent();
  return agent.detectCategory(input);
}
