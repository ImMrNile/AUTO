// API для принудительного сброса зависших фоновых задач
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 [Reset API] Принудительный сброс зависших задач...');

    // Находим все задачи в статусе "в работе"
    const stuckTasks = await safePrismaOperation(
      () => prisma.productCreationTask.findMany({
        where: {
          status: {
            in: ['CREATING', 'ANALYZING', 'PUBLISHING']
          }
        },
        include: {
          product: true
        }
      }),
      'поиск зависших задач'
    );

    if (!stuckTasks || stuckTasks.length === 0) {
      return NextResponse.json({
        status: 'no_tasks',
        message: 'Нет зависших задач'
      });
    }

    console.log(`🔄 [Reset API] Найдено ${stuckTasks.length} зависших задач`);

    // Обновляем статус каждой задачи
    const resetResults = [];
    for (const task of stuckTasks) {
      try {
        const updatedTask = await safePrismaOperation(
          () => prisma.productCreationTask.update({
            where: { id: task.id },
            data: {
              status: 'ERROR',
              errorMessage: `Принудительно сброшено после перезапуска сервера. Задача была в статусе ${task.status}`,
              updatedAt: new Date()
            }
          }),
          `обновление задачи ${task.id}`
        );

        // Если есть связанный товар, обновляем его статус
        if (task.productId) {
          await safePrismaOperation(
            () => prisma.product.update({
              where: { id: task.productId as string },
              data: {
                status: 'DRAFT',
                updatedAt: new Date()
              }
            }),
            `обновление товара ${task.productId}`
          );
        }

        resetResults.push({
          taskId: task.id,
          productName: task.productName,
          oldStatus: task.status,
          newStatus: 'ERROR'
        });

        console.log(`✅ [Reset API] Задача ${task.id} (${task.productName}) сброшена`);
      } catch (error) {
        console.error(`❌ [Reset API] Ошибка сброса задачи ${task.id}:`, error);
        resetResults.push({
          taskId: task.id,
          productName: task.productName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Сброшено ${resetResults.filter(r => !r.error).length} из ${stuckTasks.length} задач`,
      results: resetResults
    });

  } catch (error) {
    console.error('❌ [Reset API] Ошибка сброса задач:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
