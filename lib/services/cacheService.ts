// lib/services/cacheService.ts - Сервис кеширования в БД

import { prisma } from '@/lib/prisma';

export class CacheService {
  /**
   * Получить данные из кеша
   * @param key - Ключ кеша
   * @returns Данные или null если кеш истек/не найден
   */
  static async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await prisma.dataCache.findUnique({
        where: { key }
      });

      if (!cached) {
        console.log(`📦 [Cache] Кеш не найден: ${key}`);
        return null;
      }

      // Проверяем истек ли кеш
      if (new Date() > cached.expiresAt) {
        console.log(`⏰ [Cache] Кеш истек: ${key} (истек ${cached.expiresAt.toISOString()})`);
        // Удаляем истекший кеш
        await this.delete(key);
        return null;
      }

      const age = Math.floor((Date.now() - cached.createdAt.getTime()) / 1000 / 60);
      console.log(`✅ [Cache] Кеш найден: ${key} (возраст: ${age} мин)`);
      
      return cached.data as T;
    } catch (error) {
      console.error(`❌ [Cache] Ошибка получения кеша ${key}:`, error);
      return null;
    }
  }

  /**
   * Сохранить данные в кеш
   * @param key - Ключ кеша
   * @param data - Данные для кеширования
   * @param ttlMinutes - Время жизни в минутах (по умолчанию 60)
   */
  static async set(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await prisma.dataCache.upsert({
        where: { key },
        create: {
          key,
          data,
          expiresAt
        },
        update: {
          data,
          expiresAt,
          updatedAt: new Date()
        }
      });

      console.log(`💾 [Cache] Данные сохранены: ${key} (TTL: ${ttlMinutes} мин, истекает: ${expiresAt.toISOString()})`);
    } catch (error) {
      console.error(`❌ [Cache] Ошибка сохранения кеша ${key}:`, error);
    }
  }

  /**
   * Удалить данные из кеша
   * @param key - Ключ кеша
   */
  static async delete(key: string): Promise<void> {
    try {
      await prisma.dataCache.delete({
        where: { key }
      }).catch(() => {
        // Игнорируем ошибку если запись не найдена
      });
      console.log(`🗑️ [Cache] Кеш удален: ${key}`);
    } catch (error) {
      console.error(`❌ [Cache] Ошибка удаления кеша ${key}:`, error);
    }
  }

  /**
   * Удалить все кеши по паттерну
   * @param pattern - Паттерн ключа (например: "analytics:user123:*")
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const searchPattern = pattern.replace('*', '%');
      
      await prisma.$executeRaw`
        DELETE FROM data_cache 
        WHERE key LIKE ${searchPattern}
      `;
      
      console.log(`🗑️ [Cache] Удалены кеши по паттерну: ${pattern}`);
    } catch (error) {
      console.error(`❌ [Cache] Ошибка удаления кешей по паттерну ${pattern}:`, error);
    }
  }

  /**
   * Очистить истекшие кеши
   */
  static async cleanExpired(): Promise<void> {
    try {
      const result = await prisma.dataCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      console.log(`🧹 [Cache] Очищено истекших кешей: ${result.count}`);
    } catch (error) {
      console.error(`❌ [Cache] Ошибка очистки истекших кешей:`, error);
    }
  }

  /**
   * Создать ключ кеша для аналитики
   */
  static createAnalyticsKey(userId: string, cabinetId: string, days: number): string {
    return `analytics:${userId}:${cabinetId}:${days}`;
  }

  /**
   * Создать ключ кеша для конверсии
   */
  static createConversionKey(userId: string, cabinetId: string, days: number): string {
    return `conversion:${userId}:${cabinetId}:${days}`;
  }
}
