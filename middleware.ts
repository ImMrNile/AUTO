// middleware.ts - MIDDLEWARE ДЛЯ ОБРАБОТКИ CORS И БЕЗОПАСНОСТИ

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Простой in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 минута
const MAX_REQUESTS_PER_WINDOW = 100 // максимум 100 запросов в минуту

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Защищаем только API endpoints
  if (pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    
    // Проверяем rate limit
    const rateLimit = rateLimitMap.get(ip)
    if (rateLimit) {
      if (now > rateLimit.resetTime) {
        // Сброс счетчика
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      } else if (rateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
        // Превышен лимит
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      } else {
        // Увеличиваем счетчик
        rateLimit.count++
      }
    } else {
      // Первый запрос
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    }
    
    // Очищаем старые записи
    if (rateLimitMap.size > 1000) {
      const oldKeys = Array.from(rateLimitMap.keys()).slice(0, 200)
      oldKeys.forEach(key => rateLimitMap.delete(key))
    }
    
    // Проверяем авторизацию для защищенных endpoints
    if (pathname.startsWith('/api/products/') || 
        pathname.startsWith('/api/cabinets') ||
        pathname.startsWith('/api/categories')) {
      
      const sessionToken = request.cookies.get('session_token')?.value
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Unauthorized. Please log in.' },
          { status: 401 }
        )
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
// Дополнительные утилиты для работы с middleware

export class MiddlewareUtils {
  /**
   * Проверка валидности JWT токена (базовая проверка формата)
   */
  static isValidJWT(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Проверяем, что каждая часть это валидный base64
      parts.forEach(part => {
        const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        JSON.parse(decoded);
      });
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Извлечение IP адреса из запроса
   */
  static getClientIP(request: NextRequest): string {
    return (
      request.ip ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    );
  }
  
  /**
   * Проверка, является ли запрос от бота
   */
  static isBot(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const botPatterns = [
      'googlebot',
      'bingbot',
      'slurp',
      'duckduckbot',
      'baiduspider',
      'yandexbot',
      'facebookexternalhit',
      'twitterbot',
      'whatsapp',
      'telegram'
    ];
    
    return botPatterns.some(pattern => userAgent.includes(pattern));
  }
  
  /**
   * Логирование запросов (для отладки)
   */
  static logRequest(request: NextRequest, responseTime?: number): void {
    if (process.env.NODE_ENV === 'development') {
      const method = request.method;
      const url = request.url;
      const ip = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'Unknown';
      const time = responseTime ? ` (${responseTime}ms)` : '';
      
      console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}${time}`);
      
      if (this.isBot(request)) {
        console.log(`  🤖 Bot detected: ${userAgent}`);
      }
    }
  }
  
  /**
   * Создание заголовков для кеширования
   */
  static createCacheHeaders(maxAge: number = 3600, staleWhileRevalidate: number = 86400): Record<string, string> {
    return {
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
      'Vary': 'Accept-Encoding'
    };
  }
  
  /**
   * Создание заголовков для отключения кеширования
   */
  static createNoCacheHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    };
  }
}

// Экспорт конфигурации для использования в других местах
export { CORS_CONFIG, RATE_LIMIT_CONFIG };
