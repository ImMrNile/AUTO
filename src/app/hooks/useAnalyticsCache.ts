// src/app/hooks/useAnalyticsCache.ts - Хук для фонового кеширования данных аналитики

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheConfig {
  key: string;
  ttl: number; // Time to live в миллисекундах
  backgroundRefresh?: boolean; // Обновлять ли данные в фоне
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseAnalyticsCacheResult<T> {
  data: T | null;
  loading: boolean;
  backgroundLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isFromCache: boolean;
  refresh: (force?: boolean) => Promise<void>;
  clearCache: () => void;
}

/**
 * Хук для управления кешированием данных с фоновой загрузкой
 * 
 * Особенности:
 * - Сохраняет данные в localStorage с TTL
 * - Показывает кешированные данные мгновенно
 * - Обновляет данные в фоне без блокировки UI
 * - Данные доступны даже после перезагрузки страницы
 */
export function useAnalyticsCache<T>(
  fetchFn: (signal?: AbortSignal) => Promise<T>,
  config: CacheConfig
): UseAnalyticsCacheResult<T> {
  console.log('🔧 useAnalyticsCache вызван с config:', config);
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  const isBackgroundFetchRef = useRef(false); // Флаг для отслеживания фоновой загрузки
  
  // Обновляем ref при изменении функции
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);
  
  console.log('📊 Текущее состояние:', { loading, backgroundLoading, hasData: !!data, error });

  // Загрузка данных из localStorage
  const loadFromCache = useCallback((): CachedData<T> | null => {
    try {
      const cached = localStorage.getItem(config.key);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      
      // Проверяем, не истек ли срок действия кеша
      if (Date.now() > parsed.expiresAt) {
        console.log(`🗑️ Кеш для ${config.key} истек, удаляем...`);
        localStorage.removeItem(config.key);
        return null;
      }

      const ageMinutes = Math.round((Date.now() - parsed.timestamp) / 60000);
      console.log(`📂 Загружены данные из кеша (возраст: ${ageMinutes} мин)`);
      return parsed;
    } catch (err) {
      console.error('❌ Ошибка загрузки из кеша:', err);
      return null;
    }
  }, [config.key]);

  // Сохранение данных в localStorage
  const saveToCache = useCallback((newData: T) => {
    try {
      const cached: CachedData<T> = {
        data: newData,
        timestamp: Date.now(),
        expiresAt: Date.now() + config.ttl
      };
      localStorage.setItem(config.key, JSON.stringify(cached));
      console.log(`💾 Данные сохранены в кеш (TTL: ${config.ttl / 60000} мин)`);
    } catch (err) {
      console.error('❌ Ошибка сохранения в кеш:', err);
    }
  }, [config.key, config.ttl]);

  // Очистка кеша
  const clearCache = useCallback(() => {
    localStorage.removeItem(config.key);
    console.log(`🗑️ Кеш для ${config.key} очищен`);
  }, [config.key]);

  // Загрузка данных с сервера
  const fetchData = useCallback(async (isBackground = false) => {
    try {
      // Отменяем предыдущий запрос если он есть (только если это не фоновая загрузка)
      if (abortControllerRef.current && !isBackgroundFetchRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      isBackgroundFetchRef.current = isBackground; // Сохраняем флаг фоновой загрузки
      
      if (isBackground) {
        setBackgroundLoading(true);
        console.log('🔄 Фоновое обновление данных (не будет отменено при размонтировании)...');
      } else {
        setLoading(true);
        console.log('📊 Загрузка данных...');
      }
      
      setError(null);

      const result = await fetchFnRef.current(abortControllerRef.current.signal);
      
      setData(result);
      setLastUpdate(new Date());
      setIsFromCache(false);
      saveToCache(result);
      
      console.log('✅ Данные успешно загружены и сохранены в кеш');
    } catch (err: any) {
      // Игнорируем ошибки отмены запроса
      if (err.name === 'AbortError') {
        console.log('⚠️ Запрос отменен');
        return;
      }
      
      console.error('❌ Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
      isBackgroundFetchRef.current = false;
      abortControllerRef.current = null;
    }
  }, [saveToCache]);

  // Принудительное обновление
  const refresh = useCallback(async (force = false) => {
    console.log(`🔄 refresh вызван с force=${force}`);
    if (force) {
      console.log('🗑️ Очищаем кеш перед обновлением...');
      clearCache();
      // При принудительном обновлении загружаем данные с индикатором загрузки
      await fetchData(false); // false = не фоновая загрузка, показываем индикатор
    } else {
      // Обычное обновление - в фоне если есть данные
      await fetchData(!!data);
    }
  }, [data, clearCache, fetchData]);

  // Инициализация при монтировании
  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    console.log('🔄 Инициализация useAnalyticsCache...');

    // Пытаемся загрузить из кеша
    const cached = loadFromCache();
    
    if (cached) {
      // Показываем кешированные данные сразу
      console.log('✅ Найдены кешированные данные');
      setData(cached.data);
      setLastUpdate(new Date(cached.timestamp));
      setIsFromCache(true);
      setLoading(false);
      
      // Если включено фоновое обновление, запускаем его
      if (config.backgroundRefresh) {
        console.log('🔄 Запуск фонового обновления данных...');
        fetchData(true); // Фоновая загрузка
      }
    } else {
      // Нет кеша, загружаем данные
      console.log('📥 Кеш не найден, загружаем данные...');
      fetchData(false);
    }

    // Cleanup при размонтировании
    return () => {
      // НЕ отменяем фоновые запросы при размонтировании
      if (abortControllerRef.current && !isBackgroundFetchRef.current) {
        console.log('🧹 Cleanup: отменяем обычный запрос');
        abortControllerRef.current.abort();
      } else if (isBackgroundFetchRef.current) {
        console.log('🔄 Cleanup: фоновый запрос продолжается...');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполняется только при монтировании

  // Отслеживание изменения ключа кеша (например, при смене периода)
  const prevKeyRef = useRef(config.key);
  useEffect(() => {
    // Пропускаем первый рендер
    if (prevKeyRef.current === config.key) {
      return;
    }
    
    console.log(`🔄 Ключ кеша изменился: ${prevKeyRef.current} → ${config.key}`);
    prevKeyRef.current = config.key;
    
    // Отменяем текущий запрос (только если это не фоновая загрузка)
    if (abortControllerRef.current && !isBackgroundFetchRef.current) {
      console.log('🧹 Отменяем предыдущий запрос из-за смены ключа');
      abortControllerRef.current.abort();
    } else if (isBackgroundFetchRef.current) {
      console.log('🔄 Фоновый запрос продолжается несмотря на смену ключа...');
    }
    
    // Пытаемся загрузить из нового кеша
    const cached = loadFromCache();
    
    if (cached) {
      console.log('✅ Найдены кешированные данные для нового ключа');
      setData(cached.data);
      setLastUpdate(new Date(cached.timestamp));
      setIsFromCache(true);
      setLoading(false);
      
      if (config.backgroundRefresh) {
        fetchData(true);
      }
    } else {
      console.log('📥 Кеш не найден для нового ключа, загружаем данные...');
      setLoading(true);
      fetchData(false);
    }
  }, [config.key, config.backgroundRefresh, loadFromCache, fetchData]);

  return {
    data,
    loading,
    backgroundLoading,
    error,
    lastUpdate,
    isFromCache,
    refresh,
    clearCache
  };
}
