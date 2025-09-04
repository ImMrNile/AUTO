// lib/config/wbApiConfig.ts - ДОПОЛНЕННАЯ КОНФИГУРАЦИЯ БЕЗ ИЗМЕНЕНИЯ СУЩЕСТВУЮЩЕГО КОДА

export const WB_API_CONFIG = {
    BASE_URLS: {
      CONTENT: 'https://content-api.wildberries.ru',
      MARKETPLACE: 'https://marketplace-api.wildberries.ru',
      SUPPLIES: 'https://supplies-api.wildberries.ru'
    },
    
    ENDPOINTS: {
      GET_CATEGORIES: '/content/v2/get/categories',
      GET_PARENT_CATEGORIES: '/content/v2/object/parent-all',
      GET_CATEGORY_CHARACTERISTICS: '/content/v2/object/characteristics',
      CREATE_CARDS: '/content/v2/cards/upload',
      GET_CARDS_LIST: '/content/v2/get/cards/list',
      GET_ERRORS: '/content/v2/cards/error/list',
      GET_COLORS: '/content/v2/directory/colors',
      GET_COUNTRIES: '/content/v2/directory/countries',
      UPLOAD_MEDIA: '/content/v1/media'
    },
    
    TIMEOUTS: {
      DEFAULT: 30000,
      UPLOAD: 60000,
      CARD_CREATION: 60000,
      PING: 30000,
      RETRY_DELAY: 2000
    }
  };
  
  // ИСПРАВЛЕНО: используем "Нет бренда" вместо "NoName"
  export const DEFAULT_VALUES = {
    BRAND: 'Нет бренда',
    COUNTRY: 'Россия',
    COLOR: 'не указан',
    MATERIAL: 'смешанные материалы',
    COMPOSITION: 'не указан',
    WARRANTY: 'гарантия производителя',
    SEASON: 'всесезонный'
  };
  
  export const VALIDATION_RULES = {
    TITLE_MAX_LENGTH: 60,
    DESCRIPTION_MAX_LENGTH: 1000,
    VENDOR_CODE_MAX_LENGTH: 75,
    BRAND_MAX_LENGTH: 50,
    MIN_PRICE: 1,
    MAX_PRICE: 999999
  };
  
  // ДОПОЛНИТЕЛЬНЫЕ ЗНАЧЕНИЯ ДЛЯ РАСШИРЕННОЙ ФУНКЦИОНАЛЬНОСТИ
  export const EXTENDED_DEFAULT_VALUES = {
    SEASON: 'всесезонный',
    GENDER: 'унисекс',
    AGE_GROUP: 'взрослый',
    CARE_INSTRUCTIONS: 'согласно рекомендациям производителя',
    
    // Дефолтная категория
    CATEGORY_ID: 14727,
    CATEGORY_NAME: 'Товары для дома',
    
    // Дефолтные размеры упаковки
    DIMENSIONS: {
      LENGTH: 10,
      WIDTH: 10, 
      HEIGHT: 5,
      WEIGHT: 0.1
    },
    
    // Дефолтные технические характеристики
    TECH_SIZE: '0',
    WB_SIZE: '0'
  };
  
  // ДОПОЛНИТЕЛЬНЫЕ ВАЛИДАЦИОННЫЕ ПРАВИЛА
  export const EXTENDED_VALIDATION_RULES = {
    // Размеры и вес
    MIN_DIMENSION: 0.1,
    MAX_DIMENSION: 1000,
    MIN_WEIGHT: 0.001,
    MAX_WEIGHT: 1000,
    
    // Изображения
    IMAGE_MIN_WIDTH: 450,
    IMAGE_MIN_HEIGHT: 450,
    IMAGE_MAX_SIZE_MB: 10,
    ALLOWED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
    
    // Характеристики
    MAX_CHARACTERISTICS: 30,
    MAX_CHARACTERISTIC_VALUE_LENGTH: 500,
    
    // Штрихкоды
    BARCODE_LENGTH: 13,
    VENDOR_CODE_PATTERN: /^[A-Za-z0-9\-_]+$/
  };
  
  // ОБЯЗАТЕЛЬНЫЕ ХАРАКТЕРИСТИКИ WB
  export const REQUIRED_CHARACTERISTICS = {
    // Универсальные обязательные поля
    UNIVERSAL: {
      BRAND: 85,
      COUNTRY: 91,
      COMPOSITION: 372,
      COLOR: 14177449,
      VENDOR_CODE: 83
    },
    
    // Специфичные для электроники
    ELECTRONICS: {
      WARRANTY: 312,
      POWER: 2758,
      VOLTAGE: 2781,
      CONNECTOR_TYPE: 4748
    },
    
    // Специфичные для одежды
    CLOTHING: {
      SIZE: 48,
      SEASON: 50,
      GENDER: 51
    }
  };
  
  // СТАТУСЫ ТОВАРОВ В СИСТЕМЕ WB
  export const WB_CARD_STATUSES = {
    LOADING: 'loading',
    CREATING: 'creating',
    CREATED: 'created',
    MODERATING: 'moderating',
    DECLINED: 'declined',
    APPROVED: 'approved',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
    ERROR: 'error',
    BLOCKED: 'blocked'
  };
  
  // КОДЫ ОШИБОК WB API
  export const WB_ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', 
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
    DUPLICATE_VENDOR_CODE: 'DUPLICATE_VENDOR_CODE',
    INVALID_BARCODE: 'INVALID_BARCODE',
    INVALID_CHARACTERISTICS: 'INVALID_CHARACTERISTICS',
    INVALID_PRICE: 'INVALID_PRICE',
    INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
    MEDIA_UPLOAD_ERROR: 'MEDIA_UPLOAD_ERROR',
    INTERNAL_API_ERROR: 'INTERNAL_API_ERROR'
  };
  
  // МАППИНГ ПОПУЛЯРНЫХ КАТЕГОРИЙ ДЛЯ БЫСТРОГО ДОСТУПА
  export const POPULAR_CATEGORIES = {
    ELECTRONICS: {
      CABLES: 963,
      ACCESSORIES: 964,
      PHONE_ACCESSORIES: 965,
      COMPUTER_ACCESSORIES: 966
    },
    
    HOME: {
      HOUSEHOLD: 14727,
      KITCHEN: 2674,
      FURNITURE: 2733,
      DECOR: 2675
    },
    
    CLOTHING: {
      MENS: 629,
      WOMENS: 8126,
      KIDS: 566,
      SHOES: 2808
    },
    
    BEAUTY: {
      SKINCARE: 1234,
      MAKEUP: 1235,
      HAIRCARE: 1236,
      PERFUME: 1237
    }
  };
  
  // НАСТРОЙКИ КЕШИРОВАНИЯ
  export const CACHE_CONFIG = {
    CATEGORIES: {
      TTL: 24 * 60 * 60 * 1000, // 24 часа
      KEY_PREFIX: 'wb_categories'
    },
    
    CHARACTERISTICS: {
      TTL: 12 * 60 * 60 * 1000, // 12 часов
      KEY_PREFIX: 'wb_characteristics'
    },
    
    DIRECTORIES: {
      TTL: 24 * 60 * 60 * 1000, // 24 часа
      KEY_PREFIX: 'wb_directories'
    },
    
    API_RESPONSES: {
      TTL: 5 * 60 * 1000, // 5 минут
      KEY_PREFIX: 'wb_api_response'
    }
  };
  
  // УТИЛИТЫ ДЛЯ РАБОТЫ С WB API
  export class WBApiUtils {
    /**
     * Валидация токена WB
     */
    static isValidToken(token: string): boolean {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        const payload = JSON.parse(atob(parts[1]));
        return !!(payload.s && payload.sid && payload.exp);
      } catch {
        return false;
      }
    }
    
    /**
     * Парсинг токена WB
     */
    static parseToken(token: string): any {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          sellerId: payload.sid,
          permissions: payload.s,
          expiresAt: new Date(payload.exp * 1000),
          isExpired: Date.now() > payload.exp * 1000
        };
      } catch {
        return null;
      }
    }
    
    /**
     * Генерация артикула
     */
    static generateVendorCode(prefix: string = 'AI'): string {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${prefix}-${timestamp}-${random}`;
    }
    
    /**
     * Валидация размеров товара
     */
    static validateDimensions(dimensions: { 
      length: number; 
      width: number; 
      height: number; 
      weight: number 
    }): string[] {
      const errors = [];
      const rules = EXTENDED_VALIDATION_RULES;
      
      if (dimensions.length < rules.MIN_DIMENSION || dimensions.length > rules.MAX_DIMENSION) {
        errors.push(`Длина должна быть от ${rules.MIN_DIMENSION} до ${rules.MAX_DIMENSION} см`);
      }
      
      if (dimensions.width < rules.MIN_DIMENSION || dimensions.width > rules.MAX_DIMENSION) {
        errors.push(`Ширина должна быть от ${rules.MIN_DIMENSION} до ${rules.MAX_DIMENSION} см`);
      }
      
      if (dimensions.height < rules.MIN_DIMENSION || dimensions.height > rules.MAX_DIMENSION) {
        errors.push(`Высота должна быть от ${rules.MIN_DIMENSION} до ${rules.MAX_DIMENSION} см`);
      }
      
      if (dimensions.weight < rules.MIN_WEIGHT || dimensions.weight > rules.MAX_WEIGHT) {
        errors.push(`Вес должен быть от ${rules.MIN_WEIGHT} до ${rules.MAX_WEIGHT} кг`);
      }
      
      return errors;
    }
    
    /**
     * Форматирование ошибки API
     */
    static formatApiError(error: any): string {
      if (typeof error === 'string') return error;
      
      if (error.errorText) return error.errorText;
      if (error.message) return error.message;
      if (error.error) return error.error;
      
      if (Array.isArray(error)) {
        return error.map(e => this.formatApiError(e)).join('; ');
      }
      
      return 'Неизвестная ошибка API';
    }
    
    /**
     * Создание ключа для кеша
     */
    static createCacheKey(prefix: string, ...parts: string[]): string {
      return `${prefix}:${parts.join(':')}`;
    }
    
    /**
     * Валидация цены
     */
    static validatePrice(price: number): boolean {
      return price >= VALIDATION_RULES.MIN_PRICE && price <= VALIDATION_RULES.MAX_PRICE;
    }
    
    /**
     * Валидация артикула
     */
    static validateVendorCode(vendorCode: string): boolean {
      return vendorCode.length <= VALIDATION_RULES.VENDOR_CODE_MAX_LENGTH && 
             EXTENDED_VALIDATION_RULES.VENDOR_CODE_PATTERN.test(vendorCode);
    }
    
    /**
     * Обрезка текста до максимальной длины
     */
    static truncateText(text: string, maxLength: number): string {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    }
  
    /**
     * Проверка доступности WB API с retry логикой
     */
    static async checkApiConnectivity(apiToken: string, maxRetries: number = 3): Promise<{
      isAvailable: boolean;
      error?: string;
      responseTime?: number;
      retriesUsed: number;
    }> {
      const startTime = Date.now();
      let retriesUsed = 0;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        retriesUsed = attempt;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), WB_API_CONFIG.TIMEOUTS.PING);
          
          const response = await fetch(`${WB_API_CONFIG.BASE_URLS.CONTENT}/ping`, {
            method: 'GET',
            headers: {
              'Authorization': apiToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'WB-AI-Assistant/2.0',
              'Connection': 'keep-alive'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          if (response.ok || response.status === 401 || response.status === 403) {
            // API доступен (даже если токен неверный)
            return {
              isAvailable: true,
              responseTime,
              retriesUsed
            };
          }
          
          if (attempt < maxRetries) {
            const delay = Math.min(WB_API_CONFIG.TIMEOUTS.RETRY_DELAY * Math.pow(2, attempt), 10000);
            console.log(`🔄 Попытка ${attempt + 1} неуспешна, повторяем через ${delay}мс...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          if (attempt < maxRetries) {
            const delay = Math.min(WB_API_CONFIG.TIMEOUTS.RETRY_DELAY * Math.pow(2, attempt), 10000);
            console.log(`🔄 Ошибка соединения, повторяем через ${delay}мс...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          const responseTime = Date.now() - startTime;
          let errorMessage = 'Ошибка подключения к WB API';
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = 'Таймаут подключения к WB API';
            } else if (error.message.includes('ENOTFOUND')) {
              errorMessage = 'Не удается найти сервер WB API';
            } else if (error.message.includes('ECONNREFUSED')) {
              errorMessage = 'Сервер WB API отклонил соединение';
            } else {
              errorMessage = `Ошибка сети: ${error.message}`;
            }
          }
          
          return {
            isAvailable: false,
            error: errorMessage,
            responseTime,
            retriesUsed
          };
        }
      }
      
      return {
        isAvailable: false,
        error: 'Не удалось подключиться к WB API после нескольких попыток',
        responseTime: Date.now() - startTime,
        retriesUsed
      };
    }
  }
  
  // BACKWARD COMPATIBILITY - для старого кода
  export { DEFAULT_VALUES as WB_DEFAULT_VALUES };
  export { VALIDATION_RULES as WB_VALIDATION_RULES };