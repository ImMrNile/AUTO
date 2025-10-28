// lib/services/backgroundTaskProcessor.ts - Фоновый процессор задач создания товаров
import { prisma } from '../prisma';
import { safePrismaOperation } from '../prisma-utils';
import { UnifiedAISystem } from './unifiedAISystem';
import { uploadService } from './uploadService';

/**
 * Фоновый процессор для обработки задач создания товаров
 * Позволяет продолжить обработку после перезапуска сервера
 */
export class BackgroundTaskProcessor {
  private static processingTasks = new Set<string>();
  private static isInitialized = false;
  private static readonly TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 минут
  private static readonly MAX_RETRIES = 2;

  /**
   * Инициализация процессора при старте сервера
   * Восстанавливает незавершенные задачи
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ BackgroundTaskProcessor уже инициализирован');
      return;
    }

    console.log('🚀 Инициализация BackgroundTaskProcessor...');
    this.isInitialized = true;

    // Находим все незавершенные задачи
    const incompleteTasks = await safePrismaOperation(
      () => prisma.productCreationTask.findMany({
        where: {
          status: {
            in: ['CREATING', 'ANALYZING', 'PUBLISHING']
          }
        },
        include: {
          product: true
        }
      }),
      'поиск незавершенных задач'
    );

    // Проверяем задачи на таймаут
    const now = new Date();
    for (const task of incompleteTasks || []) {
      const taskAge = now.getTime() - task.createdAt.getTime();
      if (taskAge > this.TASK_TIMEOUT_MS) {
        console.warn(`⏰ Задача ${task.id} превысила таймаут (${Math.round(taskAge / 60000)} минут), помечаем как ошибку`);
        await this.markTaskAsError(task.id, `Превышен таймаут обработки (${Math.round(taskAge / 60000)} минут)`);
        continue;
      }
    }

    if (!incompleteTasks || incompleteTasks.length === 0) {
      console.log('✅ Нет незавершенных задач для восстановления');
      return;
    }

    console.log(`🔄 Найдено ${incompleteTasks.length} незавершенных задач, запускаем восстановление...`);

    // Восстанавливаем каждую задачу
    for (const task of incompleteTasks) {
      try {
        console.log(`🔄 Восстановление задачи ${task.id} (${task.productName})...`);
        
        // Проверяем, есть ли связанный товар
        if (!task.productId || !task.product) {
          console.warn(`⚠️ Задача ${task.id} не имеет связанного товара, помечаем как ошибку`);
          await this.markTaskAsError(task.id, 'Товар не найден после перезапуска сервера');
          continue;
        }

        // Запускаем обработку в фоне
        this.processTask(task.id, task.productId).catch(error => {
          console.error(`❌ Ошибка восстановления задачи ${task.id}:`, error);
        });
      } catch (error) {
        console.error(`❌ Ошибка при восстановлении задачи ${task.id}:`, error);
      }
    }

    console.log('✅ BackgroundTaskProcessor инициализирован');
  }

  /**
   * Обработка задачи создания товара
   */
  static async processTask(taskId: string, productId: string): Promise<void> {
    // Проверяем, не обрабатывается ли уже эта задача
    if (this.processingTasks.has(taskId)) {
      console.log(`⚠️ Задача ${taskId} уже обрабатывается`);
      return;
    }

    this.processingTasks.add(taskId);
    console.log(`🚀 Начало обработки задачи ${taskId} для товара ${productId}`);

    // Устанавливаем таймаут для задачи
    const timeoutId = setTimeout(() => {
      console.error(`⏰ Задача ${taskId} превысила таймаут ${this.TASK_TIMEOUT_MS / 60000} минут`);
      this.markTaskAsError(taskId, 'Превышен таймаут обработки').catch(console.error);
      this.processingTasks.delete(taskId);
    }, this.TASK_TIMEOUT_MS);

    try {
      // Получаем задачу и товар из БД
      const task = await safePrismaOperation(
        () => prisma.productCreationTask.findUnique({
          where: { id: taskId },
          include: { product: true }
        }),
        'получение задачи'
      );

      if (!task) {
        throw new Error('Задача не найдена');
      }

      if (!task.product) {
        throw new Error('Товар не найден');
      }

      const product = task.product;

      // Определяем текущий этап обработки
      let currentStatus = task.status;
      
      // Если задача была прервана на этапе CREATING, начинаем с ANALYZING
      if (currentStatus === 'CREATING') {
        currentStatus = 'ANALYZING';
      }

      // Этап 1: Анализ ИИ (если еще не выполнен)
      if (currentStatus === 'ANALYZING') {
        await this.updateTaskStatus(taskId, 'ANALYZING', 30, 'Анализ товара с помощью ИИ...');

        try {
          // Проверяем, есть ли уже результаты ИИ анализа
          const hasAIData = product.aiCharacteristics && 
            typeof product.aiCharacteristics === 'object' &&
            'characteristics' in product.aiCharacteristics;

          if (!hasAIData) {
            console.log(`🤖 Запуск ИИ анализа для товара ${productId}...`);
            
            // Подготовка данных для ИИ
            const wbData = product.wbData as any;
            const aiInput = {
              productName: product.name,
              productImages: product.originalImage ? [product.originalImage] : [],
              categoryId: product.subcategoryId || 0,
              packageContents: wbData?.packageContents || '',
              referenceUrl: product.referenceUrl || '',
              price: product.price,
              dimensions: product.dimensions as any || {},
              hasVariantSizes: wbData?.hasVariantSizes || false,
              variantSizes: wbData?.variantSizes || [],
              aiPromptComment: wbData?.imageComments || '',
              userId: product.userId,
              preserveUserData: {
                preserveUserData: true,
                userProvidedPackageContents: wbData?.packageContents || '',
                userProvidedDimensions: product.dimensions as any || {},
                specialInstructions: `Восстановление после перезапуска сервера`
              }
            };

            // Запуск ИИ анализа
            const unifiedAISystem = new UnifiedAISystem();
            const aiResult = await unifiedAISystem.analyzeProductComplete(aiInput);

            // Сохранение результатов ИИ
            await safePrismaOperation(
              () => prisma.product.update({
                where: { id: productId },
                data: {
                  generatedName: aiResult.seoTitle || product.name,
                  seoDescription: aiResult.seoDescription || '',
                  aiCharacteristics: {
                    characteristics: aiResult.characteristics || [],
                    qualityMetrics: aiResult.qualityMetrics,
                    analysisReport: aiResult.analysisReport,
                    confidence: aiResult.confidence,
                    warnings: aiResult.warnings || [],
                    recommendations: aiResult.recommendations || [],
                    systemVersion: 'unified_ai_v3_gpt5',
                    processedAt: new Date().toISOString()
                  }
                }
              }),
              'сохранение результатов ИИ'
            );

            console.log(`✅ ИИ анализ завершен для товара ${productId}`);
          } else {
            console.log(`✅ ИИ анализ уже выполнен для товара ${productId}`);
          }

          await this.updateTaskStatus(taskId, 'ANALYZING', 60, 'ИИ анализ завершен');
        } catch (aiError) {
          console.error(`❌ Ошибка ИИ анализа для товара ${productId}:`, aiError);
          // Продолжаем без ИИ данных
          await this.updateTaskStatus(taskId, 'ANALYZING', 60, 'ИИ анализ пропущен из-за ошибки');
        }

        currentStatus = 'PUBLISHING';
      }

      // Этап 2: Публикация (если требуется)
      if (currentStatus === 'PUBLISHING') {
        await this.updateTaskStatus(taskId, 'PUBLISHING', 80, 'Подготовка к публикации...');

        // Здесь можно добавить логику публикации на WB
        // Пока просто помечаем товар как готовый к публикации
        await safePrismaOperation(
          () => prisma.product.update({
            where: { id: productId },
            data: { status: 'DRAFT' }
          }),
          'обновление статуса товара'
        );

        await this.updateTaskStatus(taskId, 'PUBLISHING', 90, 'Товар готов к публикации');
      }

      // Завершение задачи
      await this.updateTaskStatus(taskId, 'COMPLETED', 100, 'Товар успешно создан');
      console.log(`✅ Задача ${taskId} успешно завершена`);

    } catch (error) {
      console.error(`❌ Ошибка обработки задачи ${taskId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      await this.markTaskAsError(taskId, errorMessage);
    } finally {
      clearTimeout(timeoutId);
      this.processingTasks.delete(taskId);
    }
  }

  /**
   * Обновление статуса задачи
   */
  private static async updateTaskStatus(
    taskId: string,
    status: 'CREATING' | 'ANALYZING' | 'PUBLISHING' | 'COMPLETED' | 'ERROR',
    progress: number,
    currentStage: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress,
        currentStage,
        updatedAt: new Date()
      };

      if (status === 'COMPLETED' || status === 'ERROR') {
        updateData.completedAt = new Date();
      }

      await safePrismaOperation(
        () => prisma.productCreationTask.update({
          where: { id: taskId },
          data: updateData
        }),
        'обновление статуса задачи'
      );

      console.log(`📊 Задача ${taskId}: ${status} (${progress}%) - ${currentStage}`);
    } catch (error) {
      console.error(`❌ Ошибка обновления статуса задачи ${taskId}:`, error);
    }
  }

  /**
   * Пометить задачу как ошибочную
   */
  private static async markTaskAsError(taskId: string, errorMessage: string): Promise<void> {
    try {
      await safePrismaOperation(
        () => prisma.productCreationTask.update({
          where: { id: taskId },
          data: {
            status: 'ERROR',
            progress: 0,
            errorMessage,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }),
        'пометка задачи как ошибочной'
      );

      console.log(`❌ Задача ${taskId} помечена как ошибочная: ${errorMessage}`);
    } catch (error) {
      console.error(`❌ Ошибка при пометке задачи ${taskId} как ошибочной:`, error);
    }
  }

  /**
   * Создать новую задачу и запустить её обработку
   */
  static async createAndProcessTask(
    userId: string,
    productName: string,
    productId: string
  ): Promise<string> {
    console.log(`🚀 Создание новой задачи для товара "${productName}" (${productId})`);

    // Создаем задачу в БД
    const task = await safePrismaOperation(
      () => prisma.productCreationTask.create({
        data: {
          userId,
          productName,
          productId,
          status: 'CREATING',
          progress: 10,
          currentStage: 'Товар создан, начинается обработка...'
        }
      }),
      'создание задачи'
    );

    if (!task) {
      throw new Error('Не удалось создать задачу');
    }

    console.log(`✅ Задача ${task.id} создана, запускаем обработку в фоне...`);

    // Запускаем обработку в фоне (не ждем завершения)
    this.processTask(task.id, productId).catch(error => {
      console.error(`❌ Ошибка фоновой обработки задачи ${task.id}:`, error);
    });

    return task.id;
  }
}
