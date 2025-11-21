// lib/task-scheduler.ts
// Простой планировщик задач для работы без Vercel cron

interface ScheduledTask {
  name: string;
  endpoint: string;
  intervalMinutes: number;
  lastExecuted?: Date;
  description: string;
}

class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks() {
    if (this.isInitialized) return;

    this.tasks = [
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
      },
      {
        name: 'cleanup',
        endpoint: '/api/cron/cleanup',
        intervalMinutes: 1440, // Раз в день
        description: 'Очистка старых данных'
      }
    ];

    this.isInitialized = true;
    console.log('📅 [Task Scheduler] Инициализирован с задачами:', this.tasks.length);
  }

  /**
   * Получить задачи, которые нужно выполнить сейчас
   */
  getDueTasks(): ScheduledTask[] {
    const now = new Date();
    return this.tasks.filter(task => {
      if (!task.lastExecuted) return true; // Никогда не выполнялась

      const timeSinceLastExecution = now.getTime() - task.lastExecuted.getTime();
      const intervalMs = task.intervalMinutes * 60 * 1000;

      return timeSinceLastExecution >= intervalMs;
    });
  }

  /**
   * Отметить задачу как выполненную
   */
  markTaskExecuted(taskName: string) {
    const task = this.tasks.find(t => t.name === taskName);
    if (task) {
      task.lastExecuted = new Date();
      console.log(`✅ [Task Scheduler] Задача "${taskName}" отмечена как выполненная`);
    }
  }

  /**
   * Выполнить все просроченные задачи
   */
  async executeDueTasks(baseUrl: string): Promise<{ executed: string[], failed: string[] }> {
    const dueTasks = this.getDueTasks();
    const executed: string[] = [];
    const failed: string[] = [];

    console.log(`🔄 [Task Scheduler] Найдено задач для выполнения: ${dueTasks.length}`);

    for (const task of dueTasks) {
      try {
        console.log(`🚀 [Task Scheduler] Выполнение: ${task.name}`);

        const response = await fetch(`${baseUrl}${task.endpoint}`, {
          method: 'GET',
          headers: {
            'x-task-scheduler': 'true',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          this.markTaskExecuted(task.name);
          executed.push(task.name);
          console.log(`✅ [Task Scheduler] Задача "${task.name}" выполнена успешно`);
        } else {
          failed.push(task.name);
          console.error(`❌ [Task Scheduler] Задача "${task.name}" завершилась с ошибкой: ${response.status}`);
        }

        // Небольшая задержка между задачами
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failed.push(task.name);
        console.error(`❌ [Task Scheduler] Ошибка выполнения задачи "${task.name}":`, error);
      }
    }

    return { executed, failed };
  }

  /**
   * Получить статус всех задач
   */
  getTasksStatus() {
    const now = new Date();

    return this.tasks.map(task => {
      let nextExecution = new Date(now);
      if (task.lastExecuted) {
        nextExecution = new Date(task.lastExecuted.getTime() + task.intervalMinutes * 60 * 1000);
      }

      const timeUntilNext = Math.max(0, nextExecution.getTime() - now.getTime());
      const minutesUntilNext = Math.ceil(timeUntilNext / (60 * 1000));

      return {
        name: task.name,
        description: task.description,
        intervalMinutes: task.intervalMinutes,
        lastExecuted: task.lastExecuted?.toISOString(),
        nextExecution: nextExecution.toISOString(),
        minutesUntilNext,
        isDue: minutesUntilNext <= 0
      };
    });
  }

  /**
   * Сбросить время последней выполнения задачи (для тестирования)
   */
  resetTask(taskName: string) {
    const task = this.tasks.find(t => t.name === taskName);
    if (task) {
      task.lastExecuted = undefined;
      console.log(`🔄 [Task Scheduler] Сброшено время выполнения для "${taskName}"`);
    }
  }
}

// Создаем единственный экземпляр планировщика
export const taskScheduler = new TaskScheduler();
