// lib/utils/retry.ts - Утилита для retry операций с базой данных

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: number;
  shouldRetry?: (error: Error) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 2,
  shouldRetry: (error: Error) => {
    // Retry для ошибок подключения к БД
    return error.message.includes('Can\'t reach database server') ||
           error.message.includes('timeout') ||
           error.message.includes('connection') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('ETIMEDOUT');
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 [Retry] Попытка ${attempt}/${config.maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ [Retry] Попытка ${attempt} неудачна:`, lastError.message);

      // Проверяем, нужно ли повторять
      if (attempt === config.maxAttempts || !config.shouldRetry(lastError)) {
        console.error(`🚫 [Retry] Прекращаем повторы после ${attempt} попыток`);
        throw lastError;
      }

      // Ждем перед следующей попыткой
      const delayMs = config.delay * Math.pow(config.backoff, attempt - 1);
      console.log(`⏳ [Retry] Ожидание ${delayMs}ms перед попыткой ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}

// Специализированная версия для Prisma операций
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Prisma operation'
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    delay: 500,
    backoff: 2,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return message.includes('database server') ||
             message.includes('connection') ||
             message.includes('timeout') ||
             message.includes('engine is not yet connected') ||
             message.includes('econnrefused') ||
             message.includes('etimedout');
    }
  });
}
