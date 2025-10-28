// src/app/api/tasks/[taskId]/route.ts - API для получения одной задачи
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { taskCache } from '../../../../../lib/task-cache';

// GET - получить конкретную задачу по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json({
        error: 'Не указан ID задачи'
      }, { status: 400 });
    }

    // Проверяем кеш
    const cacheKey = `${user.id}:${taskId}`;
    const cachedTask = taskCache.get(cacheKey);
    
    if (cachedTask) {
      return NextResponse.json({
        success: true,
        task: cachedTask,
        cached: true
      });
    }

    // Получаем конкретную задачу из БД
    const task = await safePrismaOperation(
      () => prisma.productCreationTask.findUnique({
        where: { 
          id: taskId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              status: true,
              generatedName: true,
              seoDescription: true,
              price: true,
              discountPrice: true,
              costPrice: true,
              stock: true,
              dimensions: true,
              aiCharacteristics: true
            }
          }
        }
      }),
      'получение задачи по ID'
    );

    if (!task) {
      return NextResponse.json({
        error: 'Задача не найдена'
      }, { status: 404 });
    }

    // Проверяем, что задача принадлежит пользователю
    if (task.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет доступа к этой задаче'
      }, { status: 403 });
    }

    // Форматируем данные для фронтенда
    const product = task.product;
    const aiCharacteristics = (product?.aiCharacteristics as any) || {};
    
    const formattedTask = {
      id: task.id,
      productName: task.productName,
      status: task.status,
      progress: task.progress,
      currentStage: task.currentStage,
      errorMessage: task.errorMessage,
      productId: task.productId,
      createdAt: task.createdAt,
      // Данные от ИИ из товара
      generatedName: product?.generatedName,
      seoDescription: product?.seoDescription,
      characteristics: aiCharacteristics.characteristics,
      price: product?.price,
      discountPrice: product?.discountPrice,
      costPrice: product?.costPrice,
      stock: product?.stock,
      dimensions: product?.dimensions,
      // Статус товара для определения, опубликован ли он
      productStatus: product?.status
    };

    // Сохраняем в кеш
    taskCache.set(cacheKey, formattedTask);

    return NextResponse.json({
      success: true,
      task: formattedTask,
      cached: false
    });
  } catch (error: any) {
    console.error('Ошибка получения задачи:', error);
    return NextResponse.json({
      error: 'Ошибка получения задачи',
      details: error.message
    }, { status: 500 });
  }
}
