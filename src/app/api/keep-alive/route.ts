import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

/**
 * GET /api/keep-alive
 * Endpoint для поддержания работы сервиса
 * Должен вызываться внешней системой каждые 30 минут
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Keep Alive] Сервис активен:', new Date().toISOString());

    // Получаем base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Выполняем задачи по расписанию (простая логика без сохранения состояния)
    const taskResults = await executeScheduledTasks(baseUrl);

    // Выполняем легкие проверки системы
    const healthCheck = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      status: 'healthy',
      tasksExecuted: taskResults.executed.length,
      tasksFailed: taskResults.failed.length
    };

    // Логируем активность
    console.log('📊 [Keep Alive] Статус системы:', {
      uptime: `${Math.floor(healthCheck.uptime / 3600)}ч ${Math.floor((healthCheck.uptime % 3600) / 60)}м`,
      memory: `${Math.round(healthCheck.memory.heapUsed / 1024 / 1024)}MB`,
      tasksExecuted: taskResults.executed,
      tasksFailed: taskResults.failed
    });

    return NextResponse.json({
      success: true,
      message: 'Service is alive and tasks executed',
      ...healthCheck,
      tasks: taskResults
    });

  } catch (error: any) {
    console.error('❌ [Keep Alive] Ошибка:', error);
    return NextResponse.json(
      { error: 'Health check failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keep-alive
 * Выполнение задач обслуживания системы
 */
export async function POST(request: NextRequest) {
  let action = 'unknown';
  
  try {
    // Получаем base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const baseUrl = host ? `${protocol}://${host}` : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const body = await request.json();
    action = body.action;
    console.log(`🔄 [Keep Alive] Выполнение действия: ${action}`);

    switch (action) {
      case 'sync-analytics':
        // Синхронизация аналитики
        await performAnalyticsSync(baseUrl);
        break;

      case 'sync-products':
        // Синхронизация товаров
        await performProductsSync(baseUrl);
        break;

      case 'check-prices':
        // Проверка закрепленных цен
        await performPriceCheck(baseUrl);
        break;

      case 'check-campaigns':
        // Проверка кампаний
        await performCampaignCheck(baseUrl);
        break;

      case 'cleanup':
        // Очистка старых данных
        await performCleanup();
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      executedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`❌ [Keep Alive] Ошибка выполнения действия ${action}:`, error);
    return NextResponse.json(
      { error: error.message || 'Action execution failed' },
      { status: 500 }
    );
  }
}

// Вспомогательные функции для выполнения задач
async function performAnalyticsSync(baseUrl: string) {
  console.log('📊 [Analytics Sync] Запуск синхронизации аналитики...');

  const response = await fetch(`${baseUrl}/api/cron/sync-analytics`, {
    method: 'POST',
    headers: {
      'x-keep-alive': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'sync-analytics',
      days: 30
    })
  });

  if (response.ok) {
    const result = await response.json();
    console.log(`✅ [Analytics Sync] Синхронизация завершена: ${result.analytics?.synced || 0} записей`);
  } else {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.warn('⚠️ [Analytics Sync] Синхронизация завершилась с ошибкой');
    throw new Error(`Analytics sync failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function performProductsSync(baseUrl: string) {
  console.log('📦 Синхронизация товаров с Wildberries (новые товары)...');

  const response = await fetch(`${baseUrl}/api/cron/sync-products`, {
    method: 'POST',
    headers: {
      'x-keep-alive': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'sync-products',
      syncToDb: true
    })
  });

  if (response.ok) {
    const result = await response.json();
    console.log(`✅ Синхронизация товаров завершена: ${result.total || 0} товаров`);
  } else {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.warn('⚠️ Синхронизация товаров завершилась с ошибкой');
    throw new Error(`Products sync failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function performPriceCheck(baseUrl: string) {
  console.log('💰 [Price Check] Запуск проверки цен...');

  const response = await fetch(`${baseUrl}/api/cron/check-prices`, {
    method: 'GET',
    headers: {
      'x-keep-alive': 'true',
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    console.log('✅ [Price Check] Проверка завершена');
  } else {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.warn(`⚠️ [Price Check] Проверка завершилась с ошибкой: ${response.status} ${response.statusText}`);
    throw new Error(`Price check failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function performCampaignCheck(baseUrl: string) {
  console.log('🎯 [Campaign Check] Запуск проверки кампаний...');

  const response = await fetch(`${baseUrl}/api/cron/check-campaigns`, {
    method: 'GET',
    headers: {
      'x-keep-alive': 'true',
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    console.log('✅ [Campaign Check] Проверка завершена');
  } else {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.warn('⚠️ [Campaign Check] Проверка завершилась с ошибкой');
    throw new Error(`Campaign check failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function performCleanup() {
  console.log('🧹 [Cleanup] Запуск очистки...');

  try {
    // Здесь можно добавить логику очистки старых логов, временных файлов и т.д.
    console.log('✅ [Cleanup] Очистка завершена');
  } catch (error) {
    console.error('❌ [Cleanup] Ошибка:', error);
  }
}

// ============================================
// НОВЫЕ ФУНКЦИИ ДЛЯ ВЫПОЛНЕНИЯ ЗАДАЧ ДЛЯ ВСЕХ КАБИНЕТОВ
// ============================================

async function performPriceCheckForAllCabinets(baseUrl: string, cabinets: any[]) {
  console.log(`💰 [Price Check] Последовательная проверка цен для ${cabinets.length} кабинетов...`);
  let totalChecked = 0;
  let totalErrors = 0;

  for (const [index, cabinet] of cabinets.entries()) {
    try {
      console.log(`🔍 Проверка цен для кабинета ${index + 1}/${cabinets.length}: ${cabinet.name || cabinet.id} (${cabinet.user.email})`);

      const response = await fetch(`${baseUrl}/api/cron/check-prices`, {
        method: 'GET',
        headers: {
          'x-keep-alive': 'true',
          'x-cabinet-user': cabinet.userId,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Проверка цен для ${cabinet.name}: проверено ${result.checked || 0}, восстановлено ${result.restored || 0}`);
        totalChecked += result.checked || 0;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`⚠️ Ошибка проверки цен для ${cabinet.name}: ${response.status} ${response.statusText}`);
        totalErrors++;
      }

      // Задержка между кабинетами (1 секунда для цен)
      if (index < cabinets.length - 1) {
        console.log(`⏳ Ожидание 1 секунды перед следующим кабинетом...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Критическая ошибка проверки цен для ${cabinet.name}:`, error);
      totalErrors++;
    }
  }

  console.log(`✅ [Price Check] Проверка завершена: ${totalChecked} товаров проверено, ${totalErrors} ошибок`);
}

async function performAnalyticsSyncForAllCabinets(baseUrl: string, cabinets: any[]) {
  console.log(`📊 [Analytics Sync] Последовательная синхронизация аналитики для ${cabinets.length} кабинетов...`);
  let totalSynced = 0;
  let totalErrors = 0;

  for (const [index, cabinet] of cabinets.entries()) {
    try {
      console.log(`🔄 Синхронизация аналитики для кабинета ${index + 1}/${cabinets.length}: ${cabinet.name || cabinet.id} (${cabinet.user.email})`);

      const response = await fetch(`${baseUrl}/api/cron/sync-analytics`, {
        method: 'POST',
        headers: {
          'x-keep-alive': 'true',
          'x-cabinet-user': cabinet.userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'sync-analytics',
          days: 30
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Синхронизация аналитики для ${cabinet.name}: синхронизировано ${result.totalSynced || 0} записей`);
        totalSynced += result.totalSynced || 0;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`⚠️ Ошибка синхронизации аналитики для ${cabinet.name}: ${response.status} ${response.statusText}`);
        totalErrors++;
      }

      // Задержка между кабинетами (4 секунды для аналитики)
      if (index < cabinets.length - 1) {
        console.log(`⏳ Ожидание 4 секунды перед следующим кабинетом...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

    } catch (error) {
      console.error(`❌ Критическая ошибка синхронизации аналитики для ${cabinet.name}:`, error);
      totalErrors++;
    }
  }

  console.log(`✅ [Analytics Sync] Синхронизация завершена: ${totalSynced} записей, ${totalErrors} ошибок`);
}

async function performProductsSyncForAllCabinets(baseUrl: string, cabinets: any[]) {
  console.log(`📦 [Products Sync] Последовательная синхронизация товаров для ${cabinets.length} кабинетов...`);
  let totalSynced = 0;
  let totalErrors = 0;

  for (const [index, cabinet] of cabinets.entries()) {
    try {
      console.log(`🔄 Синхронизация товаров для кабинета ${index + 1}/${cabinets.length}: ${cabinet.name || cabinet.id} (${cabinet.user.email})`);

      const response = await fetch(`${baseUrl}/api/cron/sync-products`, {
        method: 'POST',
        headers: {
          'x-keep-alive': 'true',
          'x-cabinet-user': cabinet.userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'sync-products',
          syncToDb: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Синхронизация товаров для ${cabinet.name}: синхронизировано ${result.totalSynced || 0} товаров`);
        totalSynced += result.totalSynced || 0;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`⚠️ Ошибка синхронизации товаров для ${cabinet.name}: ${response.status} ${response.statusText}`);
        totalErrors++;
      }

      // Задержка между кабинетами (5 секунд для товаров - тяжелая задача)
      if (index < cabinets.length - 1) {
        console.log(`⏳ Ожидание 5 секунд перед следующим кабинетом...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error(`❌ Критическая ошибка синхронизации товаров для ${cabinet.name}:`, error);
      totalErrors++;
    }
  }

  console.log(`✅ [Products Sync] Синхронизация завершена: ${totalSynced} товаров, ${totalErrors} ошибок`);
}

async function performCampaignCheckForAllCabinets(baseUrl: string, cabinets: any[]) {
  console.log(`🎯 [Campaign Check] Последовательная проверка кампаний для ${cabinets.length} кабинетов...`);
  let totalErrors = 0;

  for (const [index, cabinet] of cabinets.entries()) {
    try {
      console.log(`🔍 Проверка кампаний для кабинета ${index + 1}/${cabinets.length}: ${cabinet.name || cabinet.id} (${cabinet.user.email})`);

      const response = await fetch(`${baseUrl}/api/cron/check-campaigns`, {
        method: 'GET',
        headers: {
          'x-keep-alive': 'true',
          'x-cabinet-user': cabinet.userId,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`✅ Проверка кампаний для ${cabinet.name} завершена`);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`⚠️ Ошибка проверки кампаний для ${cabinet.name}: ${response.status} ${response.statusText}`);
        totalErrors++;
      }

      // Задержка между кабинетами (1 секунда для кампаний)
      if (index < cabinets.length - 1) {
        console.log(`⏳ Ожидание 1 секунды перед следующим кабинетом...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`❌ Критическая ошибка проверки кампаний для ${cabinet.name}:`, error);
      totalErrors++;
    }
  }

  console.log(`✅ [Campaign Check] Проверка завершена: ${totalErrors} ошибок`);
}

/**
 * Выполняет задачи по расписанию на основе текущего времени для всех активных кабинетов
 * Обрабатывает кабинеты последовательно с задержками между ними для избежания перегрузки WB API
 */
async function executeScheduledTasks(baseUrl: string): Promise<{ executed: string[], failed: string[] }> {
  const executed: string[] = [];
  const failed: string[] = [];

  const now = new Date();
  const currentHour = now.getUTCHours(); // Используем UTC для консистентности

  console.log(`🔄 [Scheduled Tasks] Проверка задач на ${now.toISOString()}, UTC час: ${currentHour}`);

  try {
    // Получаем все активные кабинеты
    const activeCabinets = await prisma.cabinet.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    console.log(`📊 [Scheduled Tasks] Найдено ${activeCabinets.length} активных кабинетов`);

    if (activeCabinets.length === 0) {
      console.log('⚠️ [Scheduled Tasks] Нет активных кабинетов для обработки');
      return { executed, failed };
    }

    // ============================================
    // ЗАДАЧА 1: ПРОВЕРКА ЗАКРЕПЛЕННЫХ ЦЕН (каждые 30 минут - всегда)
    // Проверяет изменил ли WB цену и восстанавливает закрепленную цену
    // ============================================
    console.log('🚀 [Scheduled Tasks] Выполнение: check-prices для всех кабинетов');
    try {
      await performPriceCheckForAllCabinets(baseUrl, activeCabinets);
      executed.push('check-prices');
      console.log('✅ [Scheduled Tasks] Задача "check-prices" выполнена успешно');
    } catch (error) {
      failed.push('check-prices');
      console.error('❌ [Scheduled Tasks] Ошибка выполнения "check-prices":', error);
    }

    // ============================================
    // ЗАДАЧА 2: СИНХРОНИЗАЦИЯ АНАЛИТИКИ (каждые 4 часа, из-за лимитов WB API)
    // Выгружает аналитику по выкупам и заказам для отображения на странице аналитики
    // ============================================
    if (currentHour % 4 === 0) { // Каждый 4-й час: 0, 4, 8, 12, 16, 20
      console.log('🚀 [Scheduled Tasks] Выполнение: sync-analytics (каждые 4 часа) для всех кабинетов');
      try {
        await performAnalyticsSyncForAllCabinets(baseUrl, activeCabinets);
        executed.push('sync-analytics');
        console.log('✅ [Scheduled Tasks] Задача "sync-analytics" выполнена успешно');
      } catch (error) {
        failed.push('sync-analytics');
        console.error('❌ [Scheduled Tasks] Ошибка выполнения "sync-analytics":', error);
      }
    }

    // ============================================
    // ЗАДАЧА 3: СИНХРОНИЗАЦИЯ НОВЫХ ТОВАРОВ (каждый час)
    // Синхронизирует новые товары из WB, чтобы они отображались на сервисе
    // ============================================
    if (currentHour % 1 === 0) { // Каждый час
      console.log('🚀 [Scheduled Tasks] Выполнение: sync-products (каждый час) для всех кабинетов');
      try {
        await performProductsSyncForAllCabinets(baseUrl, activeCabinets);
        executed.push('sync-products');
        console.log('✅ [Scheduled Tasks] Задача "sync-products" выполнена успешно');
      } catch (error) {
        failed.push('sync-products');
        console.error('❌ [Scheduled Tasks] Ошибка выполнения "sync-products":', error);
      }
    }

    // ============================================
    // ЗАДАЧА 4: ПРОВЕРКА ПРОДВИЖЕНИЯ (каждые 3 часа)
    // Проверяет продвижение, заказы, конверсии, поисковые запросы
    // ============================================
    if (currentHour % 3 === 0) { // Каждый 3-й час: 0, 3, 6, 9, 12, 15, 18, 21
      console.log('🚀 [Scheduled Tasks] Выполнение: check-campaigns (каждые 3 часа) для всех кабинетов');
      try {
        await performCampaignCheckForAllCabinets(baseUrl, activeCabinets);
        executed.push('check-campaigns');
        console.log('✅ [Scheduled Tasks] Задача "check-campaigns" выполнена успешно');
      } catch (error) {
        failed.push('check-campaigns');
        console.error('❌ [Scheduled Tasks] Ошибка выполнения "check-campaigns":', error);
      }
    }

    // ============================================
    // ЗАДАЧА 5: ОЧИСТКА (раз в день в 2:00 UTC)
    // ============================================
    if (currentHour === 2) { // Каждый день в 2:00 UTC
      console.log('🚀 [Scheduled Tasks] Выполнение: cleanup (раз в день)');
      try {
        await performCleanup();
        executed.push('cleanup');
        console.log('✅ [Scheduled Tasks] Задача "cleanup" выполнена успешно');
      } catch (error) {
        failed.push('cleanup');
        console.error('❌ [Scheduled Tasks] Ошибка выполнения "cleanup":', error);
      }
    }

    // Небольшая задержка между задачами
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 секунд между задачами

  } catch (error) {
    console.error('❌ [Scheduled Tasks] Критическая ошибка:', error);
  }

  console.log(`✅ [Scheduled Tasks] Выполнение завершено: ${executed.length} успешно, ${failed.length} с ошибками`);

  return { executed, failed };
}
