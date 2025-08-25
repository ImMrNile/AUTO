// src/app/api/wb-proxy/route.ts - Прокси для безопасной работы с WB API

import { NextRequest, NextResponse } from 'next/server';
import { WB_API_CONFIG } from '../../../../lib/config/wbApiConfig';

// Простой кеш в памяти для категорий и справочников
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// TTL для разных типов данных (в миллисекундах)
const CACHE_TTL = {
  CATEGORIES: 24 * 60 * 60 * 1000, // 24 часа
  CHARACTERISTICS: 12 * 60 * 60 * 1000, // 12 часов
  DIRECTORIES: 24 * 60 * 60 * 1000, // 24 часа
  DEFAULT: 5 * 60 * 1000 // 5 минут
};

interface ProxyRequest {
  endpoint: string;
  method: string;
  data?: any;
  apiToken: string;
  useCache?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProxyRequest = await request.json();
    const { endpoint, method, data, apiToken, useCache = true } = body;

    if (!endpoint || !apiToken) {
      return NextResponse.json({
        success: false,
        error: 'Endpoint и apiToken обязательны'
      }, { status: 400 });
    }

    console.log(`🔗 WB Proxy: ${method} ${endpoint}`);

    // Проверяем кеш для GET запросов
    if (method === 'GET' && useCache) {
      const cacheKey = `${endpoint}_${apiToken.slice(-10)}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log(`📦 Возвращаем из кеша: ${endpoint}`);
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true
        });
      }
    }

    // Формируем полный URL
    const url = `${WB_API_CONFIG.BASE_URLS.CONTENT}${endpoint}`;
    
    // Подготавливаем заголовки с исправленной авторизацией
    const headers = {
      'Authorization': apiToken, // ИСПРАВЛЕНО: убираем "Bearer" если токен уже содержит его
      'Content-Type': 'application/json',
      'User-Agent': 'WB-Automation/1.0'
    };

    // Логируем запрос для отладки (без токена)
    console.log(`🔗 WB Proxy запрос: ${method} ${endpoint}`);
    console.log(`🔑 Токен начинается с: ${apiToken.substring(0, 10)}...`);

    // Подготавливаем опции запроса
    const fetchOptions: RequestInit = {
      method,
      headers
    };

    // Добавляем тело запроса для POST/PUT
    if ((method === 'POST' || method === 'PUT') && data) {
      fetchOptions.body = JSON.stringify(data);
    }

    // Делаем запрос к WB API с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ WB API ошибка ${response.status}:`, errorText);
        
        return NextResponse.json({
          success: false,
          error: `WB API Error ${response.status}: ${errorText}`,
          statusCode: response.status
        }, { status: response.status });
      }

      const responseData = await response.json();
      console.log(`✅ WB API успешный ответ`);

      // Кешируем GET запросы
      if (method === 'GET' && useCache) {
        const cacheKey = `${endpoint}_${apiToken.slice(-10)}`;
        setCachedData(cacheKey, responseData, getCacheTTL(endpoint));
      }

      return NextResponse.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Таймаут запроса к WB API');
        return NextResponse.json({
          success: false,
          error: 'Таймаут запроса к WB API'
        }, { status: 408 });
      }

      console.error('❌ Ошибка запроса к WB API:', error);
      return NextResponse.json({
        success: false,
        error: 'Ошибка соединения с WB API'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Ошибка в прокси:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка обработки запроса'
    }, { status: 500 });
  }
}

// GET - получение статистики кеша
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'stats') {
    const stats = {
      cacheSize: cache.size,
      entries: Array.from(cache.keys()).map(key => {
        const entry = cache.get(key);
        return {
          key: key.substring(0, 50) + '...',
          age: entry ? Date.now() - entry.timestamp : 0,
          ttl: entry?.ttl,
          expired: entry ? Date.now() > entry.timestamp + entry.ttl : true
        };
      })
    };

    return NextResponse.json({ stats });
  }

  return NextResponse.json({
    message: 'WB API Proxy активен',
    endpoints: {
      POST: 'Проксирование запросов к WB API',
      'GET?action=stats': 'Статистика кеша',
      'DELETE?action=clear-cache': 'Очистка кеша'
    }
  });
}

// DELETE - очистка кеша
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'clear-cache') {
    const sizeBefore = cache.size;
    cache.clear();
    console.log(`🗑️ Кеш очищен. Удалено ${sizeBefore} записей`);
    
    return NextResponse.json({
      success: true,
      message: `Кеш очищен. Удалено ${sizeBefore} записей`
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Неизвестное действие'
  }, { status: 400 });
}

// PATCH - получение статистики использования
export async function PATCH() {
  // Здесь можно добавить более детальную статистику
  const stats = {
    totalRequests: 0, // TODO: реализовать счетчики
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    avgResponseTime: 0
  };

  return NextResponse.json({ stats });
}

// Функции для работы с кешем
function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Проверяем, не истек ли кеш
  if (Date.now() > entry.timestamp + entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });

  // Ограничиваем размер кеша
  if (cache.size > 1000) {
    // Удаляем самые старые записи
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Удаляем 20% самых старых записей
    const toDelete = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toDelete; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

function getCacheTTL(endpoint: string): number {
  if (endpoint.includes('/object/all') || endpoint.includes('/object/parent')) {
    return CACHE_TTL.CATEGORIES;
  }
  
  if (endpoint.includes('/charcs')) {
    return CACHE_TTL.CHARACTERISTICS;
  }
  
  if (endpoint.includes('/directory/')) {
    return CACHE_TTL.DIRECTORIES;
  }
  
  return CACHE_TTL.DEFAULT;
}

// Фоновая очистка устаревших записей каждые 30 минут
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Очищено ${keysToDelete.length} устаревших записей кеша`);
    }
  }, 30 * 60 * 1000); // 30 минут
}