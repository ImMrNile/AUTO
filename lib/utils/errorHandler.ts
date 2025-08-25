// lib/utils/errorHandler.ts
import { ProductStatus } from '../types/gemini';

export interface ProcessingError extends Error {
  code: string;
  productId?: string;
  step?: string;
  details?: any;
}

export interface GeminiError {
  code: string;
  message: string;
  details?: any;
}

// Типы ошибок
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  GEMINI_API = 'GEMINI_API_ERROR',
  WB_API = 'WB_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  PROCESSING = 'PROCESSING_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Коды ошибок
export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  GEMINI_QUOTA_EXCEEDED = 'GEMINI_QUOTA_EXCEEDED',
  GEMINI_INVALID_RESPONSE = 'GEMINI_INVALID_RESPONSE',
  WB_UNAUTHORIZED = 'WB_UNAUTHORIZED',
  WB_INVALID_CATEGORY = 'WB_INVALID_CATEGORY',
  WB_INVALID_CHARACTERISTICS = 'WB_INVALID_CHARACTERISTICS',
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',

  // --- ДОБАВЛЕНО ДЛЯ СОВМЕСТИМОСТИ С ДРУГИМИ СЕРВИСАМИ ---
  WB_PARSING_ERROR = 'WB_PARSING_ERROR',
  AI_PROCESSING_ERROR = 'AI_PROCESSING_ERROR',
  MISSING_CONFIG = 'MISSING_CONFIG',
  // --------------------------------------------------------

  WB_API = 'WB_API_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

// Класс для обработки ошибок
export class ErrorHandler {
  
  // Создание ошибки обработки
  static createProcessingError(
    message: string,
    code: ErrorCode,
    productId?: string,
    step?: string,
    details?: any
  ): ProcessingError {
    const error = new Error(message) as ProcessingError;
    error.code = code;
    error.productId = productId;
    error.step = step;
    error.details = details;
    error.name = 'ProcessingError';
    
    return error;
  }
  
  // Создание ошибки Gemini
  static createGeminiError(
    message: string,
    code: ErrorCode,
    details?: any
  ): GeminiError {
    return {
      code,
      message,
      details
    };
  }
  
  // Определение типа ошибки
  static getErrorType(error: Error): ErrorType {
    if (error.message.includes('Gemini') || error.message.includes('GoogleGenerativeAI') || error.message.includes('OpenAI')) {
      return ErrorType.GEMINI_API;
    }
    
    if (error.message.includes('WB') || error.message.includes('Wildberries')) {
      return ErrorType.WB_API;
    }
    
    if (error.message.includes('Prisma') || error.message.includes('Database')) {
      return ErrorType.DATABASE;
    }
    
    if (error.message.includes('upload') || error.message.includes('file')) {
      return ErrorType.FILE_UPLOAD;
    }
    
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return ErrorType.NETWORK;
    }
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    if (error.name === 'ProcessingError') {
      return ErrorType.PROCESSING;
    }
    
    return ErrorType.UNKNOWN;
  }
  
  // Получение пользовательского сообщения
  static getUserMessage(error: Error): string {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case ErrorType.GEMINI_API:
        if (error.message.includes('quota')) {
          return 'Превышен лимит запросов к AI сервису. Попробуйте позже.';
        }
        return 'Ошибка AI анализа. Попробуйте загрузить другое изображение.';
        
      case ErrorType.WB_API:
        if (error.message.includes('unauthorized')) {
          return 'Неверный API токен Wildberries. Проверьте настройки кабинета.';
        }
        if (error.message.includes('category')) {
          return 'Не удалось определить категорию товара. Проверьте данные.';
        }
        return 'Ошибка публикации в Wildberries. Проверьте данные товара.';
        
      case ErrorType.DATABASE:
        return 'Ошибка сохранения данных. Попробуйте еще раз.';
        
      case ErrorType.FILE_UPLOAD:
        if (error.message.includes('size')) {
          return 'Файл слишком большой. Максимальный размер 10MB.';
        }
        if (error.message.includes('format')) {
          return 'Неподдерживаемый формат файла. Используйте JPG, PNG или WebP.';
        }
        return 'Ошибка загрузки файла. Попробуйте другой файл.';
        
      case ErrorType.NETWORK:
        return 'Проблемы с сетью. Проверьте подключение к интернету.';
        
      case ErrorType.VALIDATION:
        return 'Некорректные данные. Проверьте заполнение всех полей.';
        
      case ErrorType.PROCESSING:
        return 'Ошибка обработки товара. Попробуйте еще раз.';
        
      default:
        return 'Произошла неизвестная ошибка. Попробуйте позже.';
    }
  }
  
  // Определение статуса для БД
  static getProductStatus(error: Error): ProductStatus {
    return ProductStatus.ERROR;
  }
  
  // Логирование ошибки
  static logError(error: Error, context?: any): void {
    const errorType = this.getErrorType(error);
    const timestamp = new Date().toISOString();
    
    console.error(`[${timestamp}] [${errorType}] ${error.message}`, {
      error: error.stack,
      context,
      type: errorType
    });
  }
  
  // Обработка ошибки с логированием и возвратом пользовательского сообщения
  static handleError(error: Error, context?: any): {
    userMessage: string;
    status: ProductStatus;
    errorType: ErrorType;
  } {
    this.logError(error, context);
    
    return {
      userMessage: this.getUserMessage(error),
      status: this.getProductStatus(error),
      errorType: this.getErrorType(error)
    };
  }
}

// Класс для логирования процесса
export class ProcessLogger {
  private productId: string;
  private startTime: number;
  
  constructor(productId: string) {
    this.productId = productId;
    this.startTime = Date.now();
  }
  
  // Логирование начала шага
  logStep(step: string, message: string): void {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    console.log(`[${timestamp}] [${this.productId}] [${step}] ${message} (${elapsed}ms)`);
  }
  
  // Логирование успешного завершения
  logSuccess(message: string): void {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    console.log(`[${timestamp}] [${this.productId}] [SUCCESS] ${message} (Total: ${elapsed}ms)`);
  }
  
  // Логирование ошибки с контекстом
  logError(error: Error, step?: string): void {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    console.error(`[${timestamp}] [${this.productId}] [ERROR] ${step ? `[${step}] ` : ''}${error.message} (${elapsed}ms)`, {
      error: error.stack,
      productId: this.productId,
      step
    });
  }
  
  // Логирование предупреждения
  logWarning(message: string, step?: string): void {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    
    console.warn(`[${timestamp}] [${this.productId}] [WARNING] ${step ? `[${step}] ` : ''}${message} (${elapsed}ms)`);
  }
}

// Утилиты для валидации
export class ValidationUtils {
  
  // Валидация входных данных для создания продукта
  static validateProductInput(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Название товара обязательно');
    }
    
    if (!data.image || !(data.image instanceof File)) {
      errors.push('Изображение товара обязательно');
    }
    
    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
      errors.push('Цена должна быть положительным числом');
    }
    
    if (!data.cabinetId || typeof data.cabinetId !== 'string') {
      errors.push('ID кабинета обязательно');
    }
    
    if (!data.dimensions || typeof data.dimensions !== 'object') {
      errors.push('Размеры товара обязательны');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Валидация изображения
  static validateImage(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Файл слишком большой. Максимальный размер 10MB.'
      };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Неподдерживаемый формат файла. Используйте JPG, PNG или WebP.'
      };
    }
    
    return { valid: true };
  }
  
  // Валидация API токена WB
  static validateWBToken(token: string): { valid: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        error: 'API токен обязательно'
      };
    }
    
    if (token.length < 10) {
      return {
        valid: false,
        error: 'API токен слишком короткий'
      };
    }
    
    return { valid: true };
  }
}