// API для проверки статуса фоновых задач
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Тип для задачи из БД
interface TaskWithProduct {
  id: string;
  productName: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    status: string;
    wbNmId: string | null;
  } | null;
}

export async function GET() {
  try {
    console.log('🔍 [Status API] Проверка статуса фоновых задач...');

    // Получаем все задачи с их статусами
    const tasks = await safePrismaOperation<TaskWithProduct[]>(
      () => prisma.productCreationTask.findMany({
        select: {
          id: true,
          productName: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              status: true,
              wbNmId: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Последние 50 задач
      }),
      'получение статуса задач'
    );

    // Группируем задачи по статусам
    const statusCounts = (tasks || []).reduce((acc: Record<string, number>, task: TaskWithProduct) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    // Находим зависшие задачи (старше 20 минут и в статусе "в работе")
    const now = new Date();
    const stuckTasks = (tasks || []).filter((task: TaskWithProduct) => {
      const taskAge = now.getTime() - task.createdAt.getTime();
      const isStuck = taskAge > 20 * 60 * 1000; // 20 минут
      const isInProgress = ['CREATING', 'ANALYZING', 'PUBLISHING'].includes(task.status);
      return isStuck && isInProgress;
    });

    return NextResponse.json({
      status: 'success',
      total: (tasks || []).length,
      statusCounts,
      stuckTasks: stuckTasks.map((task: TaskWithProduct) => ({
        id: task.id,
        productName: task.productName,
        status: task.status,
        ageMinutes: Math.round((now.getTime() - task.createdAt.getTime()) / 60000),
        hasProduct: !!task.product,
        productStatus: task.product?.status
      })),
      recentTasks: (tasks || []).slice(0, 10).map((task: TaskWithProduct) => ({
        id: task.id,
        productName: task.productName,
        status: task.status,
        error: task.errorMessage,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        hasProduct: !!task.product,
        productStatus: task.product?.status,
        wbProductId: task.product?.wbNmId
      }))
    });

  } catch (error) {
    console.error('❌ [Status API] Ошибка проверки статуса:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
