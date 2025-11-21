'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle, AlertCircle, Loader2, Package, ExternalLink, Eye } from 'lucide-react';
import { useOptimizedPolling } from '@/app/hooks/useOptimizedPolling';

export interface ProductTask {
  id: string;
  productName: string;
  status: 'CREATING' | 'ANALYZING' | 'PUBLISHING' | 'COMPLETED' | 'ERROR';
  progress: number;
  currentStage?: string;
  errorMessage?: string;
  productId?: string;
  createdAt: Date | string;
}

interface TaskNotificationsGlobalProps {
  onViewProduct?: (productId: string) => void;
  refreshTrigger?: number; // Триггер для принудительного обновления
}

export default function TaskNotificationsGlobal({ onViewProduct, refreshTrigger }: TaskNotificationsGlobalProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<ProductTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка задач из API
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.tasks)) {
          // Дедупликация: если есть несколько задач для одного productId, оставляем только последнюю
          const uniqueTasks = data.tasks.reduce((acc: ProductTask[], task: ProductTask) => {
            if (task.productId) {
              // Проверяем, есть ли уже задача с таким productId
              const existingIndex = acc.findIndex(t => t.productId === task.productId);
              if (existingIndex >= 0) {
                // Заменяем на более новую задачу
                const existing = acc[existingIndex];
                const taskDate = new Date(task.createdAt).getTime();
                const existingDate = new Date(existing.createdAt).getTime();
                if (taskDate > existingDate) {
                  acc[existingIndex] = task;
                }
              } else {
                acc.push(task);
              }
            } else {
              // Задачи без productId добавляем всегда
              acc.push(task);
            }
            return acc;
          }, []);
          
          setTasks(uniqueTasks);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Удаление задачи
  const removeTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
    } catch (error) {
      console.error('Ошибка удаления задачи:', error);
    }
  }, []);
  
  // Загрузка задач при монтировании и при изменении refreshTrigger
  useEffect(() => {
    loadTasks();
  }, [loadTasks, refreshTrigger]);
  
  // ✅ ОПТИМИЗИРОВАНО: Используем оптимизированный polling
  // Автоматически адаптируется под устройство и видимость страницы
  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'ERROR');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'ERROR');
  const hasActiveTasks = activeTasks.length > 0;
  
  useOptimizedPolling({
    baseInterval: 50000, // 50 секунд базовый интервал
    onPoll: loadTasks,
    enabled: hasActiveTasks, // Polling только если есть активные задачи
    pauseWhenHidden: true, // Останавливаем когда вкладка неактивна
    immediate: false
  });
  
  if (tasks.length === 0) return null;
  
  const getStatusIcon = (status: ProductTask['status']) => {
    switch (status) {
      case 'CREATING':
      case 'ANALYZING':
      case 'PUBLISHING':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };
  
  const getStatusText = (status: ProductTask['status'], currentStage?: string) => {
    if (currentStage) return currentStage;
    
    switch (status) {
      case 'CREATING':
        return 'Создание товара...';
      case 'ANALYZING':
        return 'Анализ ИИ...';
      case 'PUBLISHING':
        return 'Публикация на WB...';
      case 'COMPLETED':
        return 'Готово!';
      case 'ERROR':
        return 'Ошибка';
    }
  };
  
  return (
    <div className="w-full max-w-xs">
      {/* Заголовок - компактный */}
      <div 
        className="liquid-glass border-2 border-gray-300 rounded-xl p-2 cursor-pointer hover:border-purple-400 transition-all shadow-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-gray-900 text-xs">
              Создание товаров
            </span>
            {activeTasks.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                {activeTasks.length}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-bold"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      {/* Список задач */}
      {isExpanded && (
        <div className="liquid-glass border-2 border-gray-300 rounded-xl mt-2 max-h-[40vh] overflow-y-auto shadow-md">
          {isLoading && tasks.length === 0 ? (
            <div className="p-3 text-center text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
              <div className="text-xs font-medium">Загрузка...</div>
            </div>
          ) : (
            <>
              {/* Активные задачи */}
              {activeTasks.length > 0 && (
                <div className="p-3 space-y-2">
                  <div className="text-xs font-bold text-gray-700 uppercase mb-2">
                    В процессе
                  </div>
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/?tab=in-progress`)}
                      className="bg-white/80 rounded-lg p-3 border-2 border-blue-300 hover:border-blue-500 transition-all cursor-pointer shadow-md"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">
                              {task.productName}
                            </div>
                            <div className="text-xs text-gray-700 mt-0.5 font-medium">
                              {getStatusText(task.status, task.currentStage)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Прогресс бар */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300 shadow-sm"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-700 mt-1.5 text-right font-semibold">
                        {task.progress}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Завершенные задачи */}
              {completedTasks.length > 0 && (
                <div className="p-3 space-y-2 border-t-2 border-gray-300">
                  <div className="text-xs font-bold text-gray-700 uppercase mb-2">
                    Завершено
                  </div>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-lg p-3 border-2 transition-all shadow-md ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-50 border-green-400 hover:border-green-600'
                          : 'bg-red-50 border-red-400 hover:border-red-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => router.push(`/?tab=in-progress`)}
                        >
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">
                              {task.productName}
                            </div>
                            {task.status === 'COMPLETED' && (
                              <div className="text-xs text-green-700 mt-0.5 font-semibold">
                                Товар успешно создан! Нажмите для просмотра.
                              </div>
                            )}
                            {task.status === 'ERROR' && task.errorMessage && (
                              <div className="text-xs text-red-700 mt-0.5 truncate font-semibold">
                                {task.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {task.status === 'COMPLETED' && task.productId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/?tab=products&productId=${task.productId}`);
                              }}
                              className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                              title="Открыть товар в списке"
                            >
                              <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(task.id);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors group"
                            title="Удалить уведомление"
                          >
                            <X className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
