// lib/utils/wbCharacteristics.ts - ОКОНЧАТЕЛЬНО ИСПРАВЛЕННАЯ ВЕРСИЯ

// Константы для ID характеристик WB (убираем as const для избежания строгой типизации)
export const WB_CHARACTERISTICS_IDS = {
  MAIN_COLOR: 14863,
  MATERIAL: 7174,
  BRAND: 8229,
  COUNTRY: 7919,
  GENDER: 7183,
  COMPOSITION: 14866,
  SEASON: 14865,
  SIZE: 14864,
  LENGTH: 16999,
  WIDTH: 17001,
  HEIGHT: 17003,
  WEIGHT: 17005,
};

export class WBCharacteristicsHelper {
  static getCharacteristicName(id: number): string {
    const mapping: Record<number, string> = {
      [WB_CHARACTERISTICS_IDS.MAIN_COLOR]: 'Основной цвет',
      [WB_CHARACTERISTICS_IDS.MATERIAL]: 'Материал',
      [WB_CHARACTERISTICS_IDS.BRAND]: 'Бренд',
      [WB_CHARACTERISTICS_IDS.COUNTRY]: 'Страна производства',
      [WB_CHARACTERISTICS_IDS.GENDER]: 'Пол',
      [WB_CHARACTERISTICS_IDS.COMPOSITION]: 'Состав',
      [WB_CHARACTERISTICS_IDS.SEASON]: 'Сезон',
      [WB_CHARACTERISTICS_IDS.SIZE]: 'Размер',
      [WB_CHARACTERISTICS_IDS.LENGTH]: 'Длина (см)',
      [WB_CHARACTERISTICS_IDS.WIDTH]: 'Ширина (см)',
      [WB_CHARACTERISTICS_IDS.HEIGHT]: 'Высота (см)',
      [WB_CHARACTERISTICS_IDS.WEIGHT]: 'Вес (г)',
    };
    
    return mapping[id] || `Характеристика ${id}`;
  }
  
  static isRequired(id: number): boolean {
    // Используем числовые значения напрямую вместо констант
    const required = [8229, 7919, 14863]; // BRAND, COUNTRY, MAIN_COLOR
    return required.includes(id);
  }

  // Принимает любой number без ограничений типа
  static validateCharacteristic(id: number, value: string): { valid: boolean; error?: string } {
    if (!value || value.trim() === '') {
      return { valid: false, error: 'Значение характеристики не может быть пустым' };
    }

    // Используем числовые значения напрямую
    if (id === 16999 || id === 17001 || id === 17003) { // LENGTH, WIDTH, HEIGHT
      const sizeNum = Number(value);
      if (isNaN(sizeNum) || sizeNum <= 0) {
        return { valid: false, error: 'Размер должен быть положительным числом' };
      }
      if (sizeNum > 1000) {
        return { valid: false, error: 'Размер не может быть больше 1000 см' };
      }
    } else if (id === 17005) { // WEIGHT
      const weightNum = Number(value);
      if (isNaN(weightNum) || weightNum <= 0) {
        return { valid: false, error: 'Вес должен быть положительным числом' };
      }
      if (weightNum > 50000) {
        return { valid: false, error: 'Вес не может быть больше 50 кг (50000 г)' };
      }
    } else if (id === 8229) { // BRAND
      if (value.length > 50) {
        return { valid: false, error: 'Название бренда не может быть длиннее 50 символов' };
      }
    } else if (id === 14863) { // MAIN_COLOR
      if (value.length > 30) {
        return { valid: false, error: 'Название цвета не может быть длиннее 30 символов' };
      }
    }

    return { valid: true };
  }

  static getDefaultValue(id: number): string {
    if (id === 8229) return 'NoName'; // BRAND
    if (id === 7919) return 'Россия'; // COUNTRY
    if (id === 14863) return 'не указан'; // MAIN_COLOR
    return '';
  }

  static formatValue(id: number, value: string): string {
    if (id === 16999 || id === 17001 || id === 17003) { // LENGTH, WIDTH, HEIGHT
      return `${value} см`;
    }
    if (id === 17005) { // WEIGHT
      return `${value} г`;
    }
    return value;
  }

  /**
   * Проверяет, является ли ID валидным для характеристик WB
   */
  static isValidCharacteristicId(id: number): boolean {
    const validIds = [14863, 7174, 8229, 7919, 7183, 14866, 14865, 14864, 16999, 17001, 17003, 17005];
    return validIds.includes(id);
  }

  /**
   * Получает все обязательные характеристики
   */
  static getRequiredCharacteristics(): number[] {
    return [8229, 7919, 14863]; // BRAND, COUNTRY, MAIN_COLOR
  }

  /**
   * Получает все характеристики размеров
   */
  static getDimensionCharacteristics(): number[] {
    return [16999, 17001, 17003, 17005]; // LENGTH, WIDTH, HEIGHT, WEIGHT
  }

  /**
   * Преобразует название характеристики в ID WB
   */
  static getIdByName(name: string): number | null {
    const lowerName = name.toLowerCase();
    
    const mapping: Record<string, number> = {
      'цвет': 14863,
      'основной цвет': 14863,
      'материал': 7174,
      'бренд': 8229,
      'страна производства': 7919,
      'пол': 7183,
      'состав': 14866,
      'сезон': 14865,
      'размер': 14864,
      'длина': 16999,
      'ширина': 17001,
      'высота': 17003,
      'вес': 17005,
    };

    for (const [key, id] of Object.entries(mapping)) {
      if (lowerName.includes(key)) {
        return id;
      }
    }

    return null;
  }

  /**
   * Создает характеристику с валидацией
   */
  static createCharacteristic(id: number, value: string | number): {
    id: number;
    value: string;
    valid: boolean;
    error?: string;
  } {
    const stringValue = String(value);
    const validation = this.validateCharacteristic(id, stringValue);
    
    return {
      id,
      value: stringValue,
      valid: validation.valid,
      error: validation.error
    };
  }

  /**
   * Фильтрует и очищает массив характеристик
   */
  static cleanCharacteristics(characteristics: Array<{ id: number; value: any }>): Array<{ id: number; value: string }> {
    return characteristics
      .filter(char => char.id && char.value !== null && char.value !== undefined && String(char.value).trim() !== '')
      .map(char => ({
        id: Number(char.id),
        value: String(char.value).trim()
      }))
      .filter(char => {
        // Используем try-catch для безопасной валидации
        try {
          return this.validateCharacteristic(char.id, char.value).valid;
        } catch {
          return false;
        }
      });
  }
}