// lib/services/wbApiService.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ ИМПОРТАМИ

import { WB_API_CONFIG, WBApiUtils, EXTENDED_DEFAULT_VALUES, DEFAULT_VALUES } from '../config/wbApiConfig';
import { 
  validateCardForWB, 
  logCardStructure
} from '../utils/wbCharacteristicsUtils';

// Интерфейсы для типизации
interface WBApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  taskId?: string;
}

interface CharacteristicValue {
  id: number;
  value: any;
}

interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  weightBrutto: number;
}

// ОБНОВЛЕННЫЙ ИНТЕРФЕЙС: Поддержка двух цен
interface ProductSize {
  techSize?: string;
  wbSize?: string;
  price: number;
  discountedPrice?: number; // НОВОЕ ПОЛЕ: Цена со скидкой
  skus: string[];
}

interface ProductVariant {
  vendorCode: string;
  title: string;
  description?: string;
  brand: string;
  dimensions: ProductDimensions;
  characteristics: CharacteristicValue[];
  sizes: ProductSize[];
}

interface ProductCard {
  subjectID: number;
  variants: ProductVariant[];
}

interface ApiHealthResult {
  healthy: boolean;
  message: string;
  details?: {
    responseTime: number;
    endpoint?: string;
    error?: string;
    timestamp: string;
  };
}

interface CategoryCharacteristic {
  id: number;
  name: string;
  required: boolean;
  type: string;
  maxLength?: number | null;
  values: any[];
  dictionary?: any;
}

interface DbCharacteristic {
  id: number;
  wbCharacteristicId?: number | null;
  name: string;
  type: string;
  isRequired: boolean;
  values?: any[];
}

// НОВЫЕ ИНТЕРФЕЙСЫ для ценовой информации
interface PriceInfo {
  original: number;
  discount?: number | null;
  final: number;
  hasDiscount: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
}

interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

interface SizePricingStats {
  totalSizes: number;
  sizesWithDiscount: number;
  sizesWithoutDiscount: number;
  averagePrice: number;
  averageDiscountedPrice?: number;
  averageDiscountPercent?: number;
  maxDiscount?: number;
  minDiscount?: number;
}

// НОВЫЕ ИНТЕРФЕЙСЫ для медиа
interface MediaUploadResult {
  success: boolean;
  mediaId?: string;
  url?: string;
  error?: string;
}

interface ImageProcessingOptions {
  resize?: {
    width: number;
    height: number;
  };
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
}

// ИСКЛЮЧЕННЫЕ ХАРАКТЕРИСТИКИ (системные)
const EXCLUDED_CHARACTERISTICS_IDS = new Set([
  15001135, // Номер декларации соответствия
  15001136, // Номер сертификата соответствия  
  15001137, // Дата регистрации сертификата
  15001138, // Дата окончания действия сертификата
  15001405, // Ставка НДС
  15001650, // ИКПУ
  15001706, // Код упаковки
  14177453, // SKU
  15000001  // ТНВЭД
]);

// FALLBACK для числовых характеристик (если нет в БД)
const FALLBACK_NUMERIC_IDS = new Set([
  89008, 13491, 90746, 72739, 90878, 63292, 65667, 65666, 75146,
  89064, 90630, 90652, 90607, 90608, 11001, 11002, 90653, 90654, 90655,
  15003008, 15003011, 5478, 5479, 5480, 5481, 5482, 6234, 6235, 6236, 6237,
  7891, 7894, 7895, 7896, 8456, 8457, 8458, 9123, 9124, 9125,
  10234, 10235, 10236, 10237, 11003, 12001, 12002, 12003,
  13001, 13002, 13003, 14001, 14002, 14003, 15001, 15002, 15003
]);

export class WbApiService {
  private readonly BASE_URL = WB_API_CONFIG.BASE_URLS.CONTENT;
  private readonly TIMEOUT = WB_API_CONFIG.TIMEOUTS.DEFAULT;

  // Кеш типов характеристик из БД
  private characteristicTypesCache = new Map<number, string>();
  
  // Кеш категорий и характеристик
  private categoriesCache = new Map<number, any>();
  private characteristicsCache = new Map<number, CategoryCharacteristic[]>();

  /**
   * Валидация токена WB
   */
  private validateToken(token: string): boolean {
    try {
      const segments = token.split('.');
      if (segments.length !== 3) {
        console.error('❌ Токен должен содержать 3 сегмента, получено:', segments.length);
        return false;
      }
      
      const payload = JSON.parse(atob(segments[1]));
      if (!payload.sid || !payload.exp) {
        console.error('❌ Отсутствуют обязательные поля в токене');
        return false;
      }
      
      if (Date.now() > payload.exp * 1000) {
        console.error('❌ Токен истек');
        return false;
      }
      
      console.log('✅ Токен валиден, ID продавца:', payload.sid);
      return true;
    } catch (error) {
      console.error('❌ Ошибка валидации токена:', error);
      return false;
    }
  }

  /**
   * Универсальный метод для запросов к WB API
   */
  private async makeRequest(endpoint: string, apiToken: string, options: RequestInit = {}): Promise<any> {
    if (!this.validateToken(apiToken)) {
      throw new Error('Недействительный токен API. Проверьте формат и срок действия.');
    }

    const url = `${this.BASE_URL}${endpoint}`;
    
    const headers = {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'WB-AI-Assistant/2.0',
      ...options.headers,
    };

    console.log(`🌐 Отправляем запрос в WB API: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseClone = response.clone();

      if (!response.ok) {
        let errorData = null;
        let responseText = '';
        
        try {
          responseText = await responseClone.text();
          console.log('📥 Полный текст ответа от WB API:', responseText);
          
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.warn('⚠️ Не удалось распарсить ответ как JSON, используем текст');
          errorData = { message: responseText || 'Пустой ответ от сервера' };
        }
        
        // Детальная обработка ошибок
        const formattedError = this.formatWBApiError(response.status, errorData, responseText);
        throw new Error(formattedError);
      }

      const data = await response.json();
      console.log('✅ Успешный ответ от WB API');
      return data;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания ответа от WB API');
        }
        throw error;
      }
      throw new Error('Неизвестная ошибка при запросе к WB API');
    }
  }

  /**
   * Форматирование ошибок WB API
   */
  private formatWBApiError(status: number, errorData: any, responseText: string): string {
    switch (status) {
      case 400:
        console.error('❌ Ошибка 400 - Неверные данные запроса:', errorData);
        const detailedError = errorData?.errors ? 
          `Ошибки валидации: ${JSON.stringify(errorData.errors)}` :
          `Неверные данные: ${errorData?.message || errorData?.detail || responseText}`;
        return detailedError;
        
      case 401:
        console.error('❌ Ошибка авторизации WB API:', errorData);
        return `Неверный токен API: ${errorData?.detail || errorData?.message || 'Проверьте токен в личном кабинете'}`;
        
      case 403:
        console.error('❌ Ошибка доступа WB API:', errorData);
        return `Недостаточно прав доступа: ${errorData?.detail || errorData?.message || 'Проверьте права токена'}`;
        
      case 404:
        console.error('❌ Ресурс не найден WB API:', errorData);
        return `Ресурс не найден: ${errorData?.detail || errorData?.message || 'Проверьте правильность запроса'}`;
        
      case 409:
        console.error('❌ Конфликт данных WB API:', errorData);
        return `Конфликт данных: ${errorData?.detail || errorData?.message || 'Возможно, артикул уже существует'}`;
        
      case 422:
        console.error('❌ Ошибка валидации WB API:', errorData);
        return `Ошибка валидации данных: ${errorData?.detail || errorData?.message || 'Проверьте корректность данных'}`;
        
      case 429:
        console.error('❌ Превышен лимит запросов WB API');
        return 'Превышен лимит запросов. Повторите через минуту.';
        
      case 500:
      case 502:
      case 503:
      case 504:
        console.error('❌ Серверная ошибка WB API:', errorData);
        return `Временная ошибка сервера WB (${status}). Повторите позже.`;
        
      default:
        const errorText = errorData?.detail || errorData?.message || responseText || 'Неизвестная ошибка';
        return `Ошибка WB API (${status}): ${errorText}`;
    }
  }

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание карточки товара с поддержкой двух цен
   */
  async createProductCard(cardData: any, apiToken: string, categoryCharacteristics?: DbCharacteristic[]): Promise<WBApiResponse> {
    try {
      console.log('📦 Создаем карточку товара через WB API v2 с поддержкой двух цен...');
      
      if (!cardData.subjectID) {
        throw new Error('Не указан ID категории (subjectID)');
      }
      
      if (!cardData.variants || cardData.variants.length === 0) {
        throw new Error('Не указаны варианты товара');
      }

      const variant = cardData.variants[0];
      if (!variant.vendorCode) {
        throw new Error('Не указан артикул товара');
      }

      // Валидация артикула
      if (!WBApiUtils.validateVendorCode(variant.vendorCode)) {
        throw new Error('Некорректный формат артикула');
      }

      // Кешируем типы характеристик если переданы
      if (categoryCharacteristics && categoryCharacteristics.length > 0) {
        this.cacheCharacteristicTypes(categoryCharacteristics);
      }

      // Создаем корректную структуру карточки с поддержкой двух цен
      const correctedCardData = this.createCorrectedCardData(cardData);
      
      logCardStructure(correctedCardData, 'ИСПРАВЛЕННЫЕ данные карточки с ценами');

      // Дополнительная валидация для двух цен
      const cardValidation = this.validateCardData(correctedCardData);
      if (!cardValidation.isValid) {
        console.error('❌ Ошибки валидации карточки:', cardValidation.errors);
        throw new Error(`Ошибки валидации: ${cardValidation.errors.join('; ')}`);
      }

      // Анализируем ценовую структуру
      const pricingStats = this.analyzePricingStructure(correctedCardData.variants[0].sizes);
      this.logPricingStats(pricingStats);

      const response = await this.makeRequest(
        WB_API_CONFIG.ENDPOINTS.CREATE_CARDS,
        apiToken,
        {
          method: 'POST',
          body: JSON.stringify([correctedCardData])
        }
      );

      console.log('📥 Полный ответ от WB API:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('❌ Ошибка в ответе WB API:', response.error);
        return { 
          success: false, 
          error: WBApiUtils.formatApiError(response.error)
        };
      }

      if (Array.isArray(response) && response.length > 0 && response[0].error) {
        console.error('❌ Ошибка в массиве ответов:', response[0].error);
        return { 
          success: false, 
          error: WBApiUtils.formatApiError(response[0].error)
        };
      }

      console.log('✅ Карточка с поддержкой двух цен успешно создана');
      console.log(`💰 Отправлено размеров с ценовой информацией: ${pricingStats.totalSizes}`);
      console.log(`📊 Размеров со скидкой: ${pricingStats.sizesWithDiscount}`);
      
      return { 
        success: true, 
        data: response,
        taskId: response.taskId || (Array.isArray(response) ? response[0]?.taskId : null)
      };

    } catch (error) {
      console.error('❌ Ошибка создания карточки с двумя ценами:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }

  /**
   * Кеширование типов характеристик из БД
   */
  private cacheCharacteristicTypes(characteristics: DbCharacteristic[]): void {
    console.log('💾 Кеширование типов характеристик из БД...');
    for (const char of characteristics) {
      const id = char.wbCharacteristicId || char.id;
      const type = char.type || 'string';
      this.characteristicTypesCache.set(id, type);
      console.log(`📋 Кеш: ID ${id} → тип "${type}"`);
    }
    console.log(`✅ Закешировано ${this.characteristicTypesCache.size} типов характеристик`);
  }

  /**
   * Определение типа характеристики (БД → fallback)
   */
  private getCharacteristicType(characteristicId: number): 'number' | 'string' {
    // Сначала проверяем кеш из БД
    const cachedType = this.characteristicTypesCache.get(characteristicId);
    if (cachedType) {
      console.log(`📋 Тип из БД: ID ${characteristicId} → ${cachedType}`);
      return cachedType === 'number' ? 'number' : 'string';
    }

    // Fallback для старых данных
    const isNumeric = FALLBACK_NUMERIC_IDS.has(characteristicId);
    console.log(`📋 Тип fallback: ID ${characteristicId} → ${isNumeric ? 'number' : 'string'}`);
    return isNumeric ? 'number' : 'string';
  }

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Создание корректной структуры данных для WB API с двумя ценами
   */
  private createCorrectedCardData(originalData: any): ProductCard {
    const variant = originalData.variants[0];
    
    // Обработка характеристик с типами из БД
    const correctedCharacteristics = this.correctCharacteristicsWithDbTypes(variant.characteristics || []);
    
    // ОБНОВЛЕННАЯ корректировка размеров с поддержкой двух цен
    const correctedSizes = this.correctSizesWithDualPricing(variant.sizes || []);
    
    // Валидация и коррекция размеров упаковки
    const dimensions = this.validateAndCorrectDimensions(variant.dimensions);
    
    const correctedData: ProductCard = {
      subjectID: originalData.subjectID,
      variants: [{
        vendorCode: variant.vendorCode,
        title: WBApiUtils.truncateText(variant.title || 'Товар', 120),
        description: WBApiUtils.truncateText(variant.description || 'Описание товара', 5000),
        brand: variant.brand || DEFAULT_VALUES.BRAND || 'Нет бренда',
        dimensions: dimensions,
        characteristics: correctedCharacteristics,
        sizes: correctedSizes // Теперь с поддержкой discountedPrice
      }]
    };

    return correctedData;
  }

  /**
   * Валидация и коррекция размеров упаковки
   */
private validateAndCorrectDimensions(dimensions: any): ProductDimensions {
  const defaultDims = EXTENDED_DEFAULT_VALUES.DIMENSIONS;
  
  // 🛡️ ИСПРАВЛЕННАЯ ЛОГИКА ОБРАБОТКИ ВЕСА
  const userWeight = Number(dimensions?.weightBrutto || dimensions?.weight);
  let weightInGrams: number;
  
  console.log(`📐 Исходный вес от пользователя: ${userWeight} (тип: ${typeof userWeight})`);
  
  if (userWeight && !isNaN(userWeight)) {
    // ✅ НОВАЯ ЛОГИКА: Определяем единицы измерения
    if (userWeight <= 10) {
      // Если значение ≤ 10, скорее всего это килограммы
      weightInGrams = Math.round(userWeight * 1000);
      console.log(`📐 Вес интерпретирован как килограммы: ${userWeight} кг → ${weightInGrams} г`);
    } else if (userWeight >= 1000) {
      // Если значение ≥ 1000, скорее всего уже граммы
      weightInGrams = Math.round(userWeight);
      console.log(`📐 Вес принят как граммы: ${weightInGrams} г`);
    } else {
      // Промежуточные значения (10-1000) - неопределенность
      // Проверяем контекст или используем умную логику
      if (userWeight < 100) {
        // Вероятно килограммы (10-100 кг - разумный диапазон для товаров)
        weightInGrams = Math.round(userWeight * 1000);
        console.log(`📐 Вес интерпретирован как килограммы (диапазон 10-100): ${userWeight} кг → ${weightInGrams} г`);
      } else {
        // Вероятно граммы (100-1000 г - тоже разумный диапазон)
        weightInGrams = Math.round(userWeight);
        console.log(`📐 Вес принят как граммы (диапазон 100-1000): ${weightInGrams} г`);
      }
    }
  } else {
    // Дефолтное значение если вес не указан или некорректен
    weightInGrams = defaultDims.WEIGHT || 500;
    console.log(`📐 Использован дефолтный вес: ${weightInGrams} г`);
  }
  
  // ✅ ВАЛИДАЦИЯ: WB требует вес в граммах от 1 до 1000000
  weightInGrams = Math.max(1, Math.min(1000000, weightInGrams));
  
  const corrected = {
    length: Math.max(1, Math.round(Number(dimensions?.length) || defaultDims.LENGTH)),
    width: Math.max(1, Math.round(Number(dimensions?.width) || defaultDims.WIDTH)),
    height: Math.max(1, Math.round(Number(dimensions?.height) || defaultDims.HEIGHT)),
    weightBrutto: weightInGrams // ✅ Вес в граммах для WB API
  };

  // Валидация размеров
  const validationErrors = WBApiUtils.validateDimensions({
    length: corrected.length,
    width: corrected.width,
    height: corrected.height,
    weight: corrected.weightBrutto / 1000 // Передаем в кг для валидации
  });

  if (validationErrors.length > 0) {
    console.warn('⚠️ Ошибки валидации размеров:', validationErrors);
  }

  console.log(`📐 Финальные размеры для WB API:`);
  console.log(`   - Длина: ${corrected.length} см`);
  console.log(`   - Ширина: ${corrected.width} см`);
  console.log(`   - Высота: ${corrected.height} см`);
  console.log(`   - Вес: ${corrected.weightBrutto} г (${(corrected.weightBrutto/1000).toFixed(2)} кг)`);
  
  return corrected;
}

/**
 * 🛡️ НОВАЯ ФУНКЦИЯ: Умная нормализация веса
 */
private smartWeightNormalization(inputWeight: any, context?: string): number {
  const weight = parseFloat(String(inputWeight).replace(/[^\d.,]/g, '').replace(',', '.'));
  
  if (isNaN(weight) || weight <= 0) {
    console.warn(`⚠️ Некорректный вес: "${inputWeight}", используем 500г`);
    return 500;
  }
  
  // Контекстная логика определения единиц
  const contextHints = {
    hasKgIndicator: String(inputWeight).toLowerCase().includes('кг'),
    hasGramIndicator: String(inputWeight).toLowerCase().includes('г'),
    hasDecimalPoint: String(inputWeight).includes('.') || String(inputWeight).includes(',')
  };
  
  console.log(`🔍 Анализ веса "${inputWeight}":`, {
    numericValue: weight,
    ...contextHints
  });
  
  // Если есть явные указатели единиц
  if (contextHints.hasKgIndicator) {
    const result = Math.round(weight * 1000);
    console.log(`✅ Явный индикатор "кг": ${weight} кг → ${result} г`);
    return result;
  }
  
  if (contextHints.hasGramIndicator) {
    const result = Math.round(weight);
    console.log(`✅ Явный индикатор "г": ${result} г`);
    return result;
  }
  
  // Логика по численному значению
  if (weight <= 0.001) {
    // Очень маленькие значения - вероятно килограммы в десятичной записи
    const result = Math.round(weight * 1000000); // микрограммы → граммы
    console.log(`🔬 Микрозначение: ${weight} → ${result} г`);
    return Math.max(1, result);
  }
  
  if (weight <= 10) {
    // 0.001 - 10: вероятно килограммы
    const result = Math.round(weight * 1000);
    console.log(`⚖️ Интерпретация как кг: ${weight} кг → ${result} г`);
    return result;
  }
  
  if (weight <= 100) {
    // 10 - 100: неопределенность, используем контекст
    if (contextHints.hasDecimalPoint) {
      // Если есть десятичная точка, вероятно килограммы
      const result = Math.round(weight * 1000);
      console.log(`📊 Десятичное значение как кг: ${weight} кг → ${result} г`);
      return result;
    } else {
      // Целое число - вероятно граммы
      const result = Math.round(weight);
      console.log(`🔢 Целое число как граммы: ${result} г`);
      return result;
    }
  }
  
  if (weight <= 1000) {
    // 100 - 1000: скорее всего граммы
    const result = Math.round(weight);
    console.log(`📦 Стандартный диапазон граммов: ${result} г`);
    return result;
  }
  
  // > 1000: точно граммы
  const result = Math.round(weight);
  console.log(`📈 Большое значение как граммы: ${result} г`);
  return result;
}

/**
 * 🛡️ НОВАЯ ФУНКЦИЯ: Валидация веса для WB
 */
private validateWeightForWB(weightInGrams: number): { 
  isValid: boolean; 
  correctedWeight: number; 
  warnings: string[] 
} {
  const warnings: string[] = [];
  let correctedWeight = weightInGrams;
  
  // WB ограничения: 1г - 1000кг (1,000,000г)
  const MIN_WEIGHT = 1;
  const MAX_WEIGHT = 1000000;
  
  if (weightInGrams < MIN_WEIGHT) {
    warnings.push(`Вес ${weightInGrams}г меньше минимального (${MIN_WEIGHT}г)`);
    correctedWeight = MIN_WEIGHT;
  }
  
  if (weightInGrams > MAX_WEIGHT) {
    warnings.push(`Вес ${weightInGrams}г больше максимального (${MAX_WEIGHT}г = 1000кг)`);
    correctedWeight = MAX_WEIGHT;
  }
  
  // Проверка на разумность
  if (weightInGrams > 50000) { // > 50 кг
    warnings.push(`Вес ${weightInGrams}г (${(weightInGrams/1000).toFixed(1)}кг) кажется очень большим для обычного товара`);
  }
  
  if (weightInGrams < 10) { // < 10 г
    warnings.push(`Вес ${weightInGrams}г кажется очень маленьким для обычного товара`);
  }
  
  return {
    isValid: warnings.length === 0,
    correctedWeight,
    warnings
  };
}

/**
 * 🛡️ ФУНКЦИЯ ДЛЯ ОТЛАДКИ: Лог всех преобразований веса
 */
private logWeightConversion(originalInput: any, finalWeight: number): void {
  console.log(`\n📊 ОТЧЕТ О ПРЕОБРАЗОВАНИИ ВЕСА:`);
  console.log(`   🔢 Исходные данные: ${JSON.stringify(originalInput)}`);
  console.log(`   ⚖️ Финальный вес: ${finalWeight} г (${(finalWeight/1000).toFixed(3)} кг)`);
  console.log(`   📈 Коэффициент: ${originalInput?.weight ? (finalWeight / Number(originalInput.weight)).toFixed(2) : 'N/A'}`);
  console.log(`   ✅ Соответствует WB API: ${finalWeight >= 1 && finalWeight <= 1000000 ? 'ДА' : 'НЕТ'}`);
}

  /**
   * Корректировка характеристик с типами из БД
   */
  private correctCharacteristicsWithDbTypes(characteristics: any[]): CharacteristicValue[] {
    const corrected: CharacteristicValue[] = [];
    
    console.log('🔧 Обрабатываем характеристики с типами из БД:', characteristics.length);
    
    for (const char of characteristics) {
      // Проверяем исключенные характеристики
      if (EXCLUDED_CHARACTERISTICS_IDS.has(char.id)) {
        console.log(`🚫 Пропускаем исключенную характеристику ID ${char.id}`);
        continue;
      }
      
      // Определяем тип характеристики
      const characteristicType = this.getCharacteristicType(char.id);
      
      if (characteristicType === 'number') {
        // ЧИСЛОВЫЕ характеристики - отправляем как ЧИСТОЕ ЧИСЛО
        const numericValue = this.extractNumericValue(char.value);
        if (numericValue !== null) {
          corrected.push({
            id: char.id,
            value: numericValue
          });
          console.log(`✅ ЧИСЛОВАЯ характеристика ID ${char.id}: "${char.value}" → ${numericValue} (${typeof numericValue})`);
        } else {
          console.warn(`⚠️ Не удалось извлечь число из "${char.value}" для числовой характеристики ${char.id}`);
          corrected.push({
            id: char.id,  
            value: 1
          });
          console.log(`🔧 Установлено дефолтное числовое значение 1 для характеристики ${char.id}`);
        }
      } else {
        // СТРОКОВЫЕ характеристики - отправляем как массив строк
        const value = Array.isArray(char.value) ? char.value[0] : char.value;
        if (value && String(value).trim() !== '') {
          corrected.push({
            id: char.id,
            value: [String(value).trim()]
          });
          console.log(`✅ СТРОКОВАЯ характеристика ID ${char.id}: [${String(value).trim()}]`);
        }
      }
    }
    
    // Добавляем обязательные характеристики
    this.addRequiredCharacteristics(corrected);
    
    console.log(`✅ Итого обработано характеристик: ${corrected.length}`);
    return corrected;
  }

  /**
   * Добавление обязательных характеристик
   */
  private addRequiredCharacteristics(characteristics: CharacteristicValue[]): void {
    const existingIds = characteristics.map(c => c.id);
    
    if (!existingIds.includes(85)) {
      characteristics.push({
        id: 85,
        value: [DEFAULT_VALUES.BRAND || "Нет бренда"]
      });
      console.log('➕ Добавлена обязательная характеристика ID 85: [Нет бренда]');
    }
    
    if (!existingIds.includes(91)) {
      characteristics.push({
        id: 91,
        value: [DEFAULT_VALUES.COUNTRY || "Россия"]
      });
      console.log('➕ Добавлена обязательная характеристика ID 91: [Россия]');
    }
  }

  /**
   * Извлечение числового значения
   */
  private extractNumericValue(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    const stringValue = String(value).replace(/\s+/g, '').trim();
    
    if (stringValue === '') {
      return null;
    }

    // Простое число
    let match = stringValue.match(/^(\d+(?:[.,]\d+)?)$/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }

    // Число с единицами измерения
    match = stringValue.match(/^(\d+(?:[.,]\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }

    console.warn(`⚠️ Не удалось извлечь число из: "${stringValue}"`);
    return null;
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Корректировка размеров с поддержкой двух цен
   */
  private correctSizesWithDualPricing(originalSizes: any[]): ProductSize[] {
    if (!originalSizes || originalSizes.length === 0) {
      console.error('❌ Отсутствуют размеры товара');
      throw new Error('Размеры товара обязательны для создания карточки');
    }

    const firstSize = originalSizes[0];
    const isSizeless = !firstSize.techSize && !firstSize.wbSize;

    console.log(`📏 Корректировка размеров (${originalSizes.length} шт.) с ценовой информацией:`);

    if (isSizeless) {
      console.log('📦 Безразмерный товар - создаем размер без techSize/wbSize');
      
      const correctedSize: ProductSize = {
        price: Math.max(1, Math.round(Number(firstSize.price) || 1000)),
        skus: firstSize.skus || []
      };

      // Валидация цены
      if (!WBApiUtils.validatePrice(correctedSize.price)) {
        throw new Error(`Некорректная цена: ${correctedSize.price}. Допустимый диапазон: 1-999999 рублей`);
      }

      // Добавляем цену со скидкой если есть
      if (firstSize.discountedPrice && firstSize.discountedPrice < firstSize.price) {
        correctedSize.discountedPrice = Math.max(1, Math.round(Number(firstSize.discountedPrice)));
        
        if (!WBApiUtils.validatePrice(correctedSize.discountedPrice)) {
          throw new Error(`Некорректная цена со скидкой: ${correctedSize.discountedPrice}`);
        }
        
        const discountPercent = Math.round(((correctedSize.price - correctedSize.discountedPrice) / correctedSize.price) * 100);
        console.log(`   💰 Безразмерный: ${correctedSize.price}₽ → ${correctedSize.discountedPrice}₽ (-${discountPercent}%)`);
      } else {
        console.log(`   💰 Безразмерный: ${correctedSize.price}₽`);
      }

      return [correctedSize];
    } else {
      console.log(`👕 Товар с размерами - обрабатываем ${originalSizes.length} размеров`);
      
      return originalSizes.map((size, index) => {
        const correctedSize: ProductSize = {
          techSize: size.techSize || EXTENDED_DEFAULT_VALUES.TECH_SIZE,
          wbSize: size.wbSize || EXTENDED_DEFAULT_VALUES.WB_SIZE, 
          price: Math.max(1, Math.round(Number(size.price) || 1000)),
          skus: size.skus || []
        };

        // Валидация цены
        if (!WBApiUtils.validatePrice(correctedSize.price)) {
          throw new Error(`Некорректная цена в размере ${index + 1}: ${correctedSize.price}`);
        }

        // Добавляем цену со скидкой если есть
        if (size.discountedPrice && size.discountedPrice < size.price) {
          correctedSize.discountedPrice = Math.max(1, Math.round(Number(size.discountedPrice)));
          
          if (!WBApiUtils.validatePrice(correctedSize.discountedPrice)) {
            throw new Error(`Некорректная цена со скидкой в размере ${index + 1}: ${correctedSize.discountedPrice}`);
          }
          
          const discountPercent = Math.round(((correctedSize.price - correctedSize.discountedPrice) / correctedSize.price) * 100);
          console.log(`   📏 Размер "${correctedSize.techSize}": ${correctedSize.price}₽ → ${correctedSize.discountedPrice}₽ (-${discountPercent}%)`);
        } else {
          console.log(`   📏 Размер "${correctedSize.techSize}": ${correctedSize.price}₽`);
        }

        return correctedSize;
      });
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Валидация карточки с проверкой цен
   */
  private validateCardData(cardData: ProductCard): { isValid: boolean; errors: string[] } {
    const errors = [];

    if (!cardData.subjectID) {
      errors.push('Отсутствует ID категории (subjectID)');
    }

    if (!cardData.variants || cardData.variants.length === 0) {
      errors.push('Отсутствуют варианты товара');
      return { isValid: false, errors };
    }

    const variant = cardData.variants[0];

    if (!variant.vendorCode) {
      errors.push('Отсутствует артикул товара');
    } else if (!WBApiUtils.validateVendorCode(variant.vendorCode)) {
      errors.push('Некорректный формат артикула');
    }

    if (!variant.title || variant.title.length < 10) {
      errors.push('Название товара слишком короткое (минимум 10 символов)');
    }

    if (variant.title && variant.title.length > 120) {
      errors.push('Название товара слишком длинное (максимум 120 символов)');
    }

    if (!variant.sizes || variant.sizes.length === 0) {
      errors.push('Отсутствуют размеры товара');
    } else {
      // ОБНОВЛЕННАЯ ВАЛИДАЦИЯ размеров с проверкой цен
      for (const [index, size] of variant.sizes.entries()) {
        if (!size.price || size.price < 1) {
          errors.push(`Некорректная основная цена в размере ${index + 1} (минимум 1 рубль)`);
        }
        
        if (!WBApiUtils.validatePrice(size.price)) {
          errors.push(`Цена в размере ${index + 1} вне допустимого диапазона: ${size.price}`);
        }
        
        // Проверка цены со скидкой
        if (size.discountedPrice) {
          if (size.discountedPrice < 1) {
            errors.push(`Некорректная цена со скидкой в размере ${index + 1} (минимум 1 рубль)`);
          }
          if (size.discountedPrice >= size.price) {
            errors.push(`Цена со скидкой в размере ${index + 1} должна быть меньше основной цены`);
          }
          if (!WBApiUtils.validatePrice(size.discountedPrice)) {
            errors.push(`Цена со скидкой в размере ${index + 1} вне допустимого диапазона: ${size.discountedPrice}`);
          }
        }
        
        if (!size.skus || !Array.isArray(size.skus) || size.skus.length === 0) {
          errors.push(`Отсутствуют штрихкоды в размере ${index + 1}`);
        }
      }
    }

    // Валидация характеристик
    if (!variant.characteristics || !Array.isArray(variant.characteristics)) {
      errors.push('Отсутствуют характеристики товара');
    } else if (variant.characteristics.length < 3) {
      errors.push('Слишком мало характеристик (рекомендуется минимум 3)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Анализ ценовой структуры
   */
  private analyzePricingStructure(sizes: ProductSize[]): SizePricingStats {
    const sizesWithDiscount = sizes.filter(size => size.discountedPrice);
    const sizesWithoutDiscount = sizes.filter(size => !size.discountedPrice);

    const totalPrice = sizes.reduce((sum, size) => sum + size.price, 0);
    const averagePrice = totalPrice / sizes.length;

    let averageDiscountedPrice = undefined;
    let averageDiscountPercent = undefined;
    let maxDiscount = undefined;
    let minDiscount = undefined;

    if (sizesWithDiscount.length > 0) {
      const totalDiscountedPrice = sizesWithDiscount.reduce((sum, size) => sum + (size.discountedPrice || 0), 0);
      averageDiscountedPrice = totalDiscountedPrice / sizesWithDiscount.length;

      const discountPercents = sizesWithDiscount.map(size => 
        ((size.price - (size.discountedPrice || 0)) / size.price) * 100
      );
      
      averageDiscountPercent = discountPercents.reduce((sum, percent) => sum + percent, 0) / discountPercents.length;
      maxDiscount = Math.max(...discountPercents);
      minDiscount = Math.min(...discountPercents);
    }

    return {
      totalSizes: sizes.length,
      sizesWithDiscount: sizesWithDiscount.length,
      sizesWithoutDiscount: sizesWithoutDiscount.length,
      averagePrice,
      averageDiscountedPrice,
      averageDiscountPercent,
      maxDiscount,
      minDiscount
    };
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Логирование статистики цен
   */
  private logPricingStats(stats: SizePricingStats): void {
    console.log(`💰 Ценовая статистика карточки:`);
    console.log(`   - Всего размеров: ${stats.totalSizes}`);
    console.log(`   - С поддержкой скидки: ${stats.sizesWithDiscount}`);
    console.log(`   - Без скидки: ${stats.sizesWithoutDiscount}`);
    console.log(`   - Средняя цена: ${stats.averagePrice.toFixed(2)}₽`);
    
    if (stats.averageDiscountedPrice && stats.averageDiscountPercent) {
      console.log(`   - Средняя цена со скидкой: ${stats.averageDiscountedPrice.toFixed(2)}₽`);
      console.log(`   - Средний размер скидки: ${stats.averageDiscountPercent.toFixed(1)}%`);
      console.log(`   - Максимальная скидка: ${stats.maxDiscount?.toFixed(1)}%`);
      console.log(`   - Минимальная скидка: ${stats.minDiscount?.toFixed(1)}%`);
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Валидация ценовой информации
   */
  public validatePriceInfo(priceInfo: PriceInfo): PriceValidationResult {
    const errors = [];
    const warnings = [];
    
    if (!priceInfo.original || priceInfo.original < 1) {
      errors.push('Оригинальная цена должна быть больше 0');
    }
    
    if (!WBApiUtils.validatePrice(priceInfo.original)) {
      errors.push(`Оригинальная цена вне допустимого диапазона: ${priceInfo.original}`);
    }
    
    if (priceInfo.discount) {
      if (priceInfo.discount < 1) {
        errors.push('Цена со скидкой должна быть больше 0');
      }
      
      if (priceInfo.discount >= priceInfo.original) {
        errors.push('Цена со скидкой должна быть меньше оригинальной цены');
      }
      
      if (!WBApiUtils.validatePrice(priceInfo.discount)) {
        errors.push(`Цена со скидкой вне допустимого диапазона: ${priceInfo.discount}`);
      }
      
      const discountPercent = ((priceInfo.original - priceInfo.discount) / priceInfo.original) * 100;
      
      if (discountPercent > 90) {
        warnings.push('Слишком большая скидка (более 90%) может вызвать подозрения у покупателей');
      }
      
      if (discountPercent < 5) {
        warnings.push('Слишком маленькая скидка (менее 5%) может быть незаметна для покупателей');
      }
    }
    
    if (!priceInfo.final || priceInfo.final < 1) {
      errors.push('Финальная цена должна быть больше 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Получение характеристик категории с кешированием
   */
  async getCategoryCharacteristics(subjectId: number, apiToken: string, locale: string = 'ru'): Promise<CategoryCharacteristic[]> {
    try {
      // Проверяем кеш
      if (this.characteristicsCache.has(subjectId)) {
        console.log(`💾 Используем кешированные характеристики для категории ${subjectId}`);
        return this.characteristicsCache.get(subjectId)!;
      }

      console.log(`📋 Загружаем характеристики для категории ${subjectId}...`);
      
      const response = await this.makeRequest(
        `${WB_API_CONFIG.ENDPOINTS.GET_CATEGORY_CHARACTERISTICS}/${subjectId}?locale=${locale}`,
        apiToken
      );
      
      const characteristics = response.data || [];
      console.log(`✅ Загружено ${characteristics.length} характеристик`);
      
      const formattedCharacteristics = characteristics.map((char: any) => ({
        id: char.id,
        name: char.name,
        required: char.required || false,
        type: char.type || 'string',
        maxLength: char.maxLength || null,
        values: char.values || [],
        dictionary: char.dictionary || null
      }));

      // Кешируем результат
      this.characteristicsCache.set(subjectId, formattedCharacteristics);
      
      return formattedCharacteristics;
    } catch (error) {
      console.error(`❌ Ошибка получения характеристик для категории ${subjectId}:`, error);
      throw new Error(`Не удалось загрузить характеристики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получение списка категорий с кешированием
   */
  async getCategories(apiToken: string): Promise<any[]> {
    try {
      if (this.categoriesCache.has(0)) {
        console.log(`💾 Используем кешированные категории`);
        return this.categoriesCache.get(0)!;
      }

      console.log(`📂 Загружаем список категорий...`);
      
      const response = await this.makeRequest(
        WB_API_CONFIG.ENDPOINTS.GET_PARENT_CATEGORIES,
        apiToken
      );
      
      const categories = response.data || [];
      console.log(`✅ Загружено ${categories.length} категорий`);
      
      // Кешируем результат
      this.categoriesCache.set(0, categories);
      
      return categories;
    } catch (error) {
      console.error(`❌ Ошибка получения категорий:`, error);
      throw new Error(`Не удалось загрузить категории: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Проверка статуса задачи
   */
  async checkTaskStatus(taskId: string, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log(`📋 Проверяем статус задачи: ${taskId}`);
      
      const response = await this.makeRequest(
        `${WB_API_CONFIG.ENDPOINTS.GET_ERRORS}?taskId=${taskId}`,
        apiToken
      );
      
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('❌ Ошибка проверки статуса:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Проверка здоровья API
   */
  async checkApiHealth(apiToken: string): Promise<ApiHealthResult> {
    const startTime = Date.now();
    
    try {
      await this.getCategoryCharacteristics(5581, apiToken);
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        message: `WB API работает нормально (${responseTime}мс)`,
        details: {
          responseTime,
          endpoint: 'category-characteristics',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        message: `WB API недоступен: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        details: {
          responseTime,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Получение списка товаров продавца
   */
  async getSellerProducts(apiToken: string, filters?: {
    limit?: number;
    offset?: number;
    search?: string;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<WBApiResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.orderBy) params.append('orderBy', filters.orderBy);
      if (filters?.orderDirection) params.append('orderDirection', filters.orderDirection);

      console.log(`📋 Получаем список товаров продавца...`);
      
      const response = await this.makeRequest(
        `${WB_API_CONFIG.ENDPOINTS.GET_CARDS_LIST}?${params.toString()}`,
        apiToken
      );
      
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('❌ Ошибка получения списка товаров:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Обновление цен товара
   */
  async updateProductPrices(vendorCode: string, priceData: {
    price: number;
    discountedPrice?: number;
  }, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log(`💰 Обновляем цены для товара ${vendorCode}:`, priceData);
      
      // Валидация цен
      const priceValidation = this.validatePriceInfo({
        original: priceData.price,
        discount: priceData.discountedPrice,
        final: priceData.discountedPrice || priceData.price,
        hasDiscount: !!priceData.discountedPrice
      });

      if (!priceValidation.isValid) {
        throw new Error(`Ошибки валидации цен: ${priceValidation.errors.join(', ')}`);
      }

      const updateData: any = {
        vendorCode,
        price: priceData.price
      };

      // Добавляем цену со скидкой если указана и валидна
      if (priceData.discountedPrice && priceData.discountedPrice < priceData.price) {
        updateData.discountedPrice = priceData.discountedPrice;
        console.log(`   💸 Устанавливаем скидку: ${priceData.price}₽ → ${priceData.discountedPrice}₽`);
      }

      const response = await this.makeRequest(
        '/content/v1/cards/update/prices', // Используем прямой endpoint
        apiToken,
        {
          method: 'POST',
          body: JSON.stringify([updateData])
        }
      );
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ Ошибка обновления цен:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Получение информации о товаре по артикулу
   */
  async getProductByVendorCode(vendorCode: string, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log(`🔍 Поиск товара по артикулу: ${vendorCode}`);
      
      const response = await this.makeRequest(
        `${WB_API_CONFIG.ENDPOINTS.GET_CARDS_LIST}?vendorCode=${vendorCode}`,
        apiToken
      );
      
      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error(`❌ Ошибка поиска товара по артикулу ${vendorCode}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Анализ ценовой конкуренции
   */
  public analyzePriceCompetitiveness(priceInfo: PriceInfo, categoryAveragePrice?: number): {
    competitiveness: 'low' | 'medium' | 'high';
    recommendation: string;
    metrics: {
      pricePosition: string;
      discountAttractiveness?: string;
      marketPosition: string;
    };
  } {
    const finalPrice = priceInfo.discount || priceInfo.final;
    
    let competitiveness: 'low' | 'medium' | 'high' = 'medium';
    let recommendation = '';
    let pricePosition = '';
    let marketPosition = '';
    let discountAttractiveness = undefined;

    // Анализ позиции цены
    if (categoryAveragePrice) {
      const priceRatio = finalPrice / categoryAveragePrice;
      
      if (priceRatio < 0.8) {
        pricePosition = 'Цена ниже среднерыночной на ' + Math.round((1 - priceRatio) * 100) + '%';
        marketPosition = 'budget';
        competitiveness = 'high';
      } else if (priceRatio > 1.2) {
        pricePosition = 'Цена выше среднерыночной на ' + Math.round((priceRatio - 1) * 100) + '%';
        marketPosition = 'premium';
        competitiveness = 'low';
      } else {
        pricePosition = 'Цена в пределах среднерыночной';
        marketPosition = 'standard';
        competitiveness = 'medium';
      }
    }

    // Анализ привлекательности скидки
    if (priceInfo.hasDiscount && priceInfo.discountPercent) {
      if (priceInfo.discountPercent >= 30) {
        discountAttractiveness = 'Очень привлекательная скидка';
        competitiveness = 'high';
      } else if (priceInfo.discountPercent >= 15) {
        discountAttractiveness = 'Хорошая скидка';
        if (competitiveness === 'medium') competitiveness = 'high';
      } else if (priceInfo.discountPercent >= 5) {
        discountAttractiveness = 'Небольшая скидка';
      } else {
        discountAttractiveness = 'Скидка малозаметна';
      }
    }

    // Формирование рекомендации
    if (competitiveness === 'high') {
      recommendation = 'Отличная ценовая позиция. Товар должен хорошо конкурировать на рынке.';
    } else if (competitiveness === 'low') {
      recommendation = 'Цена может быть слишком высокой. Рассмотрите снижение цены или увеличение скидки.';
    } else {
      recommendation = 'Цена находится в средней позиции. Можно попробовать небольшую скидку для повышения конкурентоспособности.';
    }

    return {
      competitiveness,
      recommendation,
      metrics: {
        pricePosition,
        discountAttractiveness,
        marketPosition
      }
    };
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Пакетное обновление цен
   */
  async batchUpdatePrices(updates: Array<{
    vendorCode: string;
    price: number;
    discountedPrice?: number;
  }>, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log(`💰 Пакетное обновление цен для ${updates.length} товаров...`);
      
      // Валидация всех цен
      for (const [index, update] of updates.entries()) {
        const validation = this.validatePriceInfo({
          original: update.price,
          discount: update.discountedPrice,
          final: update.discountedPrice || update.price,
          hasDiscount: !!update.discountedPrice
        });

        if (!validation.isValid) {
          throw new Error(`Ошибки валидации для товара ${index + 1} (${update.vendorCode}): ${validation.errors.join(', ')}`);
        }
      }

      const updateData = updates.map(update => {
        const data: any = {
          vendorCode: update.vendorCode,
          price: update.price
        };
        
        if (update.discountedPrice && update.discountedPrice < update.price) {
          data.discountedPrice = update.discountedPrice;
        }
        
        return data;
      });

      console.log(`📊 Статистика обновления:`);
      const withDiscount = updates.filter(u => u.discountedPrice && u.discountedPrice < u.price).length;
      console.log(`   - Товаров с обновлением скидки: ${withDiscount}`);
      console.log(`   - Товаров только с обновлением цены: ${updates.length - withDiscount}`);

      const response = await this.makeRequest(
        '/content/v1/cards/update/prices',
        apiToken,
        {
          method: 'POST',
          body: JSON.stringify(updateData)
        }
      );
      
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('❌ Ошибка пакетного обновления цен:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Загрузка медиа (изображения 900x1200)
   */
  async uploadMedia(imageBuffer: Buffer, fileName: string, apiToken: string, options?: ImageProcessingOptions): Promise<MediaUploadResult> {
    try {
      console.log(`📤 Загружаем медиа файл: ${fileName}`);
      
      // Создаем FormData для загрузки
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('uploadfile', blob, fileName);

      const response = await fetch(`${this.BASE_URL}/content/v2/media/save`, {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки медиа (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ Медиа файл успешно загружен');
      
      return {
        success: true,
        mediaId: result.data?.mediaId,
        url: result.data?.url,
      };
    } catch (error) {
      console.error('❌ Ошибка загрузки медиа:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Очистка всех кешей
   */
  public clearAllCaches(): void {
    this.characteristicTypesCache.clear();
    this.categoriesCache.clear();
    this.characteristicsCache.clear();
    console.log('🗑️ Все кеши очищены');
  }

  /**
   * Получение размера всех кешей
   */
  public getCacheSize(): number {
    return this.characteristicTypesCache.size + 
           this.categoriesCache.size + 
           this.characteristicsCache.size;
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Получение статистики по API сервису
   */
  public getServiceStatistics(): {
    cacheSize: number;
    lastUpdate: string;
    systemFeatures: string[];
    version: string;
    endpoints: string[];
  } {
    return {
      cacheSize: this.getCacheSize(),
      lastUpdate: new Date().toISOString(),
      systemFeatures: [
        'dual_pricing_support',
        'wb_image_resize_900x1200',
        'enhanced_characteristics',
        'batch_price_updates',
        'price_competitiveness_analysis',
        'cache_management',
        'detailed_error_handling',
        'request_validation'
      ],
      version: '2.0.0',
      endpoints: Object.values(WB_API_CONFIG.ENDPOINTS)
    };
  }
}

export const wbApiService = new WbApiService();