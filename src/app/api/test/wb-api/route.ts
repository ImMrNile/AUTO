// src/app/api/test/wb-api/route.ts - Простой тест доступности WB API

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test/wb-api?token=YOUR_TOKEN
 * 
 * Простой тест доступности WB API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiToken = searchParams.get('token');

    if (!apiToken) {
      return NextResponse.json(
        {
          error: 'API token required',
          message: 'Передайте параметр ?token=YOUR_WB_API_TOKEN'
        },
        { status: 400 }
      );
    }

    console.log(`\n🧪 [Test WB API] Начинаем тест...`);
    console.log(`   Token: ${apiToken.substring(0, 20)}...`);

    // Пробуем разные endpoints
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const endpoints = [
      'https://common-api.wildberries.ru/api/v2/tariffs/box',
      `https://common-api.wildberries.ru/api/v1/tariffs/box?date=${today}`,
      'https://common-api.wildberries.ru/content/v1/tariffs/box',
      'https://statistics-api.wildberries.ru/api/v1/tariffs/box'
    ];

    const results = [];

    for (const url of endpoints) {
      console.log(`\n   🔍 Пробуем: ${url}`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });

        console.log(`   ✅ Ответ: ${response.status} ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        results.push({
          url: url,
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          success: response.ok,
          data: typeof data === 'string' ? data.substring(0, 300) : data
        });

        if (response.ok && data.response?.data) {
          console.log(`   ✅ НАЙДЕН РАБОЧИЙ ENDPOINT!`);
          return NextResponse.json({
            success: true,
            workingEndpoint: url,
            status: response.status,
            data: data
          });
        }
      } catch (err) {
        console.error(`   ❌ Ошибка:`, err);
        results.push({
          url: url,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Ни один endpoint не вернул корректные данные',
      results: results
    });

  } catch (error) {
    console.error(`\n❌ [Test WB API] Ошибка:`, error);
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
