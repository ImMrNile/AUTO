'use client';

import { useState, useEffect } from 'react';

/**
 * Кнопка для принудительного сброса зависших фоновых задач
 * Появляется только когда есть задачи старше 10 минут в статусе "в работе"
 */
export default function TaskResetButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stuckTasks, setStuckTasks] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Проверяем наличие зависших задач при монтировании и периодически
  useEffect(() => {
    const checkStuckTasks = async () => {
      try {
        const response = await fetch('/api/tasks/status');
        const data = await response.json();
        
        if (data.status === 'success' && data.stuckTasks && data.stuckTasks.length > 0) {
          setStuckTasks(data.stuckTasks);
          setIsVisible(true);
        } else {
          setStuckTasks([]);
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Ошибка проверки зависших задач:', error);
        setIsVisible(false);
      }
    };

    // Проверяем сразу
    checkStuckTasks();

    // Проверяем каждые 30 секунд
    const interval = setInterval(checkStuckTasks, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleResetTasks = async () => {
    if (!confirm('Вы уверены, что хотите сбросить все зависшие задачи? Это прервет их выполнение.')) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/tasks/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ ${data.message}`);
        setStuckTasks([]);
        setIsVisible(false);
        // Перезагружаем страницу через 2 секунды
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult(`❌ Ошибка: ${data.message}`);
      }
    } catch (error) {
      setResult(`❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Если нет зависших задач, не показываем кнопку
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-pulse">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-900 mb-1">
              Обнаружены зависшие задачи
            </h3>
            <p className="text-xs text-red-700 mb-3">
              Найдено {stuckTasks.length} задач, которые не обновлялись более 10 минут
            </p>
            {stuckTasks.length > 0 && (
              <div className="mb-3 space-y-1">
                {stuckTasks.slice(0, 3).map((task, index) => (
                  <div key={task.id} className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">
                    {task.productName} ({task.ageMinutes} мин)
                  </div>
                ))}
                {stuckTasks.length > 3 && (
                  <div className="text-xs text-red-600 italic">
                    ...и еще {stuckTasks.length - 3} задач
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleResetTasks}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm rounded-md transition-colors w-full justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Сброс...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Сбросить все задачи
                </>
              )}
            </button>
            {result && (
              <div className="mt-2 text-xs text-red-600 whitespace-nowrap">
                {result}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
