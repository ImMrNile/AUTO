// src/app/api/tasks/process/route.ts - API для запуска фоновой обработки задачи
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { BackgroundTaskProcessor } from '../../../../../lib/services/backgroundTaskProcessor';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/process - Запустить фоновую обработку задачи
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, productId } = body;

    if (!taskId || !productId) {
      return NextResponse.json({
        error: 'Не указаны taskId или productId'
      }, { status: 400 });
    }

    // Проверяем, что задача принадлежит пользователю
    const task = await safePrismaOperation(
      () => prisma.productCreationTask.findUnique({
        where: { id: taskId }
      }),
      'проверка задачи'
    );

    if (!task) {
      return NextResponse.json({
        error: 'Задача не найдена'
      }, { status: 404 });
    }

    if (task.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет прав для обработки этой задачи'
      }, { status: 403 });
    }

    // Запускаем обработку в фоне
    console.log(`🚀 Запуск фоновой обработки задачи ${taskId} для товара ${productId}`);
    
    // Не ждем завершения - обработка идет в фоне
    BackgroundTaskProcessor.processTask(taskId, productId).catch(error => {
      console.error(`❌ Ошибка фоновой обработки задачи ${taskId}:`, error);
    });

    return NextResponse.json({
      success: true,
      message: 'Задача запущена в фоновом режиме',
      taskId
    });

  } catch (error: any) {
    console.error('❌ Ошибка запуска фоновой обработки:', error);
    return NextResponse.json({
      error: 'Ошибка запуска фоновой обработки',
      details: error.message
    }, { status: 500 });
  }
}
