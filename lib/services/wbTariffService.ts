// lib/services/wbTariffService.ts - Сервис для получения тарифов и коэффициентов WB

/**
 * Данные о коэффициентах склада
 */
export interface WarehouseCoefficients {
  warehouseName: string;
  geoName: string;
  
  // Логистика (доставка)
  boxDeliveryBase: number;           // Базовая стоимость доставки
  boxDeliveryCoefExpr: number;       // ✅ Коэффициент логистики (KTR) для FBS
  boxDeliveryLiter: number;          // Стоимость за литр
  
  // Логистика маркетплейса
  boxDeliveryMarketplaceBase: number;      // Базовая стоимость для маркетплейса
  boxDeliveryMarketplaceCoefExpr: number;  // ✅ Коэффициент логистики (KTR) для маркетплейса
  boxDeliveryMarketplaceLiter: number;     // Стоимость за литр для маркетплейса
  
  // Хранение
  boxStorageBase: number;            // Базовая стоимость хранения
  boxStorageCoefExpr: number;        // Коэффициент хранения
  boxStorageLiter: number;           // Стоимость хранения за литр
}

/**
 * Ответ от API тарифов
 */
export interface BoxTariffsResponse {
  dtNextBox: string;      // Дата следующего обновления
  dtTillMax: string;      // Дата до которой действуют тарифы
  warehouseList: WarehouseCoefficients[];
}

/**
 * Сервис для получения тарифов и коэффициентов WB
 */
export class WbTariffService {
  private static readonly API_URL = 'https://common-api.wildberries.ru';
  // ✅ Рабочий endpoint (требует параметр date)
  private static readonly BOX_TARIFFS_ENDPOINT = '/api/v1/tariffs/box';

  /**
   * Получить коэффициенты всех складов
   * @param apiToken - API токен продавца WB
   * @returns Список коэффициентов по складам
   */
  static async getBoxTariffs(apiToken: string): Promise<BoxTariffsResponse | null> {
    try {
      console.log(`📊 [WB Tariffs] Получаем коэффициенты складов...`);
      console.log(`   Token: ${apiToken.substring(0, 20)}...`);
      
      // ✅ Используем рабочий endpoint с параметром date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const url = `${this.API_URL}${this.BOX_TARIFFS_ENDPOINT}?date=${today}`;
      
      console.log(`   URL: ${url}`);
      
      const result = await this.tryFetchTariffs(url, apiToken);
      if (result) {
        console.log(`   ✅ Успешно получили тарифы`);
        return result;
      }
      
      console.error(`❌ [WB Tariffs] Не удалось получить тарифы`);
      return null;
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка при получении тарифов:`, error);
      return null;
    }
  }

  /**
   * Попытка получить тарифы с конкретного URL
   */
  private static async tryFetchTariffs(url: string, apiToken: string): Promise<BoxTariffsResponse | null> {
    try {
      console.log(`   Отправляем запрос на ${url}...`);
      
      // Используем встроенный fetch (Node.js 18+) или импортируем node-fetch
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        });
      } catch (fetchError) {
        console.error(`❌ [WB Tariffs] Ошибка fetch:`, fetchError);
        // Fallback: попробуем использовать https модуль
        return await this.getBoxTariffsWithHttps(url, apiToken);
      }

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [WB Tariffs] Ошибка API: ${response.status} - ${response.statusText}`);
        console.error(`   Response: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log(`   Response received:`, JSON.stringify(data).substring(0, 200));
      
      if (!data.response?.data) {
        console.error(`❌ [WB Tariffs] Неправильная структура ответа`);
        console.error(`   Data:`, JSON.stringify(data));
        return null;
      }

      const tariffs = data.response.data;
      
      console.log(`✅ [WB Tariffs] Получены коэффициенты для ${tariffs.warehouseList?.length || 0} складов`);
      console.log(`   Действительны до: ${tariffs.dtTillMax}`);
      
      // Логируем все склады
      tariffs.warehouseList?.forEach((warehouse: WarehouseCoefficients) => {
        console.log(`   📦 ${warehouse.warehouseName} (${warehouse.geoName})`);
        console.log(`      KTR логистика: ${warehouse.boxDeliveryCoefExpr / 100}`);
        console.log(`      KTR маркетплейс: ${warehouse.boxDeliveryMarketplaceCoefExpr / 100}`);
      });

      return tariffs;
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка при получении тарифов:`, error);
      return null;
    }
  }

  /**
   * Fallback метод используя https модуль
   */
  private static async getBoxTariffsWithHttps(url: string, apiToken: string): Promise<BoxTariffsResponse | null> {
    try {
      const https = require('https');
      
      console.log(`📊 [WB Tariffs] Используем https модуль...`);
      
      return new Promise((resolve) => {
        const options = {
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          }
        };

        https.get(url, options, (res: any) => {
          let data = '';
          
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.response?.data) {
                resolve(parsed.response.data);
              } else {
                console.error(`❌ [WB Tariffs] Неправильная структура ответа (https)`);
                resolve(null);
              }
            } catch (e) {
              console.error(`❌ [WB Tariffs] Ошибка парсинга JSON:`, e);
              resolve(null);
            }
          });
        }).on('error', (err: any) => {
          console.error(`❌ [WB Tariffs] Ошибка https запроса:`, err);
          resolve(null);
        });
      });
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка в fallback методе:`, error);
      return null;
    }
  }

  /**
   * Получить коэффициент конкретного склада
   * @param apiToken - API токен продавца WB
   * @param warehouseName - Название склада (например "Белая дача", "Коледино")
   * @param isMarketplace - Использовать коэффициент маркетплейса (по умолчанию false)
   * @returns Коэффициент склада (KTR) или null если склад не найден
   */
  static async getWarehouseKtr(
    apiToken: string,
    warehouseName: string,
    isMarketplace: boolean = false
  ): Promise<number | null> {
    try {
      const tariffs = await this.getBoxTariffs(apiToken);
      
      if (!tariffs?.warehouseList) {
        console.error(`❌ [WB Tariffs] Не удалось получить список складов`);
        return null;
      }

      // Ищем склад по названию (case-insensitive)
      const warehouse = tariffs.warehouseList.find(
        w => w.warehouseName.toLowerCase() === warehouseName.toLowerCase()
      );

      if (!warehouse) {
        console.error(`❌ [WB Tariffs] Склад "${warehouseName}" не найден`);
        console.log(`   Доступные склады:`);
        tariffs.warehouseList.forEach(w => {
          console.log(`   - ${w.warehouseName}`);
        });
        return null;
      }

      // Возвращаем коэффициент (делим на 100 так как API возвращает в сотых долях)
      const ktr = isMarketplace 
        ? warehouse.boxDeliveryMarketplaceCoefExpr / 100
        : warehouse.boxDeliveryCoefExpr / 100;

      console.log(`✅ [WB Tariffs] KTR для склада "${warehouseName}": ${ktr}`);
      
      return ktr;
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка при получении KTR:`, error);
      return null;
    }
  }

  /**
   * Получить коэффициенты всех складов в виде Map для быстрого поиска
   * @param apiToken - API токен продавца WB
   * @param isMarketplace - Использовать коэффициенты маркетплейса
   * @returns Map с названиями складов и их коэффициентами
   */
  static async getWarehouseKtrMap(
    apiToken: string,
    isMarketplace: boolean = false
  ): Promise<Map<string, number> | null> {
    try {
      const tariffs = await this.getBoxTariffs(apiToken);
      
      if (!tariffs?.warehouseList) {
        return null;
      }

      const ktrMap = new Map<string, number>();
      
      tariffs.warehouseList.forEach(warehouse => {
        const ktr = isMarketplace
          ? warehouse.boxDeliveryMarketplaceCoefExpr / 100
          : warehouse.boxDeliveryCoefExpr / 100;
        
        ktrMap.set(warehouse.warehouseName, ktr);
      });

      console.log(`✅ [WB Tariffs] Создана Map с ${ktrMap.size} складами`);
      
      return ktrMap;
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка при создании Map:`, error);
      return null;
    }
  }

  /**
   * Получить ПОЛНЫЕ тарифы всех складов в виде Map для расчета логистики
   * @param apiToken - API токен продавца WB
   * @returns Map с названиями складов и их полными тарифами
   */
  static async getWarehouseTariffsMap(
    apiToken: string
  ): Promise<Map<string, WarehouseCoefficients> | null> {
    try {
      const tariffs = await this.getBoxTariffs(apiToken);
      
      if (!tariffs?.warehouseList) {
        return null;
      }

      const tariffsMap = new Map<string, WarehouseCoefficients>();
      
      tariffs.warehouseList.forEach(warehouse => {
        tariffsMap.set(warehouse.warehouseName, warehouse);
      });

      console.log(`✅ [WB Tariffs] Создана Map с полными тарифами для ${tariffsMap.size} складов`);
      
      return tariffsMap;
    } catch (error) {
      console.error(`❌ [WB Tariffs] Ошибка при создании Map тарифов:`, error);
      return null;
    }
  }
}
