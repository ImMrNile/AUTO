import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { safePrismaOperation } from '@/lib/prisma-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Максимум 60 секунд для Vercel

// Кеш для предотвращения лишних логов
let lastTaskCount = 0;
let lastLogTime = 0;

// Максимальное время жизни SSE соединения (4 минуты для безопасности)
const MAX_CONNECTION_TIME = 4 * 60 * 1000; // 240 секунд
const UPDATE_INTERVAL = 5000; // 5 секунд между обновлениями

export async function GET(request: NextRequest) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cabinetId = searchParams.get('cabinetId');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const connectionStart = Date.now();
      console.log(`📡 SSE: Клиент подключен (user: ${user.id}${cabinetId ? `, cabinet: ${cabinetId}` : ''})`);

      const sendUpdate = async () => {
        // Проверяем время жизни соединения
        const connectionAge = Date.now() - connectionStart;
        if (connectionAge > MAX_CONNECTION_TIME) {
          console.log(`⏱️ SSE: Соединение закрыто по таймауту (${Math.round(connectionAge / 1000)}с)`);
          clearInterval(interval);
          controller.close();
          return;
        }

        const queryStart = Date.now();
        try {
          // ОПТИМИЗАЦИЯ: Только активные задачи без JOIN
          const activeTasks = await safePrismaOperation(
            () => prisma.productCreationTask.findMany({
              where: {
                userId: user.id,
                status: {
                  in: ['CREATING', 'ANALYZING', 'PUBLISHING']
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 10, // Ограничиваем количество
              select: {
                id: true,
                productName: true,
                status: true,
                progress: true,
                currentStage: true,
                errorMessage: true,
                productId: true,
                createdAt: true
              }
            }),
            'получение активных задач для SSE'
          );

          // Завершенные задачи - МИНИМАЛЬНЫЕ данные (детали загрузятся при открытии)
          const completedTasks = await safePrismaOperation(
            () => prisma.productCreationTask.findMany({
              where: {
                userId: user.id,
                status: 'COMPLETED',
                product: {
                  status: 'DRAFT'
                }
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 5, // Ограничиваем количество
              select: {
                id: true,
                productName: true,
                status: true,
                progress: true,
                currentStage: true,
                errorMessage: true,
                productId: true,
                createdAt: true,
                // Минимальные данные товара
                product: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    generatedName: true,
                    subcategoryId: true
                  }
                }
              }
            }),
            'получение завершенных задач для SSE'
          );

          const tasks = [...activeTasks, ...completedTasks];
          const queryTime = Date.now() - queryStart;
          const now = Date.now();
          const totalTasks = tasks.length;
          
          // Логируем только если изменилось количество задач или прошло >30 секунд
          if (totalTasks !== lastTaskCount || (now - lastLogTime) > 30000) {
            console.log(`📊 SSE: Задач - активных: ${activeTasks.length}, завершенных: ${completedTasks.length} (${queryTime}ms)`);
            lastTaskCount = totalTasks;
            lastLogTime = now;
            
            if (queryTime > 1000) {
              console.log(`⚠️ SSE: Медленный запрос (${queryTime}ms)`);
            }
          }

          // Форматируем данные для фронтенда (минимальные данные)
          const formattedTasks = (tasks || []).map((task: any) => {
            const product = task.product;
            
            return {
              id: task.id,
              productName: task.productName,
              status: task.status,
              progress: task.progress,
              currentStage: task.currentStage,
              errorMessage: task.errorMessage,
              productId: task.productId,
              createdAt: task.createdAt,
              // Минимальные данные товара
              generatedName: product?.generatedName,
              categoryId: product?.subcategoryId,
              productStatus: product?.status
            };
          });

          const data = `data: ${JSON.stringify(formattedTasks)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('❌ SSE: Ошибка отправки данных', error);
          // Отправляем сообщение об ошибке клиенту
          const errorData = `data: ${JSON.stringify({ error: 'Ошибка загрузки данных' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        }
      };

      // Отправляем сразу при подключении
      await sendUpdate();

      // Отправляем обновления каждые 5 секунд (оптимизация)
      const interval = setInterval(sendUpdate, UPDATE_INTERVAL);

      // Cleanup при отключении клиента
      request.signal.addEventListener('abort', () => {
        console.log(`📡 SSE: Клиент отключен (user: ${user.id})`);
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
