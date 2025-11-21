import { inngest } from '../client';
import { prisma } from '@/lib/prisma';

interface CreateProductInput {
  productName: string;
  images: string[];
  category: string;
  cabinetId: string;
  userId: string;
  taskId?: string;
}

/**
 * Durable функция для создания товара
 * Автоматически сохраняет прогресс после каждого шага
 * 
 * Преимущества:
 * - Если сервер упадет, workflow продолжится с последнего шага
 * - Автоматические retry при ошибках
 * - Полная история выполнения
 */
export const createProductWorkflow = inngest.createFunction(
  {
    id: 'create-product',
    name: 'Create Product with AI',
    retries: 3, // Автоматические повторы при ошибках
  },
  { event: 'product/create' },
  async ({ event, step }) => {
    const { productName, images, category, cabinetId, userId, taskId } = event.data as CreateProductInput;

    console.log(`🚀 [Workflow] Начало создания товара: ${productName}`);

    // Шаг 1: Анализ изображений с помощью AI
    const imageAnalysis = await step.run('analyze-images', async () => {
      console.log('🔍 [Workflow] Анализ изображений...');
      
      // TODO: Вызов вашего AI сервиса для анализа изображений
      // const openai = new OpenAIService();
      // const analysis = await openai.analyzeImages(images);
      
      // Пока возвращаем заглушку
      return {
        colors: ['красный', 'синий'],
        objects: ['товар'],
        quality: 'хорошее',
      };
    });

    // Шаг 2: Генерация описания
    const description = await step.run('generate-description', async () => {
      console.log('✍️ [Workflow] Генерация описания...');
      
      // TODO: Вызов вашего AI сервиса для генерации описания
      // const openai = new OpenAIService();
      // const desc = await openai.generateDescription({ productName, imageAnalysis, category });
      
      return `Описание для ${productName}`;
    });

    // Шаг 3: Генерация характеристик
    const characteristics = await step.run('generate-characteristics', async () => {
      console.log('📋 [Workflow] Генерация характеристик...');
      
      // TODO: Вызов вашего AI сервиса для генерации характеристик
      
      return {
        color: 'Разноцветный',
        material: 'Текстиль',
        size: 'Универсальный',
      };
    });

    // Шаг 4: Создание товара в БД
    const product = await step.run('create-product-in-db', async () => {
      console.log('💾 [Workflow] Создание товара в БД...');
      
      return await prisma.product.create({
        data: {
          name: productName,
          userId,
          status: 'DRAFT',
          originalImage: images[0] || null,
          price: 0,
          // Сохраняем сгенерированные данные в seoDescription (временно)
          seoDescription: JSON.stringify({
            description,
            characteristics,
            imageAnalysis,
            cabinetId,
          }),
        },
      });
    });

    // Шаг 5: Публикация на WB
    const wbResult = await step.run('publish-to-wb', async () => {
      console.log('🚀 [Workflow] Публикация на Wildberries...');
      
      // TODO: Вызов WB API для создания товара
      // const wbService = new WBService();
      // const result = await wbService.createProduct({ cabinetId, product: { name: productName, description, characteristics, images } });
      
      return {
        nmId: Math.floor(Math.random() * 1000000),
        success: true,
      };
    });

    // Шаг 6: Обновление товара с данными WB
    const finalProduct = await step.run('update-product-with-wb-data', async () => {
      console.log('✅ [Workflow] Обновление товара с данными WB...');
      
      // Парсим существующие данные
      const existingData = product.seoDescription ? JSON.parse(product.seoDescription) : {};
      
      return await prisma.product.update({
        where: { id: product.id },
        data: {
          status: 'PUBLISHED',
          // Обновляем seoDescription с nmId
          seoDescription: JSON.stringify({
            ...existingData,
            nmId: wbResult.nmId,
            publishedAt: new Date().toISOString(),
          }),
        },
      });
    });

    console.log(`✅ [Workflow] Товар создан успешно: ${finalProduct.id}`);

    return {
      success: true,
      productId: finalProduct.id,
      nmId: wbResult.nmId,
    };
  }
);
