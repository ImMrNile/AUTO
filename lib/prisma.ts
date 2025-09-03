// lib/prisma.ts - Исправленная конфигурация для стабильного подключения к Supabase

import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
  var __prismaHandlersAdded: boolean | undefined
}

// Создаем singleton instance Prisma Client с улучшенными настройками
const createPrismaClient = () => {
  console.log('🔧 [Prisma] Создание PrismaClient для Supabase...')
  
  // Проверяем наличие DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ [Prisma] DATABASE_URL не найдена в переменных окружения')
    throw new Error('DATABASE_URL не установлена')
  }
  
  console.log('🔍 [Prisma] DATABASE_URL найдена:', process.env.DATABASE_URL.substring(0, 50) + '...')
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

// Singleton pattern для избежания множественных подключений
const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// Функция для проверки подключения с retry логикой
export async function checkPrismaConnection(retries = 3): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  for (let i = 0; i < retries; i++) {
    const startTime = Date.now()
    
    try {
      console.log(`🔍 [Prisma] Попытка подключения ${i + 1}/${retries}...`)
      
      await prisma.$queryRaw`SELECT 1 as health_check`
      
      const latency = Date.now() - startTime
      console.log(`✅ [Prisma] Подключение успешно, задержка: ${latency}ms`)
      
      return { connected: true, latency }
      
    } catch (error: any) {
      console.error(`❌ [Prisma] Попытка ${i + 1} не удалась:`, error.message)
      
      // Если это последняя попытка, возвращаем ошибку
      if (i === retries - 1) {
        return { 
          connected: false, 
          error: error.message
        }
      }
      
      // Ждем перед следующей попыткой (экспоненциальная задержка)
      const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s
      console.log(`⏳ [Prisma] Ожидание ${delay}ms перед повторной попыткой...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return { connected: false, error: 'Все попытки исчерпаны' }
}

// Функция для безопасного выполнения операций с retry
export async function safePrismaOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = 2
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 [Prisma] Выполняем ${operationName} (попытка ${i + 1}/${retries})`)
      
      const result = await operation()
      console.log(`✅ [Prisma] ${operationName} выполнено успешно`)
      return result
      
    } catch (error: any) {
      console.error(`❌ [Prisma] ${operationName} не удалось (попытка ${i + 1}):`, error.message)
      
      // Проверяем тип ошибки
      const isConnectionError = error.code === 'P1001' || 
                               error.code === 'P1017' ||
                               error.message.includes('database server') ||
                               error.message.includes('connection')
      
      // Если это последняя попытка или не ошибка подключения, выбрасываем
      if (i === retries - 1 || !isConnectionError) {
        throw error
      }
      
      // Ждем перед повторной попыткой
      const delay = Math.pow(2, i) * 1000
      console.log(`⏳ [Prisma] Ожидание ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Пытаемся переподключиться
      try {
        await prisma.$disconnect()
        await prisma.$connect()
        console.log('🔄 [Prisma] Переподключение выполнено')
      } catch (reconnectError) {
        console.warn('⚠️ [Prisma] Ошибка переподключения:', reconnectError)
      }
    }
  }
  
  throw new Error(`Все попытки выполнения ${operationName} исчерпаны`)
}

// Инициализация подключения с проверкой
async function initializePrisma() {
  try {
    console.log('🚀 [Prisma] Инициализация подключения к Supabase...')
    
    // Проверяем переменные окружения
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL не установлена')
    }
    
    if (!process.env.DIRECT_URL) {
      console.warn('⚠️ [Prisma] DIRECT_URL не установлена - может влиять на производительность')
    }
    
    // Выполняем подключение с таймаутом
    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );
    
    const connectPromise = prisma.$connect();
    
    await Promise.race([connectPromise, connectTimeout]);
    console.log('✅ [Prisma] Начальное подключение установлено')
    
    // Проверяем работоспособность
    const healthCheck = await checkPrismaConnection(1)
    if (!healthCheck.connected) {
      console.warn('⚠️ [Prisma] Health check не прошел, но клиент создан')
    }
    
  } catch (error: any) {
    console.error('❌ [Prisma] Ошибка инициализации:', error.message)
    
    // Проверяем тип ошибки
    if (error.message.includes('Can\'t reach database server')) {
      console.error('🚨 [Prisma] Проблема с подключением к Supabase. Проверьте:')
      console.error('   1. DATABASE_URL в .env файле')
      console.error('   2. Доступность интернета')
      console.error('   3. Статус сервисов Supabase')
    }
    
    // Не выбрасываем ошибку, чтобы приложение могло запуститься
    // Подключение будет повторно установлено при первом запросе
  }
}

// Запускаем инициализацию только в серверном окружении
if (typeof window === 'undefined') {
  initializePrisma().catch(error => {
    console.error('🚨 [Prisma] Критическая ошибка инициализации:', error)
  })
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

// Обработчики сигналов завершения (добавляем только один раз)
if (!global.__prismaHandlersAdded) {
  process.setMaxListeners(20); // Увеличиваем лимит listeners
  
  process.on('beforeExit', shutdown)
  process.on('SIGINT', async () => {
    await shutdown()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await shutdown()
    process.exit(0)
  })

  // Обработчик необработанных отклонений Promise
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 [Prisma] Необработанное отклонение:', reason)
  })
  
  global.__prismaHandlersAdded = true;
  console.log('✅ [Prisma] Event handlers registered');
}

// Дополнительная функция для проверки статуса Supabase
export async function checkSupabaseStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  details: any;
}> {
  try {
    const startTime = Date.now()
    
    // Простой запрос для проверки
    await prisma.$queryRaw`SELECT current_timestamp`
    
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      details: {
        responseTime,
        timestamp: new Date().toISOString()
      }
    }
    
  } catch (error: any) {
    return {
      status: 'down',
      details: {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Экспортируем главный client и утилиты
export { prisma }
export default prisma