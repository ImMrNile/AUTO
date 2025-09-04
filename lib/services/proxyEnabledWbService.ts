// lib/services/proxyEnabledWbService.ts - СЕРВИС С ПОДДЕРЖКОЙ СЕРВЕРНОГО ПРОКСИ

import { WB_API_CONFIG, VALIDATION_RULES, DEFAULT_VALUES } from '../config/wbApiConfig';
import { 
  WBCardCreateRequestLegacy, 
  WBApiResponse, 
  WBCategory,
  normalizeCategory,
  getCategoryId,
  WBCardCreateRequest
} from '../types/wbTypes';


export class ProxyEnabledWbService {
  private readonly useProxy: boolean;
  private readonly proxyEndpoint: string;

  constructor(useProxy: boolean = true) {
    this.useProxy = useProxy;
    this.proxyEndpoint = '/api/wb-proxy';
  }

  /**
   * Универсальный метод для запросов через прокси или напрямую
   */
  private async makeProxyRequest<T>(
    endpoint: string,
    apiToken: string,
    method: string = 'GET',
    data?: any,
    useCache: boolean = true
  ): Promise<T> {
    
    if (this.useProxy) {
      // Используем серверный прокси
      const response = await fetch(this.proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint,
          method,
          data,
          apiToken,
          useCache
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка прокси-запроса');
      }
      
      return result.data;
    } else {
      // Прямое обращение к WB API (только для Node.js окружения)
      const url = `${WB_API_CONFIG.BASE_URLS.CONTENT}${endpoint}`;
      
      const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      };

      const fetchOptions: RequestInit = {
        method,
        headers
      };

      if ((method === 'POST' || method === 'PUT') && data) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WB API Error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    }
  }

  /**
   * Получение всех категорий через прокси
   */
  async getAllCategories(apiToken: string, locale: string = 'ru'): Promise<WBCategory[]> {
    try {
      console.log('📂 Загрузка категорий через прокси...');
      
      const response = await this.makeProxyRequest<{ data: any[] }>(
        `${WB_API_CONFIG.ENDPOINTS.GET_CATEGORIES}?locale=${locale}`,
        apiToken,
        'GET',
        null,
        true // Кешируем категории
      );
      
      const categories = (response.data || []).map(normalizeCategory);
      console.log(`✅ Загружено ${categories.length} категорий`);
      return categories;
    } catch (error) {
      console.error('❌ Ошибка получения категорий:', error);
      throw new Error(`Не удалось загрузить категории: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получение характеристик для категории через прокси
   */
  async getCategoryCharacteristics(categoryId: number, apiToken: string, locale: string = 'ru'): Promise<any[]> {
    try {
      console.log(`📋 Загрузка характеристик для категории ${categoryId}...`);
      
      const response = await this.makeProxyRequest<{ data: any[] }>(
        `${WB_API_CONFIG.ENDPOINTS.GET_CATEGORY_CHARACTERISTICS}/${categoryId}?locale=${locale}`,
        apiToken,
        'GET',
        null,
        true // Кешируем характеристики
      );
      
      console.log(`✅ Загружено ${response.data?.length || 0} характеристик`);
      return response.data || [];
    } catch (error) {
      console.error(`❌ Ошибка получения характеристик для категории ${categoryId}:`, error);
      throw new Error(`Не удалось загрузить характеристики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Поиск категории по названию с кешированием
   */
  async findCategoryByName(categoryName: string, apiToken: string): Promise<WBCategory | null> {
    try {
      console.log(`🔍 Поиск категории: "${categoryName}"`);
      
      const categories = await this.getAllCategories(apiToken);
      
      // Точное совпадение
      let category = categories.find(cat => 
        cat.objectName?.toLowerCase() === categoryName.toLowerCase()
      );
      
      if (category) {
        console.log(`✅ Найдена точная категория: ${category.objectName} (ID: ${category.objectID})`);
        return category;
      }
      
      // Частичное совпадение
      category = categories.find(cat => 
        cat.objectName?.toLowerCase().includes(categoryName.toLowerCase()) ||
        categoryName.toLowerCase().includes(cat.objectName?.toLowerCase())
      );
      
      if (category) {
        console.log(`✅ Найдена похожая категория: ${category.objectName} (ID: ${category.objectID})`);
        return category;
      }
      
      console.log(`❌ Категория "${categoryName}" не найдена`);
      return null;
    } catch (error) {
      console.error('❌ Ошибка поиска категории:', error);
      return null;
    }
  }

  /**
   * Создание карточки товара через прокси (легаси формат)
   */
  async createProductCard(cardData: WBCardCreateRequestLegacy, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log('📦 Создание карточки товара через прокси...');
      
      // Валидация данных перед отправкой
      this.validateCardData(cardData);
      
      // Генерируем штрихкоды если нужно
      if (!cardData.variants[0].sizes[0].skus || cardData.variants[0].sizes[0].skus.length === 0) {
        console.log('🏷️ Генерация штрихкодов...');
        cardData.variants[0].sizes[0].skus = [this.generateLocalBarcode()];
      }

      const response = await this.makeProxyRequest<any>(
        WB_API_CONFIG.ENDPOINTS.CREATE_CARDS,
        apiToken,
        'POST',
        [cardData], // API ожидает массив
        false // Не кешируем операции создания
      );

      // Проверяем ответ на ошибки
      if (response.error || (Array.isArray(response) && response[0]?.error)) {
        const errorMessage = response.error || response[0]?.error || 'Неизвестная ошибка WB API';
        console.error('❌ Ошибка создания карточки:', errorMessage);
        return { 
          success: false, 
          error: errorMessage 
        };
      }

      console.log('✅ Карточка успешно создана');
      
      return { 
        success: true, 
        data: response,
        taskId: response.taskId || response[0]?.taskId,
        warnings: response.warnings || response[0]?.warnings
      };

    } catch (error) {
      console.error('❌ Ошибка создания карточки:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }

  /**
   * Получение справочников через прокси
   */
  async getDirectories(apiToken: string): Promise<{
    colors: any[];
    countries: any[];
    seasons: any[];
  }> {
    try {
      console.log('📚 Загрузка справочников...');
      
      const [colors, countries] = await Promise.allSettled([
        this.makeProxyRequest<{ data: any[] }>(
          `${WB_API_CONFIG.ENDPOINTS.GET_COLORS}?locale=ru`,
          apiToken,
          'GET',
          null,
          true
        ),
        this.makeProxyRequest<{ data: any[] }>(
          `${WB_API_CONFIG.ENDPOINTS.GET_COUNTRIES}?locale=ru`,
          apiToken,
          'GET',
          null,
          true
        )
      ]);

      return {
        colors: colors.status === 'fulfilled' ? colors.value.data || [] : [],
        countries: countries.status === 'fulfilled' ? countries.value.data || [] : [],
        seasons: [] // Добавить когда будет доступен эндпоинт
      };
    } catch (error) {
      console.error('❌ Ошибка загрузки справочников:', error);
      return {
        colors: [],
        countries: [],
        seasons: []
      };
    }
  }

  /**
   * Проверка статуса создания карточки
   */
  async checkCardCreationStatus(taskId: string, apiToken: string): Promise<WBApiResponse> {
    try {
      console.log(`📋 Проверка статуса задачи: ${taskId}`);
      
      const response = await this.makeProxyRequest<any>(
        `${WB_API_CONFIG.ENDPOINTS.GET_ERRORS}?taskId=${taskId}`,
        apiToken,
        'GET',
        null,
        false // Не кешируем статусы
      );
      
      return {
        success: true,
        data: response.data
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
   * Получение списка карточек продавца
   */
  async getSellerCards(apiToken: string, limit: number = 100): Promise<any[]> {
    try {
      console.log(`📄 Загрузка списка карточек (лимит: ${limit})...`);
      
      const response = await this.makeProxyRequest<{ data: any[] }>(
        `${WB_API_CONFIG.ENDPOINTS.GET_CARDS_LIST}?limit=${limit}`,
        apiToken,
        'GET',
        null,
        false // Не кешируем список карточек
      );
      
      console.log(`✅ Загружено ${response.data?.length || 0} карточек`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Ошибка получения списка карточек:', error);
      return [];
    }
  }

  /**
   * Проверка здоровья WB API через прокси
   */
  async checkApiHealth(apiToken: string): Promise<{ healthy: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      await this.makeProxyRequest<any>(
        WB_API_CONFIG.ENDPOINTS.GET_PARENT_CATEGORIES + '?locale=ru',
        apiToken,
        'GET',
        null,
        true
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        message: 'WB API работает нормально',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        message: `WB API недоступен: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        responseTime
      };
    }
  }

  /**
   * Валидация данных карточки (ИСПРАВЛЕНА)
   */
  private validateCardData(cardData: WBCardCreateRequestLegacy): void {
    const variant = cardData.variants[0];
    
    if (!variant.vendorCode || variant.vendorCode.length > VALIDATION_RULES.VENDOR_CODE_MAX_LENGTH) {
      throw new Error(`Артикул должен быть указан и не превышать ${VALIDATION_RULES.VENDOR_CODE_MAX_LENGTH} символов`);
    }
    
    if (!variant.title || variant.title.length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
      throw new Error(`Название должно быть указано и не превышать ${VALIDATION_RULES.TITLE_MAX_LENGTH} символов`);
    }
    
    if (!variant.description || variant.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Описание должно быть указано и не превышать ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} символов`);
    }
    
    if (!variant.brand || variant.brand.length > VALIDATION_RULES.BRAND_MAX_LENGTH) {
      throw new Error(`Бренд должен быть указан и не превышать ${VALIDATION_RULES.BRAND_MAX_LENGTH} символов`);
    }
    
    if (!cardData.subjectID || cardData.subjectID <= 0) {
      throw new Error('ID категории (subjectID) должен быть указан');
    }
    
    // ИСПРАВЛЕНО: правильная проверка размеров
    if (!variant.dimensions || 
        variant.dimensions.length <= 0 || 
        variant.dimensions.width <= 0 || 
        variant.dimensions.height <= 0 ||
        variant.dimensions.weightBrutto <= 0) {
      throw new Error('Размеры и вес товара должны быть указаны и больше нуля');
    }
    
    if (!variant.sizes || variant.sizes.length === 0) {
      throw new Error('Должен быть указан хотя бы один размер товара');
    }
    
    const size = variant.sizes[0];
    if (!size.price || size.price < VALIDATION_RULES.MIN_PRICE || size.price > VALIDATION_RULES.MAX_PRICE) {
      throw new Error(`Цена должна быть от ${VALIDATION_RULES.MIN_PRICE} до ${VALIDATION_RULES.MAX_PRICE} рублей`);
    }
    
    if (!variant.characteristics || variant.characteristics.length === 0) {
      throw new Error('Должны быть указаны характеристики товара');
    }
    
    console.log('✅ Валидация данных карточки прошла успешно');
  }

  /**
   * Генерация локального штрихкода
   */
  private generateLocalBarcode(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `AI${timestamp.slice(-6)}${random.toUpperCase()}`;
  }

  /**
   * Преобразование данных в формат WB API (ИСПРАВЛЕНО)
   */
  prepareCardDataForWB(productData: {
    vendorCode: string;
    title: string;
    description: string;
    brand: string;
    categoryId: number;
    price: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
      weight: number;
    };
    characteristics: Array<{ id: number; value: string }>;
    packageContents: string;
  }): WBCardCreateRequestLegacy {
    
    console.log('🔄 Подготовка данных для WB API...');
    
    // Преобразуем характеристики в формат WB (значения в массивах)
    const wbCharacteristics = productData.characteristics.map(char => ({
      id: char.id,
      value: [char.value] // WB API ожидает массив значений
    }));

    // Добавляем обязательные характеристики если их нет
    const requiredCharacteristics = [
      { id: 372, value: productData.packageContents || 'не указан', name: 'Состав' },
      { id: 91, value: DEFAULT_VALUES.COUNTRY, name: 'Страна производства' },
      { id: 85, value: productData.brand || DEFAULT_VALUES.BRAND, name: 'Бренд' }
    ];

    for (const required of requiredCharacteristics) {
      const exists = wbCharacteristics.some(c => c.id === required.id);
      if (!exists) {
        wbCharacteristics.push({
          id: required.id,
          value: [required.value]
        });
        console.log(`➕ Добавлена характеристика: ${required.name} = ${required.value}`);
      }
    }

    const cardData: WBCardCreateRequestLegacy = {
      subjectID: productData.categoryId,
      variants: [{
        vendorCode: productData.vendorCode,
        title: productData.title.substring(0, VALIDATION_RULES.TITLE_MAX_LENGTH),
        description: productData.description.substring(0, VALIDATION_RULES.DESCRIPTION_MAX_LENGTH),
        brand: productData.brand.substring(0, VALIDATION_RULES.BRAND_MAX_LENGTH),
        dimensions: {
          length: productData.dimensions.length,
          width: productData.dimensions.width,
          height: productData.dimensions.height,
          weightBrutto: productData.dimensions.weight
        },
        characteristics: wbCharacteristics,
        sizes: [{
          techSize: "0", // Универсальный размер
          wbSize: "0",
          price: Math.round(productData.price), // Округляем цену
          skus: [] // Будет заполнено автоматически при создании
        }]
      }]
    };

    console.log('✅ Данные подготовлены для отправки в WB');
    return cardData;
  }

  /**
   * Получение последних ошибок
   */
  async getRecentErrors(apiToken: string, hours: number = 24): Promise<any[]> {
    try {
      const dateFrom = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const response = await this.makeProxyRequest<{ data: any[] }>(
        `${WB_API_CONFIG.ENDPOINTS.GET_ERRORS}?dateFrom=${dateFrom}`,
        apiToken,
        'GET',
        null,
        false
      );
      
      return response.data || [];
    } catch (error) {
      console.error('❌ Ошибка получения списка ошибок:', error);
      return [];
    }
  }

  /**
   * Пакетная проверка статусов
   */
  async batchCheckStatuses(taskIds: string[], apiToken: string): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    
    console.log(`📋 Проверка статусов для ${taskIds.length} задач...`);
    
    for (const taskId of taskIds) {
      try {
        const status = await this.checkCardCreationStatus(taskId, apiToken);
        results[taskId] = status;
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Ошибка проверки статуса ${taskId}:`, error);
        results[taskId] = { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
      }
    }
    
    console.log(`✅ Проверка статусов завершена`);
    return results;
  }

  /**
   * Получение статистики использования API
   */
  async getApiStats(): Promise<any> {
    try {
      const response = await fetch('/api/wb-proxy', {
        method: 'PATCH'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения статистики API:', error);
      return null;
    }
  }

  /**
   * Очистка кеша прокси
   */
  async clearProxyCache(): Promise<boolean> {
    try {
      const response = await fetch('/api/wb-proxy?action=clear-cache', {
        method: 'DELETE'
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Ошибка очистки кеша:', error);
      return false;
    }
  }
}

export const proxyEnabledWbService = new ProxyEnabledWbService();