// lib/prisma-utils.ts
// Утилиты для работы с Prisma (обратная совместимость)

import { prisma } from './prisma'

/**
 * Обёртка для безопасного выполнения операций с Prisma
 * Оптимизировано для аналитики - минимум retry
 */
export async function safePrismaOperation<T>(
  operation: () => Promise<T>,
  operationName = 'operation',
  retries = 0
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      const isConnectionError = 
        error?.code === 'P1001' || 
        error?.code === 'P1017'

      // Если это не ошибка подключения или последняя попытка - выбрасываем
      if (!isConnectionError || attempt === retries) {
        throw error
      }

      // Короткая задержка
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  throw lastError
}

/**
 * Проверка подключения к БД
 * С pgBouncer это просто тестовый запрос
 */
export async function ensurePrismaConnected(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ [Prisma] Connection check failed:', error)
    }
    throw error
  }
}

/**
 * Проверка статуса подключения с метриками
 */
export async function checkPrismaConnection(retries = 2) {
  for (let i = 0; i < retries; i++) {
    const start = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`
      const latency = Date.now() - start
      return { connected: true, latency }
    } catch (err: any) {
      if (i === retries - 1) {
        return { connected: false, error: err.message }
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  return { connected: false, error: 'exhausted' }
}

/**
 * Проверка статуса Supabase
 */
export async function checkSupabaseStatus() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT now()`
    const responseTime = Date.now() - start
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      details: {
        responseTime,
        timestamp: new Date().toISOString()
      }
    }
  } catch (err: any) {
    return {
      status: 'down',
      details: {
        error: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      }
    }
  }
}
