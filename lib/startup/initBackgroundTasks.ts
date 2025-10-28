// lib/startup/initBackgroundTasks.ts - Инициализация фоновых задач при старте сервера
import { BackgroundTaskProcessor } from '../services/backgroundTaskProcessor';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Инициализация фоновых задач при старте Next.js сервера
 * Вызывается вручную после подключения к БД
 */
export async function initBackgroundTasks() {
  // ВРЕМЕННО ОТКЛЮЧЕНО для снижения нагрузки на БД
  console.log('⚠️ [Startup] Фоновые задачи временно отключены');
  return;
  
  if (isInitialized) {
    return;
  }

  // Если уже идет инициализация, ждем её завершения
  if (initPromise) {
    return initPromise;
  }

  isInitialized = true;

  initPromise = (async () => {
    console.log('🚀 [Startup] Инициализация системы фоновых задач...');

    try {
      // Инициализируем процессор фоновых задач
      await BackgroundTaskProcessor.initialize();
      console.log('✅ [Startup] Система фоновых задач инициализирована');
    } catch (error) {
      console.error('❌ [Startup] Ошибка инициализации системы фоновых задач:', error);
      isInitialized = false; // Сбрасываем флаг при ошибке
      initPromise = null;
    }
  })();

  return initPromise;
}
