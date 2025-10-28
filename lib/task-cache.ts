// lib/task-cache.ts - Простое кеширование задач в памяти

interface CachedTask {
  data: any;
  timestamp: number;
}

class TaskCache {
  private cache: Map<string, CachedTask> = new Map();
  private readonly TTL = 3000; // 3 секунды - время жизни кеша

  set(taskId: string, data: any): void {
    this.cache.set(taskId, {
      data,
      timestamp: Date.now()
    });
  }

  get(taskId: string): any | null {
    const cached = this.cache.get(taskId);
    
    if (!cached) {
      return null;
    }

    // Проверяем, не истек ли кеш
    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      this.cache.delete(taskId);
      return null;
    }

    return cached.data;
  }

  invalidate(taskId: string): void {
    this.cache.delete(taskId);
  }

  clear(): void {
    this.cache.clear();
  }

  // Очистка старых записей
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const taskCache = new TaskCache();

// Автоматическая очистка каждые 10 секунд
if (typeof window === 'undefined') {
  setInterval(() => {
    taskCache.cleanup();
  }, 10000);
}
