/**
 * Утилиты для определения типа устройства и оптимизации производительности
 */

/**
 * Проверяет, является ли устройство мобильным
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Проверяет, является ли устройство планшетом
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent);
}

/**
 * Проверяет, является ли соединение медленным
 */
export function isSlowConnection(): boolean {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return false;
  }
  
  const connection = (navigator as any).connection;
  if (!connection) return false;
  
  // Считаем медленным если:
  // - saveData включен
  // - effectiveType = 'slow-2g' или '2g'
  // - downlink < 1 Mbps
  return (
    connection.saveData ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    (connection.downlink && connection.downlink < 1)
  );
}

/**
 * Проверяет, активна ли вкладка браузера
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
}

/**
 * Получает оптимальный интервал polling в зависимости от устройства
 */
export function getOptimalPollingInterval(baseInterval: number = 50000): number {
  const mobile = isMobileDevice();
  const slow = isSlowConnection();
  const visible = isPageVisible();
  
  // Базовые множители
  let multiplier = 1;
  
  // Увеличиваем интервал для мобильных
  if (mobile) multiplier *= 2;
  
  // Увеличиваем для медленного соединения
  if (slow) multiplier *= 2;
  
  // Увеличиваем для неактивной вкладки
  if (!visible) multiplier *= 4;
  
  return Math.min(baseInterval * multiplier, 300000); // Максимум 5 минут
}

/**
 * Проверяет, нужно ли отключить фоновые обновления
 */
export function shouldDisableBackgroundRefresh(): boolean {
  return isMobileDevice() || isSlowConnection();
}

/**
 * Получает оптимальное время кеширования
 */
export function getOptimalCacheTime(baseTime: number = 5 * 60 * 1000): number {
  const mobile = isMobileDevice();
  const slow = isSlowConnection();
  
  // На мобильных и медленных соединениях кешируем дольше
  if (mobile || slow) {
    return baseTime * 2; // В 2 раза дольше
  }
  
  return baseTime;
}

/**
 * Хук для отслеживания видимости страницы
 */
export function usePageVisibility(callback: (isVisible: boolean) => void) {
  if (typeof window === 'undefined') return;
  
  const handleVisibilityChange = () => {
    callback(!document.hidden);
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Определяет, нужно ли использовать виртуализацию для списка
 */
export function shouldUseVirtualization(itemCount: number): boolean {
  const mobile = isMobileDevice();
  
  // На мобильных виртуализируем списки > 20 элементов
  // На десктопе > 50 элементов
  return mobile ? itemCount > 20 : itemCount > 50;
}

/**
 * Получает информацию об устройстве для логирования
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      type: 'server',
      mobile: false,
      tablet: false,
      slowConnection: false
    };
  }
  
  return {
    type: isMobileDevice() ? 'mobile' : isTablet() ? 'tablet' : 'desktop',
    mobile: isMobileDevice(),
    tablet: isTablet(),
    slowConnection: isSlowConnection(),
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection || null
  };
}
