import { useEffect, useRef, useCallback } from 'react';
import { getOptimalPollingInterval, isPageVisible } from '@/lib/utils/deviceDetection';

interface UseOptimizedPollingOptions {
  /**
   * Базовый интервал polling в миллисекундах
   * @default 50000 (50 секунд)
   */
  baseInterval?: number;
  
  /**
   * Функция, которая будет вызываться при каждом polling
   */
  onPoll: () => void | Promise<void>;
  
  /**
   * Условие для активации polling
   * Если false, polling не будет запущен
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Останавливать ли polling когда вкладка неактивна
   * @default true
   */
  pauseWhenHidden?: boolean;
  
  /**
   * Выполнить ли polling сразу при монтировании
   * @default false
   */
  immediate?: boolean;
}

/**
 * Оптимизированный хук для polling с учетом:
 * - Типа устройства (мобильное/десктоп)
 * - Скорости соединения
 * - Видимости вкладки
 * - Активности пользователя
 */
export function useOptimizedPolling({
  baseInterval = 50000,
  onPoll,
  enabled = true,
  pauseWhenHidden = true,
  immediate = false
}: UseOptimizedPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const onPollRef = useRef(onPoll);
  
  // Обновляем ref при изменении callback
  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);
  
  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    const interval = getOptimalPollingInterval(baseInterval);
    
    console.log(`🔄 [Polling] Запуск с интервалом ${interval}ms (базовый: ${baseInterval}ms)`);
    
    intervalRef.current = setInterval(async () => {
      // Проверяем видимость страницы перед каждым запросом
      if (pauseWhenHidden && !isPageVisible()) {
        console.log('⏸️ [Polling] Пропуск - страница неактивна');
        return;
      }
      
      try {
        await onPollRef.current();
      } catch (error) {
        console.error('❌ [Polling] Ошибка:', error);
      }
    }, interval);
  }, [baseInterval, pauseWhenHidden]);
  
  const stopPolling = useCallback(() => {
    if (!isPollingRef.current) return;
    
    console.log('⏹️ [Polling] Остановка');
    isPollingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Обработчик изменения видимости страницы
  useEffect(() => {
    if (!pauseWhenHidden || !enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ [Polling] Страница скрыта - останавливаем polling');
        stopPolling();
      } else {
        console.log('👁️ [Polling] Страница видима - возобновляем polling');
        startPolling();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pauseWhenHidden, startPolling, stopPolling]);
  
  // Основной эффект для запуска/остановки polling
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }
    
    // Выполняем сразу если immediate = true
    if (immediate) {
      onPollRef.current();
    }
    
    // Запускаем polling только если страница видима
    if (!pauseWhenHidden || isPageVisible()) {
      startPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [enabled, immediate, pauseWhenHidden, startPolling, stopPolling]);
  
  return {
    startPolling,
    stopPolling,
    isPolling: isPollingRef.current
  };
}

/**
 * Упрощенная версия для быстрого использования
 */
export function useSimplePolling(
  callback: () => void | Promise<void>,
  interval: number = 50000,
  enabled: boolean = true
) {
  return useOptimizedPolling({
    baseInterval: interval,
    onPoll: callback,
    enabled,
    pauseWhenHidden: true,
    immediate: false
  });
}
