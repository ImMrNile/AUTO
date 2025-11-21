import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Тестовый роутер для проверки API кампаний Wildberries
 * 
 * Тестирует:
 * 1. /adv/v3/fullstats - основной API статистики
 * 2. /adv/v2/fullstats - альтернативный API (deprecated)
 * 3. /adv/v0/stats/keywords - статистика по ключевым словам
 * 4. /adv/v1/promotion/adverts - информация о кампании
 */
export async function GET(request: NextRequest) {
  const apiToken = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjUwOTA0djEiLCJ0eXAiOiJKV1QifQ.eyJhY2MiOjIsImVudCI6MSwiZXhwIjoxNzc4MTE3ODMyLCJpZCI6IjAxOWE1NDNjLTU5MzktNzg1NS1hMWY4LTIzOTQyNjBjZDYyYSIsImlpZCI6NDk4MTEyOTQsIm9pZCI6MTc1OTIzLCJzIjowLCJzaWQiOiIzNDY4NjYzZS1iM2QzLTQzNjgtYmM0ZC1iMDQwMDFhNzI1OGIiLCJ0Ijp0cnVlLCJ1aWQiOjQ5ODExMjk0fQ.MWGsnpPhI4jG5Fh5WlamxK4gOY0PCfXun_RMUymvK2NcKCLVgcsZFubbli5zD7tcM2BsNLq1ev2yvlnbSHrNWw';
  const campaignId = 27673276;
  const nmId = 356956444;
  
  const results: any = {
    campaignId,
    nmId,
    tests: {}
  };

  console.log(`\n🧪 [TEST] Начинаем тестирование кампании ${campaignId} для товара ${nmId}`);

  // ============================================
  // ТЕСТ 1: Информация о кампании
  // ============================================
  console.log(`\n📋 [TEST 1] Получение информации о кампании...`);
  try {
    const campaignInfoUrl = `https://advert-api.wildberries.ru/adv/v1/promotion/adverts?id=${campaignId}`;
    
    const campaignInfoResponse = await fetch(campaignInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });

    if (campaignInfoResponse.ok) {
      const campaignInfo = await campaignInfoResponse.json();
      results.tests.campaignInfo = {
        success: true,
        status: campaignInfoResponse.status,
        data: campaignInfo
      };
      
      console.log(`✅ [TEST 1] Успешно:`, JSON.stringify(campaignInfo, null, 2));
    } else {
      const errorText = await campaignInfoResponse.text();
      results.tests.campaignInfo = {
        success: false,
        status: campaignInfoResponse.status,
        error: errorText
      };
      
      console.log(`❌ [TEST 1] Ошибка ${campaignInfoResponse.status}:`, errorText);
    }
  } catch (error: any) {
    results.tests.campaignInfo = {
      success: false,
      error: error.message
    };
    console.log(`❌ [TEST 1] Исключение:`, error.message);
  }

  // ============================================
  // ТЕСТ 2: v3/fullstats (последние 31 день)
  // ============================================
  console.log(`\n📊 [TEST 2] v3/fullstats (последние 31 день)...`);
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 31 день

    const v3Url = `https://advert-api.wildberries.ru/adv/v3/fullstats?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`;
    
    const v3Response = await fetch(v3Url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify([campaignId])
    });

    if (v3Response.ok) {
      const v3Data = await v3Response.json();
      results.tests.v3fullstats = {
        success: true,
        status: v3Response.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        data: v3Data
      };
      
      console.log(`✅ [TEST 2] Успешно:`, JSON.stringify(v3Data, null, 2));
    } else {
      const errorText = await v3Response.text();
      results.tests.v3fullstats = {
        success: false,
        status: v3Response.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        error: errorText
      };
      
      console.log(`❌ [TEST 2] Ошибка ${v3Response.status}:`, errorText);
    }
  } catch (error: any) {
    results.tests.v3fullstats = {
      success: false,
      error: error.message
    };
    console.log(`❌ [TEST 2] Исключение:`, error.message);
  }

  // ============================================
  // ТЕСТ 3: v2/fullstats (с датами)
  // ============================================
  console.log(`\n📊 [TEST 3] v2/fullstats (последние 31 день с датами)...`);
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Генерируем массив дат
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const v2Url = `https://advert-api.wildberries.ru/adv/v2/fullstats`;
    const requestBody = [{
      id: campaignId,
      dates: dates
    }];
    
    console.log(`📤 [TEST 3] Тело запроса:`, JSON.stringify(requestBody).slice(0, 200));
    
    const v2Response = await fetch(v2Url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (v2Response.ok) {
      const v2Data = await v2Response.json();
      results.tests.v2fullstats = {
        success: true,
        status: v2Response.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        datesCount: dates.length,
        data: v2Data
      };
      
      console.log(`✅ [TEST 3] Успешно:`, JSON.stringify(v2Data, null, 2));
    } else {
      const errorText = await v2Response.text();
      results.tests.v2fullstats = {
        success: false,
        status: v2Response.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        datesCount: dates.length,
        error: errorText
      };
      
      console.log(`❌ [TEST 3] Ошибка ${v2Response.status}:`, errorText);
    }
  } catch (error: any) {
    results.tests.v2fullstats = {
      success: false,
      error: error.message
    };
    console.log(`❌ [TEST 3] Исключение:`, error.message);
  }

  // ============================================
  // ТЕСТ 4: keywords API (последние 7 дней)
  // ============================================
  console.log(`\n🔑 [TEST 4] keywords API (последние 7 дней)...`);
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // 7 дней

    const keywordsUrl = `https://advert-api.wildberries.ru/adv/v0/stats/keywords?advert_id=${campaignId}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`;
    
    const keywordsResponse = await fetch(keywordsUrl, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });

    if (keywordsResponse.ok) {
      const keywordsData = await keywordsResponse.json();
      results.tests.keywords = {
        success: true,
        status: keywordsResponse.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        data: keywordsData
      };
      
      console.log(`✅ [TEST 4] Успешно:`, JSON.stringify(keywordsData, null, 2));
    } else {
      const errorText = await keywordsResponse.text();
      results.tests.keywords = {
        success: false,
        status: keywordsResponse.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        error: errorText
      };
      
      console.log(`❌ [TEST 4] Ошибка ${keywordsResponse.status}:`, errorText);
    }
  } catch (error: any) {
    results.tests.keywords = {
      success: false,
      error: error.message
    };
    console.log(`❌ [TEST 4] Исключение:`, error.message);
  }

  // ============================================
  // ТЕСТ 5: keywords API (период с 11.08.2025)
  // ============================================
  console.log(`\n🔑 [TEST 5] keywords API (с даты создания кампании 11.08.2025)...`);
  try {
    const endDate = new Date('2025-08-17'); // +6 дней от 11.08
    const startDate = new Date('2025-08-11'); // Дата создания

    const keywordsUrl = `https://advert-api.wildberries.ru/adv/v0/stats/keywords?advert_id=${campaignId}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`;
    
    const keywordsResponse = await fetch(keywordsUrl, {
      method: 'GET',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      }
    });

    if (keywordsResponse.ok) {
      const keywordsData = await keywordsResponse.json();
      results.tests.keywordsHistorical = {
        success: true,
        status: keywordsResponse.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        data: keywordsData
      };
      
      console.log(`✅ [TEST 5] Успешно:`, JSON.stringify(keywordsData, null, 2));
    } else {
      const errorText = await keywordsResponse.text();
      results.tests.keywordsHistorical = {
        success: false,
        status: keywordsResponse.status,
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        error: errorText
      };
      
      console.log(`❌ [TEST 5] Ошибка ${keywordsResponse.status}:`, errorText);
    }
  } catch (error: any) {
    results.tests.keywordsHistorical = {
      success: false,
      error: error.message
    };
    console.log(`❌ [TEST 5] Исключение:`, error.message);
  }

  // ============================================
  // РЕЗЮМЕ
  // ============================================
  console.log(`\n📊 [TEST] РЕЗЮМЕ:`);
  console.log(`   Информация о кампании: ${results.tests.campaignInfo?.success ? '✅' : '❌'}`);
  console.log(`   v3/fullstats: ${results.tests.v3fullstats?.success ? '✅' : '❌'}`);
  console.log(`   v2/fullstats: ${results.tests.v2fullstats?.success ? '✅' : '❌'}`);
  console.log(`   keywords (последние 7 дней): ${results.tests.keywords?.success ? '✅' : '❌'}`);
  console.log(`   keywords (с 11.08.2025): ${results.tests.keywordsHistorical?.success ? '✅' : '❌'}`);

  return NextResponse.json(results, { status: 200 });
}
