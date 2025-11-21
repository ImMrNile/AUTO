/**
 * 📝 СИСТЕМА ЛОГИРОВАНИЯ
 * 
 * Логи видны только в development режиме.
 * В production (на Vercel) логи отключены для пользователей.
 * Серверные логи всегда видны в Vercel Dashboard.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isServer = typeof window === 'undefined';

/**
 * Клиентское логирование (только в development)
 */
export const clientLogger = {
  log: (...args: any[]) => {
    if (isDevelopment && !isServer) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment && !isServer) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment && !isServer) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment && !isServer) {
      console.info(...args);
    }
  }
};

/**
 * Серверное логирование (всегда активно)
 */
export const serverLogger = {
  log: (...args: any[]) => {
    if (isServer) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isServer) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isServer) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isServer) {
      console.info(...args);
    }
  }
};

/**
 * Универсальный логгер (автоматически определяет окружение)
 */
export const logger = {
  log: (...args: any[]) => {
    if (isServer || isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isServer || isDevelopment) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isServer || isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isServer || isDevelopment) {
      console.info(...args);
    }
  }
};
