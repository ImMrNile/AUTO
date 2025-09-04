// lib/utils/error.ts - ОБНОВЛЕННАЯ ВЕРСИЯ с детальной обработкой ошибок WB API

/**
 * Коды ошибок для системы
 */
export enum ErrorCode {
  // Общие ошибки
  UNKNOWN = 'UNKNOWN',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  
  // Ошибки продуктов
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_INVALID_DATA = 'PRODUCT_INVALID_DATA',
  
  // Ошибки WB API
  WB_API_ERROR = 'WB_API_ERROR',
  WB_INVALID_TOKEN = 'WB_INVALID_TOKEN',
  WB_RATE_LIMIT = 'WB_RATE_LIMIT',
  WB_INVALID_CARD_DATA = 'WB_INVALID_CARD_DATA',
  WB_CATEGORY_NOT_FOUND = 'WB_CATEGORY_NOT_FOUND',
  
  // Ошибки ИИ
  AI_ANALYSIS_FAILED = 'AI_ANALYSIS_FAILED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  
  // Ошибки файлов
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  
  // Ошибки базы данных
  DATABASE_ERROR = 'DATABASE_ERROR',
  CABINET_NOT_FOUND = 'CABINET_NOT_FOUND',
  CABINET_INACTIVE = 'CABINET_INACTIVE'
}

/**
 * Интерфейс для стандартизированной ошибки
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  statusCode: number;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Класс для обработки ошибок
 */
export class ErrorHandler {
  /**
   * Создание стандартизированной ошибки
   */
  static createError(
    code: ErrorCode,
    message: string,
    details?: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ): AppError {
    return {
      code,
      message,
      details,
      statusCode,
      timestamp: new Date(),
      context
    };
  }

  /**
   * Обработка ошибок WB API
   */
  static handleWBApiError(error: any, context?: Record<string, any>): AppError {
    console.error('🔴 WB API Error:', error);

    // Анализ типа ошибки по сообщению
    const errorMessage = error.message || error.toString();
    const errorLower = errorMessage.toLowerCase();

    // Ошибки авторизации
    if (errorLower.includes('authorization') || errorLower.includes('unauthorized') || 
        errorLower.includes('403') || errorLower.includes('invalid token')) {
      return this.createError(
        ErrorCode.WB_INVALID_TOKEN,
        'Недействительный API токен Wildberries',
        'Проверьте правильность API токена в настройках кабинета',
        401,
        context
      );
    }

    // Ошибки формата данных
    if (errorLower.includes('format is incorrect') || 
        errorLower.includes('number of product items created should not be 0')) {
      return this.createError(
        ErrorCode.WB_INVALID_CARD_DATA,
        'Некорректный формат данных для создания карточки',
        'Проверьте правильность заполнения всех обязательных полей карточки товара',
        400,
        { originalError: errorMessage, ...context }
      );
    }

    // Ошибки лимитов
    if (errorLower.includes('rate limit') || errorLower.includes('too many requests') ||
        errorLower.includes('429')) {
      return this.createError(
        ErrorCode.WB_RATE_LIMIT,
        'Превышен лимит запросов к API Wildberries',
        'Попробуйте повторить операцию через несколько минут',
        429,
        context
      );
    }

    // Ошибки таймаута
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return this.createError(
        ErrorCode.TIMEOUT,
        'Таймаут запроса к API Wildberries',
        'Сервер Wildberries не отвечает, попробуйте позже',
        408,
        context
      );
    }

    // Ошибки сети
    if (errorLower.includes('network') || errorLower.includes('connection') ||
        errorLower.includes('fetch failed')) {
      return this.createError(
        ErrorCode.NETWORK,
        'Ошибка подключения к API Wildberries',
        'Проверьте подключение к интернету',
        503,
        context
      );
    }

    // Ошибки категории
    if (errorLower.includes('category') || errorLower.includes('imt_id')) {
      return this.createError(
        ErrorCode.WB_CATEGORY_NOT_FOUND,
        'Некорректная категория товара',
        'Указанная категория не существует или недоступна',
        400,
        context
      );
    }

    // Общая ошибка WB API
    return this.createError(
      ErrorCode.WB_API_ERROR,
      'Ошибка API Wildberries',
      errorMessage,
      500,
      context
    );
  }

  /**
   * Обработка ошибок ИИ анализа
   */
  static handleAIError(error: any, context?: Record<string, any>): AppError {
    console.error('🤖 AI Error:', error);

    const errorMessage = error.message || error.toString();
    const errorLower = errorMessage.toLowerCase();

    // Ошибки API ключа
    if (errorLower.includes('api key') || errorLower.includes('unauthorized') ||
        errorLower.includes('authentication')) {
      return this.createError(
        ErrorCode.AI_SERVICE_UNAVAILABLE,
        'Сервис ИИ анализа недоступен',
        'Проблема с конфигурацией ИИ сервиса',
        503,
        context
      );
    }

    // Ошибки обработки изображения
    if (errorLower.includes('image') || errorLower.includes('vision')) {
      return this.createError(
        ErrorCode.AI_ANALYSIS_FAILED,
        'Не удалось проанализировать изображение',
        'Попробуйте загрузить другое изображение лучшего качества',
        400,
        context
      );
    }

    // Общая ошибка ИИ
    return this.createError(
      ErrorCode.AI_ANALYSIS_FAILED,
      'Ошибка ИИ анализа товара',
      errorMessage,
      500,
      context
    );
  }

  /**
   * Обработка ошибок загрузки файлов
   */
  static handleFileError(error: any, context?: Record<string, any>): AppError {
    console.error('📁 File Error:', error);

    const errorMessage = error.message || error.toString();
    const errorLower = errorMessage.toLowerCase();

    // Размер файла
    if (errorLower.includes('too large') || errorLower.includes('file size')) {
      return this.createError(
        ErrorCode.FILE_TOO_LARGE,
        'Файл слишком большой',
        'Максимальный размер файла: 10 МБ',
        413,
        context
      );
    }

    // Тип файла
    if (errorLower.includes('type') || errorLower.includes('format')) {
      return this.createError(
        ErrorCode.FILE_INVALID_TYPE,
        'Неподдерживаемый тип файла',
        'Поддерживаются только изображения: JPG, PNG, WebP, GIF',
        415,
        context
      );
    }

    // Общая ошибка загрузки
    return this.createError(
      ErrorCode.FILE_UPLOAD_FAILED,
      'Ошибка загрузки файла',
      errorMessage,
      500,
      context
    );
  }

  /**
   * Обработка ошибок базы данных
   */
  static handleDatabaseError(error: any, context?: Record<string, any>): AppError {
    console.error('🗄️ Database Error:', error);

    const errorMessage = error.message || error.toString();

    return this.createError(
      ErrorCode.DATABASE_ERROR,
      'Ошибка базы данных',
      'Временная проблема с сохранением данных',
      500,
      { originalError: errorMessage, ...context }
    );
  }

  /**
   * Обработка ошибок валидации
   */
  static handleValidationError(
    fieldName: string, 
    value: any, 
    expectedFormat: string,
    context?: Record<string, any>
  ): AppError {
    return this.createError(
      ErrorCode.INVALID_INPUT,
      `Некорректное значение поля: ${fieldName}`,
      `Ожидается: ${expectedFormat}, получено: ${value}`,
      400,
      { fieldName, value, expectedFormat, ...context }
    );
  }

  /**
   * Обработка неизвестных ошибок
   */
  static handleUnknownError(error: any, context?: Record<string, any>): AppError {
    console.error('❓ Unknown Error:', error);

    return this.createError(
      ErrorCode.UNKNOWN,
      'Неизвестная ошибка',
      error.message || error.toString(),
      500,
      context
    );
  }

  /**
   * Автоматическое определение типа ошибки и её обработка
   */
  static handleError(error: any, context?: Record<string, any>): AppError {
    if (!error) {
      return this.handleUnknownError(new Error('Пустая ошибка'), context);
    }

    const errorMessage = error.message || error.toString();
    const errorLower = errorMessage.toLowerCase();

    // WB API ошибки
    if (errorLower.includes('wildberries') || errorLower.includes('wb api') ||
        errorLower.includes('content-api') || errorLower.includes('authorization')) {
      return this.handleWBApiError(error, context);
    }

    // ИИ ошибки
    if (errorLower.includes('openai') || errorLower.includes('gemini') ||
        errorLower.includes('ai analysis') || errorLower.includes('vision')) {
      return this.handleAIError(error, context);
    }

    // Файловые ошибки
    if (errorLower.includes('file') || errorLower.includes('upload') ||
        errorLower.includes('image')) {
      return this.handleFileError(error, context);
    }

    // Ошибки базы данных
    if (errorLower.includes('prisma') || errorLower.includes('database') ||
        errorLower.includes('sql')) {
      return this.handleDatabaseError(error, context);
    }

    // Ошибки валидации
    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return this.createError(
        ErrorCode.INVALID_INPUT,
        'Ошибка валидации данных',
        errorMessage,
        400,
        context
      );
    }

    // Сетевые ошибки
    if (errorLower.includes('network') || errorLower.includes('fetch') ||
        errorLower.includes('timeout')) {
      return this.createError(
        ErrorCode.NETWORK,
        'Ошибка сети',
        errorMessage,
        503,
        context
      );
    }

    return this.handleUnknownError(error, context);
  }

  /**
   * Получение пользовательского сообщения для ошибки
   */
  static getUserMessage(error: AppError): string {
    const userMessages: Partial<Record<ErrorCode, string>> = {
      [ErrorCode.UNKNOWN]: 'Произошла неожиданная ошибка. Попробуйте позже.',
      [ErrorCode.INVALID_INPUT]: 'Проверьте правильность введенных данных.',
      [ErrorCode.NETWORK]: 'Проблемы с подключением к интернету.',
      [ErrorCode.TIMEOUT]: 'Превышено время ожидания. Попробуйте позже.',
      
      [ErrorCode.PRODUCT_NOT_FOUND]: 'Товар не найден или недоступен.',
      [ErrorCode.PRODUCT_INVALID_DATA]: 'Некорректные данные товара.',
      
      [ErrorCode.WB_API_ERROR]: 'Ошибка подключения к Wildberries.',
      [ErrorCode.WB_INVALID_TOKEN]: 'Проверьте API токен в настройках кабинета.',
      [ErrorCode.WB_RATE_LIMIT]: 'Превышен лимит запросов. Подождите немного.',
      [ErrorCode.WB_INVALID_CARD_DATA]: 'Проверьте правильность данных карточки.',
      [ErrorCode.WB_CATEGORY_NOT_FOUND]: 'Выберите корректную категорию товара.',
      
      [ErrorCode.AI_ANALYSIS_FAILED]: 'Не удалось проанализировать товар с помощью ИИ.',
      [ErrorCode.AI_SERVICE_UNAVAILABLE]: 'Сервис ИИ анализа временно недоступен.',
      
      [ErrorCode.FILE_UPLOAD_FAILED]: 'Не удалось загрузить файл.',
      [ErrorCode.FILE_TOO_LARGE]: 'Файл слишком большой. Максимум 10 МБ.',
      [ErrorCode.FILE_INVALID_TYPE]: 'Поддерживаются только изображения.',
      
      [ErrorCode.DATABASE_ERROR]: 'Временная проблема с сохранением данных.',
      [ErrorCode.CABINET_NOT_FOUND]: 'Кабинет не найден.',
      [ErrorCode.CABINET_INACTIVE]: 'Кабинет неактивен. Проверьте настройки.'
    };

    return userMessages[error.code] || error.message;
  }

  /**
   * Получение рекомендаций по исправлению ошибки
   */
  static getRecommendations(error: AppError): string[] {
    const recommendations: Partial<Record<ErrorCode, string[]>> = {
      [ErrorCode.WB_INVALID_TOKEN]: [
        'Проверьте правильность API токена',
        'Убедитесь, что токен не истек',
        'Создайте новый API токен в личном кабинете WB'
      ],
      [ErrorCode.WB_INVALID_CARD_DATA]: [
        'Заполните все обязательные поля',
        'Проверьте корректность категории товара',
        'Убедитесь, что характеристики соответствуют категории'
      ],
      [ErrorCode.AI_ANALYSIS_FAILED]: [
        'Загрузите более качественное изображение',
        'Убедитесь, что товар хорошо виден на фото',
        'Попробуйте другое изображение'
      ],
      [ErrorCode.FILE_TOO_LARGE]: [
        'Сожмите изображение',
        'Уменьшите разрешение фото',
        'Используйте формат JPEG для уменьшения размера'
      ],
      [ErrorCode.NETWORK]: [
        'Проверьте подключение к интернету',
        'Попробуйте позже',
        'Обратитесь к администратору, если проблема повторяется'
      ],
      [ErrorCode.TIMEOUT]: [
        'Попробуйте повторить операцию',
        'Проверьте стабильность подключения',
        'Увеличьте время ожидания'
      ],
      [ErrorCode.INVALID_INPUT]: [
        'Проверьте правильность введенных данных',
        'Убедитесь, что все поля заполнены корректно'
      ]
    };

    return recommendations[error.code] || ['Попробуйте операцию позже'];
  }

  /**
   * Логирование ошибки с контекстом
   */
  static logError(error: AppError, additionalContext?: Record<string, any>): void {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    const logData = {
      timestamp: error.timestamp,
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
      context: { ...error.context, ...additionalContext }
    };

    if (logLevel === 'error') {
      console.error('🔴 APPLICATION ERROR:', JSON.stringify(logData, null, 2));
    } else {
      console.warn('🟡 APPLICATION WARNING:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Создание ответа API с ошибкой
   */
  static createApiResponse(error: AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: this.getUserMessage(error),
        details: error.details,
        recommendations: this.getRecommendations(error),
        timestamp: error.timestamp
      }
    };
  }
}

/**
 * Утилиты для работы с ошибками
 */
export const ErrorUtils = {
  /**
   * Проверка, является ли ошибка критической
   */
  isCritical: (error: AppError): boolean => {
    const criticalCodes = [
      ErrorCode.DATABASE_ERROR,
      ErrorCode.UNKNOWN
    ];
    return criticalCodes.includes(error.code) || error.statusCode >= 500;
  },

  /**
   * Проверка, можно ли повторить операцию
   */
  isRetryable: (error: AppError): boolean => {
    const retryableCodes = [
      ErrorCode.NETWORK,
      ErrorCode.TIMEOUT,
      ErrorCode.WB_RATE_LIMIT
    ];
    return retryableCodes.includes(error.code);
  },

  /**
   * Получение времени задержки для повтора
   */
  getRetryDelay: (error: AppError, attempt: number): number => {
    const baseDelays: Partial<Record<ErrorCode, number>> = {
      [ErrorCode.NETWORK]: 1000,
      [ErrorCode.TIMEOUT]: 2000,
      [ErrorCode.WB_RATE_LIMIT]: 5000
    };

    const baseDelay = baseDelays[error.code] || 1000;
    return baseDelay * Math.pow(2, attempt); // Экспоненциальная задержка
  }
};

export default ErrorHandler;