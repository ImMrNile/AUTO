import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Тест 1: DNS резолв
  try {
    console.log('🔍 Тест 1: DNS резолв advert-api.wildberries.ru');
    const dns = require('dns').promises;
    const addresses = await dns.resolve4('advert-api.wildberries.ru');
    results.tests.push({
      name: 'DNS Resolution',
      status: 'success',
      data: addresses
    });
    console.log('✅ DNS OK:', addresses);
  } catch (error: any) {
    results.tests.push({
      name: 'DNS Resolution',
      status: 'error',
      error: error.message
    });
    console.log('❌ DNS Error:', error.message);
  }

  // Тест 2: Простой HTTP запрос с таймаутом
  try {
    console.log('🔍 Тест 2: HTTP запрос к WB API');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const startTime = Date.now();
    const response = await fetch('https://advert-api.wildberries.ru/ping', {
      method: 'GET',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    const duration = Date.now() - startTime;
    
    results.tests.push({
      name: 'HTTP Request to /ping',
      status: response.ok ? 'success' : 'http_error',
      statusCode: response.status,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });
    console.log(`✅ HTTP OK: ${response.status} (${duration}ms)`);
  } catch (error: any) {
    results.tests.push({
      name: 'HTTP Request to /ping',
      status: 'error',
      error: error.message,
      code: error.code,
      cause: error.cause?.message
    });
    console.log('❌ HTTP Error:', error.message, error.code);
  }

  // Тест 3: Проверка с другим endpoint
  try {
    console.log('🔍 Тест 3: Альтернативный endpoint');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const startTime = Date.now();
    const response = await fetch('https://suppliers-api.wildberries.ru/ping', {
      method: 'GET',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    const duration = Date.now() - startTime;
    
    results.tests.push({
      name: 'HTTP Request to suppliers-api /ping',
      status: response.ok ? 'success' : 'http_error',
      statusCode: response.status,
      duration: `${duration}ms`
    });
    console.log(`✅ Suppliers API OK: ${response.status} (${duration}ms)`);
  } catch (error: any) {
    results.tests.push({
      name: 'HTTP Request to suppliers-api /ping',
      status: 'error',
      error: error.message,
      code: error.code
    });
    console.log('❌ Suppliers API Error:', error.message);
  }

  return NextResponse.json(results);
}
