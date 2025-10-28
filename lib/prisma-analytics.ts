// lib/prisma-analytics.ts - Отдельный Prisma Client для аналитики
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prismaAnalytics: PrismaClient | undefined
}

const globalForPrismaAnalytics = globalThis as typeof globalThis & {
  __prismaAnalytics?: PrismaClient
}

// Создаём отдельный клиент для ДОЛГИХ аналитических запросов
const createPrismaAnalyticsClient = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('📊 [Prisma Analytics] Создание отдельного клиента для аналитики')
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        // Используем тот же URL, но с БОЛЬШИМ connection_limit для долгих запросов
        url: process.env.DATABASE_URL?.replace(/connection_limit=\d+/, 'connection_limit=12')
          .replace(/pool_timeout=\d+/, 'pool_timeout=60'),
      },
    },
    // Увеличенные таймауты для долгих аналитических запросов
    __internal: {
      engine: {
        connectionTimeout: 15000, // 15 секунд на соединение
        queryTimeout: 60000, // 60 секунд на запрос (для WB API)
      }
    }
  } as any)
}

export const prismaAnalytics = globalForPrismaAnalytics.__prismaAnalytics ?? createPrismaAnalyticsClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrismaAnalytics.__prismaAnalytics = prismaAnalytics
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    try {
      await prismaAnalytics.$disconnect()
    } catch (e) {
      console.error('[Prisma Analytics] Shutdown error:', e)
    }
  }

  process.on('beforeExit', shutdown)
  process.on('SIGINT', async () => {
    await shutdown()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await shutdown()
    process.exit(0)
  })
}

export default prismaAnalytics
