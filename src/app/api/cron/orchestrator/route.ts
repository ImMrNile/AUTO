// src/app/api/cron/orchestrator/route.ts
// Endpoint для запуска оркестратора
// Вызывается 1 раз в день через Vercel Cron

import { NextRequest, NextResponse } from 'next/server';
import { startOrchestrator, getOrchestratorStats } from '@/lib/cron-orchestrator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 минут для старта

/**
 * GET - Запуск оркестратора
 * Вызывается 1 раз в день через Vercel Cron
 * 
 * Оркестратор работает 24 часа и вызывает endpoints:
 * - sync-analytics: каждые 2 часа
 * - sync-products: каждые 2 часа
 * - check-prices: каждые 30 минут
 * - check-campaigns: каждые 3 часа
 * 
 * Для настройки в vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/orchestrator",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации cron запроса
    // Vercel Cron отправляет заголовок x-vercel-cron: 1
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Разрешаем запросы от Vercel Cron или с правильным CRON_SECRET
    const isAuthorized = isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);
    
    if (!isAuthorized) {
      console.warn('⚠️ [Orchestrator] Неавторизованная попытка запуска');
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('🚀 [Orchestrator API] Получен запрос на запуск оркестратора');

    // Получаем base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    
    if (!host) {
      throw new Error('Cannot determine base URL');
    }

    const baseUrl = `${protocol}://${host}`;
    console.log(`📍 [Orchestrator API] Base URL: ${baseUrl}`);

    // Получаем статистику
    const stats = getOrchestratorStats();
    
    console.log(`📊 [Orchestrator API] Статистика:`);
    console.log(`   Задач: ${stats.tasks.length}`);
    console.log(`   Всего вызовов за 24 часа: ${stats.totalExecutionsPerDay}`);
    
    for (const task of stats.tasks) {
      console.log(`   - ${task.name}: ${task.executionsPerDay} раз (каждые ${task.intervalMinutes} мин)`);
    }

    // Запускаем оркестратор (не блокируем ответ)
    // Оркестратор будет работать в фоне 24 часа
    startOrchestrator(baseUrl).catch(error => {
      console.error('❌ [Orchestrator API] Критическая ошибка оркестратора:', error);
    });

    // Сразу возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      message: 'Оркестратор запущен на 24 часа',
      baseUrl,
      stats: {
        tasks: stats.tasks,
        totalExecutionsPerDay: stats.totalExecutionsPerDay
      },
      startedAt: new Date().toISOString(),
      willStopAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('❌ [Orchestrator API] Ошибка запуска:', error);
    return NextResponse.json({
      error: 'Ошибка запуска оркестратора',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * POST - Ручной запуск оркестратора
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
