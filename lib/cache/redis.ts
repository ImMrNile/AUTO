/**
 * Redis Cache Utility using Upstash Redis
 * 
 * Provides caching functions with graceful degradation if Redis is unavailable.
 * Uses singleton pattern for Redis client.
 */

import { Redis } from '@upstash/redis';

// Singleton Redis client instance
let redisClient: Redis | null = null;
let redisAvailable = true;

/**
 * Get or create Redis client instance (singleton)
 * @returns Redis client or null if unavailable
 */
export function getRedisClient(): Redis | null {
  // If we already determined Redis is unavailable, return null
  if (!redisAvailable) {
    return null;
  }

  // If client already exists, return it
  if (redisClient) {
    return redisClient;
  }

  // Check if Redis credentials are configured
  // Поддержка как Upstash Redis, так и Vercel KV
  const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('⚠️ [Redis] Не настроен Redis/KV кеш. Установите переменные:');
    console.warn('   REDIS_URL и REDIS_TOKEN (Upstash Redis)');
    console.warn('   или KV_REST_API_URL и KV_REST_API_TOKEN (Vercel KV)');
    console.warn('   📖 Инструкция: MOBILE_OPTIMIZATION_GUIDE.md');
    redisAvailable = false;
    return null;
  }

  try {
    // Create new Redis client
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    console.log('✅ [Redis] Клиент успешно инициализирован');
    return redisClient;
  } catch (error) {
    console.error('❌ [Redis] Ошибка инициализации клиента:', error);
    redisAvailable = false;
    return null;
  }
}

/**
 * Get value from cache
 * @param key Cache key
 * @returns Cached value or null if not found/error
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  
  if (!client) {
    console.log(`⚠️ [Redis] Клиент недоступен, пропускаем getCached("${key}")`);
    return null;
  }

  try {
    console.log(`🔍 [Redis] Получение из кеша: "${key}"`);
    const value = await client.get<T>(key);
    
    if (value !== null) {
      console.log(`✅ [Redis] Найдено в кеше: "${key}"`);
    } else {
      console.log(`❌ [Redis] Не найдено в кеше: "${key}"`);
    }
    
    return value;
  } catch (error) {
    console.error(`❌ [Redis] Ошибка при получении из кеша ("${key}"):`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds Time to live in seconds (default: 1800 = 30 minutes)
 * @returns true if successful, false otherwise
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 1800
): Promise<boolean> {
  const client = getRedisClient();
  
  if (!client) {
    console.log(`⚠️ [Redis] Клиент недоступен, пропускаем setCached("${key}")`);
    return false;
  }

  try {
    console.log(`💾 [Redis] Сохранение в кеш: "${key}" (TTL: ${ttlSeconds}с)`);
    
    // Set value with expiration
    await client.set(key, value, {
      ex: ttlSeconds, // Expiration in seconds
    });
    
    console.log(`✅ [Redis] Успешно сохранено в кеш: "${key}"`);
    return true;
  } catch (error) {
    console.error(`❌ [Redis] Ошибка при сохранении в кеш ("${key}"):`, error);
    return false;
  }
}

/**
 * Delete value from cache
 * @param key Cache key
 * @returns true if successful, false otherwise
 */
export async function deleteCached(key: string): Promise<boolean> {
  const client = getRedisClient();
  
  if (!client) {
    console.log(`⚠️ [Redis] Клиент недоступен, пропускаем deleteCached("${key}")`);
    return false;
  }

  try {
    console.log(`🗑️ [Redis] Удаление из кеша: "${key}"`);
    await client.del(key);
    console.log(`✅ [Redis] Успешно удалено из кеша: "${key}"`);
    return true;
  } catch (error) {
    console.error(`❌ [Redis] Ошибка при удалении из кеша ("${key}"):`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param pattern Pattern to match (e.g., "products:*")
 * @returns Number of keys deleted
 */
export async function deletePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  
  if (!client) {
    console.log(`⚠️ [Redis] Клиент недоступен, пропускаем deletePattern("${pattern}")`);
    return 0;
  }

  try {
    console.log(`🗑️ [Redis] Удаление по паттерну: "${pattern}"`);
    
    // Scan for keys matching pattern
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      console.log(`ℹ️ [Redis] Нет ключей для удаления по паттерну: "${pattern}"`);
      return 0;
    }
    
    // Delete all matching keys
    await client.del(...keys);
    console.log(`✅ [Redis] Удалено ${keys.length} ключей по паттерну: "${pattern}"`);
    return keys.length;
  } catch (error) {
    console.error(`❌ [Redis] Ошибка при удалении по паттерну ("${pattern}"):`, error);
    return 0;
  }
}

/**
 * Check if Redis is available
 * @returns true if Redis client is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && getRedisClient() !== null;
}

/**
 * Get cache statistics (for debugging)
 * @param key Cache key
 * @returns Object with TTL and other info
 */
export async function getCacheInfo(key: string): Promise<{
  exists: boolean;
  ttl: number | null;
}> {
  const client = getRedisClient();
  
  if (!client) {
    return { exists: false, ttl: null };
  }

  try {
    const ttl = await client.ttl(key);
    const exists = ttl !== -2; // -2 means key doesn't exist
    
    return {
      exists,
      ttl: ttl >= 0 ? ttl : null, // -1 means no expiration
    };
  } catch (error) {
    console.error(`❌ [Redis] Ошибка при получении информации о ключе ("${key}"):`, error);
    return { exists: false, ttl: null };
  }
}

// Export Redis client type for external use
export type { Redis } from '@upstash/redis';
