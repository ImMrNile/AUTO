// lib/prisma.ts - Исправленная конфигурация для Supabase

import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

// Создаем singleton instance Prisma Client
const createPrismaClient = () => {
  console.log('🔧 [Prisma] Создание PrismaClient для Supabase...')
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error']
  })
}

// В development используем global для предотвращения множественных соединений
const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// Функция проверки подключения к базе данных
export async function checkPrismaConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1 as health_check`
    
    const latency = Date.now() - startTime
    console.log('✅ [Prisma] Database health check passed, latency:', latency + 'ms')
    
    return { connected: true, latency }
    
  } catch (error) {
    console.error('❌ [Prisma] Database health check failed:', error)
    
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Graceful shutdown handlers
const shutdown = async () => {
  console.log('📤 [Prisma] Закрытие соединения с БД...')
  
  try {
    await prisma.$disconnect()
    console.log('✅ [Prisma] Соединение закрыто')
  } catch (error) {
    console.error('❌ [Prisma] Ошибка при закрытии:', error)
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

// Экспортируем главный client
export { prisma }
export default prisma