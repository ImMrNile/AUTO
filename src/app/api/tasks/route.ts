// src/app/api/tasks/route.ts - API для управления фоновыми задачами создания товаров
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safePrismaOperation } from '@/lib/prisma-utils';
import { AuthService } from '@/lib/auth/auth-service';
import { taskCache } from '@/lib/task-cache';

// GET - получить все активные задачи пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    // Получаем только активные задачи + завершенные за последние 5 минут
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // Проверяем параметр status из query
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let whereCondition: any = {
      userId: user.id
    };

    // Если запрошены только товары "в работе"
    if (statusFilter === 'in-progress') {
      whereCondition.OR = [
        // Активные задачи (не завершены)
        {
          status: {
            in: ['CREATING', 'ANALYZING', 'PUBLISHING']
          }
        },
        // Завершенные задачи с неопубликованными товарами (DRAFT)
        {
          status: 'COMPLETED',
          product: {
            status: 'DRAFT'
          }
        }
      ];
    } else {
      // Стандартная логика: активные + завершенные за 5 минут
      whereCondition.OR = [
        {
          status: {
            in: ['CREATING', 'ANALYZING', 'PUBLISHING']
          }
        },
        {
          status: {
            in: ['COMPLETED', 'ERROR']
          },
          completedAt: {
            gte: fiveMinutesAgo
          }
        }
      ];
    }

    const tasks = await safePrismaOperation(
      () => prisma.productCreationTask.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc'
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
              aiCharacteristics: true,
              subcategoryId: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                  characteristics: {
                    orderBy: {
                      sortOrder: 'asc'
                    }
                  }
                }
              }
            }
          }
        }
      }),
      'получение задач пользователя'
    );

    // Форматируем данные для фронтенда
    const formattedTasks = (tasks || []).map((task: any) => {
      const product = task.product;
      const aiCharacteristics = (product?.aiCharacteristics as any) || {};
      
      // Получаем все характеристики категории
      const categoryCharacteristics = (product?.subcategory?.characteristics as any) || [];
      
      // Создаем map заполненных ИИ характеристик
      const aiCharacteristicsMap = new Map(
        (aiCharacteristics.characteristics || []).map((char: any) => [char.name, char.value])
      );
      
      console.log(`📋 [Task ${task.id}] Характеристики:`, {
        categoryCount: categoryCharacteristics.length,
        aiCount: aiCharacteristics.characteristics?.length || 0,
        aiMap: Array.from(aiCharacteristicsMap.entries()),
        categoryCharacteristicsType: typeof categoryCharacteristics,
        categoryCharacteristicsIsArray: Array.isArray(categoryCharacteristics),
        firstCategoryChar: categoryCharacteristics[0] ? {
          id: categoryCharacteristics[0].id,
          name: categoryCharacteristics[0].name,
          type: categoryCharacteristics[0].type
        } : 'N/A'
      });
      
      // Объединяем все характеристики категории с данными от ИИ
      const allCharacteristics = categoryCharacteristics.map((char: any) => ({
        id: char.id,
        name: char.name,
        value: aiCharacteristicsMap.get(char.name) || '' // Если есть от ИИ - берем, иначе пусто
      }));
      
      return {
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
        // Категория
        categoryId: product?.subcategoryId,
        categoryName: product?.subcategory?.name,
        // Все характеристики категории (заполненные ИИ + пустые)
        characteristics: allCharacteristics,
        // Комплектация
        packaging: product?.packaging || '',
        price: product?.price,
        discountPrice: product?.discountPrice,
        costPrice: product?.costPrice,
        stock: product?.stock,
        dimensions: product?.dimensions,
        // Статус товара для определения, опубликован ли он
        productStatus: product?.status
      };
    });

    return NextResponse.json({
      success: true,
      tasks: formattedTasks
    });
  } catch (error: any) {
    console.error('Ошибка получения задач:', error);
    return NextResponse.json({
      error: 'Ошибка получения задач',
      details: error.message
    }, { status: 500 });
  }
}

// POST - создать новую задачу
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { productName, productId, metadata } = body;

    if (!productName) {
      return NextResponse.json({
        error: 'Не указано название товара'
      }, { status: 400 });
    }

    const task = await safePrismaOperation(
      () => prisma.productCreationTask.create({
        data: {
          userId: user.id,
          productName,
          productId: productId || null,
          status: 'CREATING',
          progress: 0,
          currentStage: 'Инициализация',
          metadata: metadata || {}
        }
      }),
      'создание задачи'
    );

    if (!task) {
      return NextResponse.json({
        error: 'Ошибка создания задачи'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error: any) {
    console.error('Ошибка создания задачи:', error);
    return NextResponse.json({
      error: 'Ошибка создания задачи',
      details: error.message
    }, { status: 500 });
  }
}

// PUT - обновить задачу
export async function PUT(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, status, progress, currentStage, errorMessage, productId, metadata } = body;

    if (!taskId) {
      return NextResponse.json({
        error: 'Не указан ID задачи'
      }, { status: 400 });
    }

    // Проверяем, что задача принадлежит пользователю
    const existingTask = await safePrismaOperation(
      () => prisma.productCreationTask.findUnique({
        where: { id: taskId }
      }),
      'проверка задачи'
    );

    if (!existingTask) {
      return NextResponse.json({
        error: 'Задача не найдена'
      }, { status: 404 });
    }

    if (existingTask.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет прав для обновления этой задачи'
      }, { status: 403 });
    }

    // Обновляем задачу
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (currentStage !== undefined) updateData.currentStage = currentStage;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (productId !== undefined) updateData.productId = productId;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Если задача завершена или ошибка, устанавливаем completedAt
    if (status === 'COMPLETED' || status === 'ERROR') {
      updateData.completedAt = new Date();
    }

    const task = await safePrismaOperation(
      () => prisma.productCreationTask.update({
        where: { id: taskId },
        data: updateData
      }),
      'обновление задачи'
    );

    if (!task) {
      return NextResponse.json({
        error: 'Ошибка обновления задачи'
      }, { status: 500 });
    }

    // Инвалидируем кеш для этой задачи
    const cacheKey = `${user.id}:${taskId}`;
    taskCache.invalidate(cacheKey);

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error: any) {
    console.error('Ошибка обновления задачи:', error);
    return NextResponse.json({
      error: 'Ошибка обновления задачи',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE - удалить задачу (скрыть уведомление)
export async function DELETE(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не авторизован' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({
        error: 'Не указан ID задачи'
      }, { status: 400 });
    }

    // Проверяем, что задача принадлежит пользователю
    const existingTask = await safePrismaOperation(
      () => prisma.productCreationTask.findUnique({
        where: { id: taskId }
      }),
      'проверка задачи'
    );

    if (!existingTask) {
      return NextResponse.json({
        error: 'Задача не найдена'
      }, { status: 404 });
    }

    if (existingTask.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет прав для удаления этой задачи'
      }, { status: 403 });
    }

    // Удаляем задачу
    await safePrismaOperation(
      () => prisma.productCreationTask.delete({
        where: { id: taskId }
      }),
      'удаление задачи'
    );

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Ошибка удаления задачи:', error);
    return NextResponse.json({
      error: 'Ошибка удаления задачи',
      details: error.message
    }, { status: 500 });
  }
}
