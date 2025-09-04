// src/app/api/wb/test-connection/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'API токен обязателен' },
        { status: 400 }
      );
    }

    const results = await testWildberriesConnection(token);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Ошибка тестирования соединения:', error);
    return NextResponse.json(
      { error: 'Ошибка при тестировании соединения' },
      { status: 500 }
    );
  }
}

async function testWildberriesConnection(token: string) {
  // Новые домены API Wildberries 2025
  const tests = [
    {
      name: 'Content API - Ping',
      endpoint: 'https://content-api.wildberries.ru/ping',
      description: 'Проверка доступности Content API (управление товарами)',
      category: 'content'
    },
    {
      name: 'Marketplace API - Ping', 
      endpoint: 'https://marketplace-api.wildberries.ru/ping',
      description: 'Проверка доступности Marketplace API (склады и остатки)',
      category: 'marketplace'
    },
    {
      name: 'Statistics API - Ping',
      endpoint: 'https://statistics-api.wildberries.ru/ping', 
      description: 'Проверка доступности Statistics API (статистика продаж)',
      category: 'statistics'
    },
    {
      name: 'Prices API - Ping',
      endpoint: 'https://discounts-prices-api.wildberries.ru/ping',
      description: 'Проверка доступности Prices API (цены и скидки)',
      category: 'prices'
    },
    {
      name: 'Content API - Категории',
      endpoint: 'https://content-api.wildberries.ru/content/v2/object/all',
      description: 'Получение списка категорий товаров',
      category: 'content',
      dataTest: true
    }
  ];

  const results = [];

  for (const test of tests) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд

      const response = await fetch(test.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': token, // JWT токен без Bearer префикса
          'Content-Type': 'application/json',
          'User-Agent': 'WB-Automation/1.0', // Обязательный User-Agent
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      let status = 'error';
      let message = `Ошибка ${response.status}`;
      let additionalInfo = '';

      if (response.ok) {
        status = 'success';
        message = 'Успешно';
        
        // Для ping endpoints просто проверяем статус
        if (test.endpoint.includes('/ping')) {
          try {
            const pingData = await response.text();
            additionalInfo = `Ping ответ: ${pingData}`;
          } catch (e) {
            additionalInfo = 'Ping успешен';
          }
        } 
        // Для data endpoints пытаемся получить данные
        else if (test.dataTest) {
          try {
            const data = await response.json();
            if (Array.isArray(data)) {
              message = `Успешно (получено ${data.length} категорий)`;
              additionalInfo = `Примеры: ${data.slice(0, 3).map((item: any) => item.objectName || item.name).join(', ')}`;
            } else if (data && typeof data === 'object') {
              message = 'Успешно (получены данные)';
            }
          } catch (e) {
            message = 'Успешно (данные получены, но не JSON)';
          }
        }
      } else {
        // Детальная обработка ошибок
        if (response.status === 401) {
          message = 'Неверный токен авторизации';
          additionalInfo = 'Проверьте правильность API токена';
        } else if (response.status === 403) {
          message = 'Нет прав доступа';
          additionalInfo = 'Токен не имеет прав для данного API';
        } else if (response.status === 429) {
          message = 'Превышен лимит запросов';
          additionalInfo = 'Слишком много запросов к API';
        } else if (response.status === 404) {
          message = 'Endpoint не найден';
          additionalInfo = 'Возможно, API изменился';
        } else {
          try {
            const errorData = await response.json();
            additionalInfo = errorData.message || errorData.error || 'Неизвестная ошибка';
          } catch (e) {
            additionalInfo = 'Не удалось получить детали ошибки';
          }
        }
      }

      // Проверяем rate limit заголовки
      const rateLimitInfo = getRateLimitInfo(response);

      results.push({
        ...test,
        status,
        message,
        additionalInfo,
        responseTime: `${responseTime}ms`,
        httpStatus: response.status,
        rateLimitInfo
      });

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      let message = 'Ошибка соединения';
      let additionalInfo = '';
      
      if (error.name === 'AbortError') {
        message = 'Превышен таймаут (15с)';
        additionalInfo = 'Сервер не отвечает';
      } else if (error.message.includes('ENOTFOUND')) {
        message = 'Не удается найти сервер';
        additionalInfo = 'DNS не может разрешить домен';
      } else if (error.message.includes('ECONNREFUSED')) {
        message = 'Соединение отклонено';
        additionalInfo = 'Сервер отклонил подключение';
      } else if (error.message.includes('timeout')) {
        message = 'Превышен таймаут';
        additionalInfo = 'Медленное соединение';
      } else if (error.message.includes('CORS')) {
        message = 'CORS ошибка';
        additionalInfo = 'Проблема с кросс-доменными запросами';
      } else {
        additionalInfo = error.message;
      }

      results.push({
        ...test,
        status: 'error',
        message,
        additionalInfo,
        responseTime: `${responseTime}ms`,
        error: error.message
      });
    }

    // Пауза между запросами для соблюдения rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Добавляем общую диагностику
  const successCount = results.filter(r => r.status === 'success').length;
  const summary = {
    totalTests: tests.length,
    successCount,
    failureCount: tests.length - successCount,
    overallStatus: successCount === tests.length ? 'success' : 
                   successCount > 0 ? 'partial' : 'failed',
    recommendation: getRecommendation(results),
    tokenAnalysis: analyzeToken(token)
  };

  return { tests: results, summary };
}

// Анализ rate limit заголовков
function getRateLimitInfo(response: Response) {
  const headers = {
    remaining: response.headers.get('X-Ratelimit-Remaining'),
    limit: response.headers.get('X-Ratelimit-Limit'), 
    reset: response.headers.get('X-Ratelimit-Reset'),
    retry: response.headers.get('X-Ratelimit-Retry')
  };

  if (Object.values(headers).some(h => h !== null)) {
    return headers;
  }
  return null;
}

// Анализ JWT токена
function analyzeToken(token: string) {
  try {
    // Простая проверка формата JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Неверный формат JWT токена' };
    }

    // Декодируем payload (без проверки подписи)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return {
      valid: true,
      isExpired,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString('ru-RU') : 'Не указано',
      sellerId: payload.sid || 'Не указано',
      permissions: payload.s || 'Не указано',
      isTestToken: payload.t || false
    };
  } catch (error) {
    return { valid: false, error: 'Не удалось разобрать токен' };
  }
}

function getRecommendation(results: any[]): string {
  const successCount = results.filter(r => r.status === 'success').length;
  const timeoutCount = results.filter(r => r.message.includes('таймаут')).length;
  const authErrors = results.filter(r => r.message.includes('токен') || r.message.includes('прав')).length;
  const notFoundErrors = results.filter(r => r.httpStatus === 404).length;
  const rateLimitErrors = results.filter(r => r.httpStatus === 429).length;

  if (successCount === results.length) {
    return 'Все тесты прошли успешно. Токен валидный и соединение стабильное.';
  } else if (successCount > 0) {
    return 'Частичное соединение с API. Проверьте права токена для отдельных категорий API.';
  } else if (authErrors > 0) {
    return 'Проблемы с авторизацией. Проверьте правильность API токена и его права доступа.';
  } else if (notFoundErrors > 0) {
    return 'API endpoints не найдены. Возможно, используются устаревшие URL.';
  } else if (rateLimitErrors > 0) {
    return 'Превышены лимиты запросов. Добавьте задержки между запросами.';
  } else if (timeoutCount > 0) {
    return 'Проблемы с сетевым соединением. Проверьте интернет-подключение и настройки прокси/firewall.';
  } else {
    return 'Не удается подключиться к API Wildberries. Возможны проблемы с геоблокировкой или сетью.';
  }
}