// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient
}

// Создаём singleton клиент оптимизированный для аналитики
const createPrismaClient = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 [Prisma] Создание клиента для аналитики')
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Таймауты для предотвращения блокировки пула
    // https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#connection-pool-timeout
    __internal: {
      engine: {
        connectionTimeout: 10000, // 10 секунд на установку соединения
        queryTimeout: 30000, // 30 секунд на выполнение запроса (синхронизировано с pool_timeout)
      }
    }
  } as any)
}

export const prisma = globalForPrisma.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    try {
      await prisma.$disconnect()
    } catch (e) {
      console.error('[Prisma] Shutdown error:', e)
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

export default prisma