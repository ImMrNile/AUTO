'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckCircle, AlertCircle, Loader2, Package, ExternalLink, Eye } from 'lucide-react';

export interface ProductTask {
  id: string;
  productName: string;
  status: 'creating' | 'analyzing' | 'publishing' | 'completed' | 'error';
  progress: number;
  error?: string;
  productId?: string;
  createdAt: Date;
}

interface TaskNotificationsProps {
  tasks: ProductTask[];
  onRemoveTask: (taskId: string) => void;
  onViewProduct: (productId: string) => void;
}

export default function TaskNotifications({ tasks, onRemoveTask, onViewProduct }: TaskNotificationsProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (tasks.length === 0) return null;
  
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'error');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error');
  
  const getStatusIcon = (status: ProductTask['status']) => {
    switch (status) {
      case 'creating':
      case 'analyzing':
      case 'publishing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };
  
  const getStatusText = (status: ProductTask['status']) => {
    switch (status) {
      case 'creating':
        return 'Создание товара...';
      case 'analyzing':
        return 'Анализ ИИ...';
      case 'publishing':
        return 'Публикация на WB...';
      case 'completed':
        return 'Готово!';
      case 'error':
        return 'Ошибка';
    }
  };
  
  return (
    <div className="w-full">
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
          {/* Активные задачи */}
          {activeTasks.length > 0 && (
            <div className="p-2 space-y-2">
              <div className="text-[10px] font-bold text-gray-700 uppercase mb-1">
                В процессе
              </div>
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => router.push(`/?tab=in-progress`)}
                  className="bg-white/80 rounded-lg p-2 border-2 border-blue-300 hover:border-blue-500 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-gray-900 truncate">
                        {task.productName}
                      </div>
                    </div>
                  </div>
                  
                  {/* Прогресс бар как на изображении */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-700 mt-0.5 text-right font-semibold">
                    {task.progress}%
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Завершенные задачи */}
          {completedTasks.length > 0 && (
            <div className="p-2 space-y-2 border-t-2 border-gray-300">
              <div className="text-[10px] font-bold text-gray-700 uppercase mb-1">
                Завершено
              </div>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-lg p-2 border-2 transition-all shadow-sm ${
                    task.status === 'completed'
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
                        <div className="text-[11px] font-bold text-gray-900 truncate">
                          {task.productName}
                        </div>
                        {task.status === 'completed' && (
                          <div className="text-[10px] text-green-700 mt-0.5 font-semibold">
                            Товар успешно создан!
                          </div>
                        )}
                        {task.status === 'error' && task.error && (
                          <div className="text-[10px] text-red-700 mt-0.5 truncate font-semibold">
                            {task.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 ml-1">
                      {task.status === 'completed' && task.productId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProduct(task.productId!);
                          }}
                          className="p-1 hover:bg-blue-100 rounded-lg transition-colors group"
                          title="Открыть товар"
                        >
                          <Eye className="w-3 h-3 text-blue-600 group-hover:text-blue-700" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTask(task.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors group"
                        title="Удалить уведомление"
                      >
                        <X className="w-3 h-3 text-gray-600 group-hover:text-gray-900" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
