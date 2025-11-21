// lib/cron-orchestrator.ts
// Оркестратор для частых вызовов Cron endpoints
// Запускается 1 раз в день через Vercel Cron, работает 24 часа

/**
 * Конфигурация задач оркестратора
 */
interface CronTask {
  name: string;
  endpoint: string;
  intervalMinutes: number; // Интервал между вызовами в минутах
  description: string;
}

const TASKS: CronTask[] = [
  {
    name: 'sync-analytics',
    endpoint: '/api/cron/sync-analytics',
    intervalMinutes: 120, // Каждые 2 часа
    description: 'Синхронизация аналитики'
  },
  {
    name: 'sync-products',
    endpoint: '/api/cron/sync-products',
    intervalMinutes: 120, // Каждые 2 часа
    description: 'Синхронизация товаров'
  },
  {
    name: 'check-prices',
    endpoint: '/api/cron/check-prices',
    intervalMinutes: 30, // Каждые 30 минут
    description: 'Проверка закрепленных цен'
  },
  {
    name: 'check-campaigns',
    endpoint: '/api/cron/check-campaigns',
    intervalMinutes: 180, // Каждые 3 часа
    description: 'Проверка рекламных кампаний'
  }
];

/**
 * Вызывает endpoint
 */
async function callEndpoint(task: CronTask, baseUrl: string): Promise<void> {
  const url = `${baseUrl}${task.endpoint}`;
  
  try {
    console.log(`🔄 [Orchestrator] Вызов ${task.name}: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем заголовок для внутренней авторизации
        'x-orchestrator': 'true'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [Orchestrator] ${task.name} выполнен успешно`);
      console.log(`   Результат:`, JSON.stringify(data, null, 2).substring(0, 200));
    } else {
      console.error(`❌ [Orchestrator] ${task.name} вернул ошибку: ${response.status}`);
      const errorText = await response.text();
      console.error(`   Ошибка:`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.error(`❌ [Orchestrator] Ошибка вызова ${task.name}:`, error);
  }
}

/**
 * Планирует выполнение задачи
 */
function scheduleTask(
  task: CronTask,
  baseUrl: string,
  stopSignal: { stopped: boolean }
): void {
  // Немедленный первый вызов
  callEndpoint(task, baseUrl);

  // Планируем повторяющиеся вызовы
  const intervalMs = task.intervalMinutes * 60 * 1000;
  
  const intervalId = setInterval(() => {
    if (stopSignal.stopped) {
      clearInterval(intervalId);
      console.log(`⏹️ [Orchestrator] Остановлена задача: ${task.name}`);
      return;
    }
    
    callEndpoint(task, baseUrl);
  }, intervalMs);

  console.log(`📅 [Orchestrator] Запланирована задача: ${task.name} (каждые ${task.intervalMinutes} мин)`);
}

/**
 * Запускает оркестратор на 24 часа
 */
export async function startOrchestrator(baseUrl: string): Promise<void> {
  console.log(`\n🚀 [Orchestrator] Запуск оркестратора на 24 часа`);
  console.log(`📍 [Orchestrator] Base URL: ${baseUrl}`);
  console.log(`📋 [Orchestrator] Задач: ${TASKS.length}`);
  console.log(`⏰ [Orchestrator] Время старта: ${new Date().toISOString()}\n`);

  const stopSignal = { stopped: false };

  // Запускаем все задачи
  for (const task of TASKS) {
    scheduleTask(task, baseUrl, stopSignal);
    
    // Небольшая задержка между запуском задач
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Останавливаем через 24 часа
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  setTimeout(() => {
    console.log(`\n⏰ [Orchestrator] 24 часа истекли, останавливаем оркестратор`);
    stopSignal.stopped = true;
  }, TWENTY_FOUR_HOURS);

  console.log(`\n✅ [Orchestrator] Все задачи запущены`);
  console.log(`⏱️ [Orchestrator] Оркестратор будет работать до: ${new Date(Date.now() + TWENTY_FOUR_HOURS).toISOString()}\n`);
}

/**
 * Получает статистику выполнения
 */
export function getOrchestratorStats(): {
  tasks: Array<{
    name: string;
    intervalMinutes: number;
    executionsPerDay: number;
    description: string;
  }>;
  totalExecutionsPerDay: number;
} {
  const tasks = TASKS.map(task => ({
    name: task.name,
    intervalMinutes: task.intervalMinutes,
    executionsPerDay: Math.floor((24 * 60) / task.intervalMinutes),
    description: task.description
  }));

  const totalExecutionsPerDay = tasks.reduce((sum, t) => sum + t.executionsPerDay, 0);

  return {
    tasks,
    totalExecutionsPerDay
  };
}
