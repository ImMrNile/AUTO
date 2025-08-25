// pages/api/wb/characteristics/[categoryId].ts - API ДЛЯ ПОЛУЧЕНИЯ ХАРАКТЕРИСТИК КАТЕГОРИИ

import { NextApiRequest, NextApiResponse } from 'next';
import { proxyEnabledWbService } from '../../../../../lib/services/proxyEnabledWbService';
import { REQUIRED_CHARACTERISTICS, DEFAULT_VALUES } from '../../../../../lib/config/wbApiConfig';

interface WBCharacteristic {
  id: number;
  name: string;
  required: boolean;
  type: string;
  values?: Array<{ id: number; value: string }>;
  defaultValue?: string;
  maxLength?: number;
  pattern?: string;
}

// Базовые характеристики для fallback
const FALLBACK_CHARACTERISTICS: WBCharacteristic[] = [
  {
    id: 85,
    name: 'Бренд',
    required: true,
    type: 'string',
    defaultValue: DEFAULT_VALUES.BRAND,
    maxLength: 50
  },
  {
    id: 91,
    name: 'Страна производства',
    required: true,
    type: 'dictionary',
    values: [
      { id: 1, value: 'Россия' },
      { id: 2, value: 'Китай' },
      { id: 3, value: 'США' },
      { id: 4, value: 'Германия' },
      { id: 5, value: 'Италия' }
    ],
    defaultValue: DEFAULT_VALUES.COUNTRY
  },
  {
    id: 14177449,
    name: 'Цвет',
    required: true,
    type: 'dictionary',
    values: [
      { id: 1, value: 'черный' },
      { id: 2, value: 'белый' },
      { id: 3, value: 'красный' },
      { id: 4, value: 'синий' },
      { id: 5, value: 'зеленый' },
      { id: 6, value: 'желтый' },
      { id: 7, value: 'серый' },
      { id: 8, value: 'коричневый' }
    ],
    defaultValue: DEFAULT_VALUES.COLOR
  },
  {
    id: 372,
    name: 'Состав',
    required: true,
    type: 'string',
    defaultValue: DEFAULT_VALUES.COMPOSITION,
    maxLength: 500
  },
  {
    id: 83,
    name: 'Артикул производителя',
    required: false,
    type: 'string',
    maxLength: 75
  }
];

// Получение токена API
function getApiToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return process.env.WB_API_READ_TOKEN || process.env.WB_API_TOKEN || null;
}

// Нормализация характеристики
function normalizeCharacteristic(char: any): WBCharacteristic {
  return {
    id: char.id || char.charcID,
    name: char.name || char.charcName || 'Без названия',
    required: char.required || char.isRequired || false,
    type: char.charcType || char.type || 'string',
    values: char.dictionary || char.values || undefined,
    defaultValue: char.defaultValue || undefined,
    maxLength: char.maxLength || undefined,
    pattern: char.pattern || undefined
  };
}

// Добавление специфичных характеристик по категориям
function addCategorySpecificCharacteristics(categoryId: number, characteristics: WBCharacteristic[]): WBCharacteristic[] {
  const result = [...characteristics];
  
  // Электроника
  if ([963, 964, 965, 966].includes(categoryId)) {
    result.push(
      {
        id: 312,
        name: 'Гарантия',
        required: false,
        type: 'string',
        defaultValue: DEFAULT_VALUES.WARRANTY
      },
      {
        id: 2758,
        name: 'Мощность',
        required: false,
        type: 'string'
      }
    );
  }
  
  // Одежда
  if ([629, 8126, 566].includes(categoryId)) {
    result.push(
      {
        id: 48,
        name: 'Размер',
        required: true,
        type: 'dictionary',
        values: [
          { id: 1, value: 'XS' },
          { id: 2, value: 'S' },
          { id: 3, value: 'M' },
          { id: 4, value: 'L' },
          { id: 5, value: 'XL' },
          { id: 6, value: 'XXL' }
        ]
      },
      {
        id: 50,
        name: 'Сезон',
        required: false,
        type: 'dictionary',
        values: [
          { id: 1, value: 'лето' },
          { id: 2, value: 'зима' },
          { id: 3, value: 'демисезон' },
          { id: 4, value: 'всесезонный' }
        ],
        defaultValue: DEFAULT_VALUES.SEASON
      }
    );
  }
  
  // Товары для дома
  if ([14727, 2674].includes(categoryId)) {
    result.push(
      {
        id: 49,
        name: 'Материал',
        required: false,
        type: 'string',
        defaultValue: DEFAULT_VALUES.MATERIAL
      },
      {
        id: 147,
        name: 'Размеры',
        required: false,
        type: 'string'
      }
    );
  }
  
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Метод не поддерживается. Используйте GET.' 
    });
  }

  try {
    const { categoryId } = req.query;
    const { locale = 'ru', includeDefaults = 'true' } = req.query;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Не указан ID категории'
      });
    }

    const categoryIdNum = parseInt(categoryId as string);
    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID категории'
      });
    }

    console.log(`📋 Запрос характеристик для категории ${categoryIdNum}...`);

    let characteristics: WBCharacteristic[] = [];
    let source = '';

    // Пробуем получить через API
    const apiToken = getApiToken(req);
    
    if (apiToken) {
      try {
        console.log('🔑 Получаем характеристики через WB API...');
        
        const rawCharacteristics = await proxyEnabledWbService.getCategoryCharacteristics(
          categoryIdNum, 
          apiToken, 
          locale as string
        );
        
        characteristics = rawCharacteristics.map(normalizeCharacteristic);
        source = 'api';
        
        console.log(`✅ Получено ${characteristics.length} характеристик через API`);
        
      } catch (apiError) {
        console.error('❌ Ошибка получения характеристик через API:', apiError);
        
        // Fallback на базовые характеристики
        characteristics = [...FALLBACK_CHARACTERISTICS];
        source = 'fallback-api-error';
        
        console.log('🔄 Используем fallback характеристики');
      }
    } else {
      console.log('⚠️ Токен API не найден, используем fallback характеристики');
      characteristics = [...FALLBACK_CHARACTERISTICS];
      source = 'fallback-no-token';
    }

    // Добавляем обязательные характеристики если их нет
    if (includeDefaults === 'true') {
      const requiredIds = Object.values(REQUIRED_CHARACTERISTICS.UNIVERSAL);
      
      for (const requiredId of requiredIds) {
        const exists = characteristics.some(char => char.id === requiredId);
        if (!exists) {
          const fallbackChar = FALLBACK_CHARACTERISTICS.find(char => char.id === requiredId);
          if (fallbackChar) {
            characteristics.push(fallbackChar);
            console.log(`➕ Добавлена обязательная характеристика: ${fallbackChar.name}`);
          }
        }
      }
    }

    // Добавляем специфичные для категории характеристики
    characteristics = addCategorySpecificCharacteristics(categoryIdNum, characteristics);

    // Сортируем: сначала обязательные, потом по названию
    characteristics.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ Итого характеристик: ${characteristics.length} (обязательных: ${characteristics.filter(c => c.required).length})`);

    return res.status(200).json({
      success: true,
      data: characteristics,
      meta: {
        categoryId: categoryIdNum,
        total: characteristics.length,
        required: characteristics.filter(c => c.required).length,
        optional: characteristics.filter(c => !c.required).length,
        source,
        locale,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка при получении характеристик:', error);

    // Возвращаем базовые характеристики в случае ошибки
    const categoryIdNum = parseInt(req.query.categoryId as string) || 0;
    const emergencyCharacteristics = addCategorySpecificCharacteristics(
      categoryIdNum, 
      [...FALLBACK_CHARACTERISTICS]
    );

    return res.status(200).json({
      success: true,
      data: emergencyCharacteristics,
      meta: {
        categoryId: categoryIdNum,
        total: emergencyCharacteristics.length,
        required: emergencyCharacteristics.filter(c => c.required).length,
        optional: emergencyCharacteristics.filter(c => !c.required).length,
        source: 'emergency-fallback',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: new Date().toISOString()
      }
    });
  }
}