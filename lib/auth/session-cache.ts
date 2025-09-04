// lib/auth/session-cache.ts - Кеширование сессий для уменьшения запросов к БД

interface CachedSession {
  user: any;
  expiresAt: Date;
  cachedAt: Date;
}

class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут

  set(token: string, user: any, sessionExpiresAt: Date): void {
    this.cache.set(token, {
      user,
      expiresAt: sessionExpiresAt,
      cachedAt: new Date()
    });
    
    console.log(`🗄️ [SessionCache] Кеш сохранен для токена: ${token.substring(0, 10)}...`);
  }

  get(token: string): any | null {
    const cached = this.cache.get(token);
    if (!cached) {
      return null;
    }

    const now = new Date();
    
    // Проверяем, не истек ли кеш
    if (now.getTime() - cached.cachedAt.getTime() > this.CACHE_TTL) {
      console.log(`⏰ [SessionCache] Кеш истек для токена: ${token.substring(0, 10)}...`);
      this.cache.delete(token);
      return null;
    }

    // Проверяем, не истекла ли сама сессия
    if (cached.expiresAt < now) {
      console.log(`🕰️ [SessionCache] Сессия истекла для токена: ${token.substring(0, 10)}...`);
      this.cache.delete(token);
      return null;
    }

    console.log(`✅ [SessionCache] Кеш найден для токена: ${token.substring(0, 10)}...`);
    return cached.user;
  }

  delete(token: string): void {
    this.cache.delete(token);
    console.log(`🗑️ [SessionCache] Кеш удален для токена: ${token.substring(0, 10)}...`);
  }

  clear(): void {
    this.cache.clear();
    console.log(`🧹 [SessionCache] Весь кеш очищен`);
  }

  size(): number {
    return this.cache.size;
  }

  // Очистка истекших записей
  cleanup(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, cached] of this.cache.entries()) {
      if (now.getTime() - cached.cachedAt.getTime() > this.CACHE_TTL || 
          cached.expiresAt < now) {
        this.cache.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [SessionCache] Очищено ${cleaned} истекших записей`);
    }
  }
}

// Глобальный экземпляр кеша
export const sessionCache = new SessionCache();

// Периодическая очистка кеша каждые 10 минут
if (typeof window === 'undefined') { // Только на сервере
  setInterval(() => {
    sessionCache.cleanup();
  }, 10 * 60 * 1000);
}




