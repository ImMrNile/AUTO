// lib/utils/json.ts - ОБНОВЛЕННАЯ ВЕРСИЯ

/**
 * Простое преобразование объекта в JSON для Prisma
 * Совместимо с SQLite и PostgreSQL
 */
export function toPrismaJson(value: any): any {
  if (value === null || value === undefined) {
    return null; // Возвращаем null для совместимости с Prisma
  }
  
  if (typeof value === 'object') {
    try {
      // Очищаем и возвращаем объект как есть для Prisma
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error('Ошибка преобразования объекта в JSON:', error);
      return null;
    }
  }
  
  return value;
}

/**
 * Преобразование объекта в nullable JSON для Prisma
 * Используется для опциональных полей
 */
export function toPrismaNullableJson(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }
  
  return toPrismaJson(value);
}

/**
 * Преобразование Prisma JSON в обычный объект
 * Типизированная версия
 */
export function fromPrismaJson<T = any>(value: any): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Если это уже объект (для PostgreSQL), возвращаем как есть
  if (typeof value === 'object') {
    return value as T;
  }
  
  // Если это строка (для SQLite), парсим JSON
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Ошибка парсинга JSON:', error);
      return null;
    }
  }
  
  return value as T;
}

/**
 * Безопасное получение значения из Prisma JSON с дефолтным значением
 */
export function getJsonValue<T = any>(value: any, defaultValue: T): T {
  const result = fromPrismaJson<T>(value);
  return result !== null ? result : defaultValue;
}

/**
 * Проверка валидности JSON строки
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Очистка объекта от undefined значений
 * Полезно перед сохранением в базу данных
 */
export function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanObject(value);
      }
    }
    
    return cleaned;
  }
  
  return obj;
}

/**
 * Глубокое объединение JSON объектов
 * Полезно для обновления существующих JSON полей
 */
export function mergeJsonData(existing: any, newData: any): any {
  const existingObj = fromPrismaJson(existing) || {};
  const newObj = newData || {};
  
  const merged = deepMerge(existingObj, newObj);
  return toPrismaJson(merged);
}

/**
 * Глубокое объединение объектов
 */
function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) {
    return target;
  }
  
  if (Array.isArray(source)) {
    return [...source];
  }
  
  if (typeof source === 'object') {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  return source;
}

/**
 * Безопасное извлечение вложенного значения из JSON объекта
 */
export function getNestedValue<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
  const parsedObj = fromPrismaJson(obj);
  if (!parsedObj) {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current = parsedObj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Установка вложенного значения в JSON объект
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  const parsedObj = fromPrismaJson(obj) || {};
  const keys = path.split('.');
  let current = parsedObj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return toPrismaJson(parsedObj);
}

/**
 * Проверка наличия ключа в JSON объекте
 */
export function hasJsonKey(obj: any, path: string): boolean {
  const parsedObj = fromPrismaJson(obj);
  if (!parsedObj) {
    return false;
  }
  
  const keys = path.split('.');
  let current = parsedObj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    if (!(key in current)) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

/**
 * Удаление ключа из JSON объекта
 */
export function removeJsonKey(obj: any, path: string): any {
  const parsedObj = fromPrismaJson(obj);
  if (!parsedObj) {
    return null;
  }
  
  const keys = path.split('.');
  let current = parsedObj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      return toPrismaJson(parsedObj); // Ключ не найден, возвращаем как есть
    }
    current = current[key];
  }
  
  delete current[keys[keys.length - 1]];
  return toPrismaJson(parsedObj);
}

/**
 * Вычисление размера JSON объекта в байтах (приблизительно)
 */
export function getJsonSize(obj: any): number {
  const str = typeof obj === 'string' ? obj : JSON.stringify(fromPrismaJson(obj));
  return new Blob([str]).size;
}

/**
 * Сжатие JSON объекта (удаление пустых значений)
 */

export function compactJson(obj: any): any {
  const parsedObj = fromPrismaJson(obj);
  if (!parsedObj) {
    return null;
  }
  
  function compact(item: any): any {
    if (Array.isArray(item)) {
      return item.map(compact).filter(x => 
        x !== null && x !== undefined && x !== '' && 
        !(Array.isArray(x) && x.length === 0) &&
        !(typeof x === 'object' && Object.keys(x).length === 0)
      );
    }
    
    if (typeof item === 'object' && item !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(item)) {
        const compactedValue = compact(value);
        if (compactedValue !== null && compactedValue !== undefined && compactedValue !== '' &&
            !(Array.isArray(compactedValue) && compactedValue.length === 0) &&
            !(typeof compactedValue === 'object' && Object.keys(compactedValue).length === 0)) {
          result[key] = compactedValue;
        }
      }
      return result;
    }
    
    return item;
  }
  
  return toPrismaJson(compact(parsedObj));
}