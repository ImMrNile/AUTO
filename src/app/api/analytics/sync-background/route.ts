import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { inngest } from '@/lib/inngest/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/sync-background
 * Запускает фоновую синхронизацию аналитики через Inngest
 * Работает часами в фоне, не блокирует UI
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    const { batchSize = 10 } = await request.json().catch(() => ({}));

    console.log(`🚀 Запуск фоновой синхронизации аналитики для пользователя ${user.id}`);

    // Отправляем событие в Inngest
    const { ids } = await inngest.send({
      name: 'analytics/sync.background',
      data: {
        userId: user.id,
        batchSize
      }
    });

    console.log(`✅ Фоновая задача создана: ${ids[0]}`);

    return NextResponse.json({
      success: true,
      message: 'Фоновая синхронизация запущена',
      taskId: ids[0],
      info: {
        description: 'Синхронизация работает в фоне',
        duration: 'Может занять 1-2 часа',
        batchSize,
        note: 'Данные будут постепенно появляться в интерфейсе'
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка запуска фоновой синхронизации:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to start background sync' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/sync-background
 * Проверяет статус фоновой синхронизации
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    // TODO: Получить статус из Inngest API
    // Пока возвращаем заглушку
    return NextResponse.json({
      success: true,
      status: 'running',
      message: 'Проверьте статус в Inngest Dashboard'
    });

  } catch (error: any) {
    console.error('❌ Ошибка проверки статуса:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
