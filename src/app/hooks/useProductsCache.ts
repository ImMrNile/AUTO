// src/app/hooks/useProductsCache.ts - Хук для фонового кеширования товаров

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

interface UseProductsCacheResult<T> {
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
 * Хук для управления кешированием товаров с фоновой загрузкой
 * 
 * Особенности:
 * - Сохраняет товары в localStorage с TTL
 * - Показывает кешированные товары мгновенно
 * - Обновляет товары в фоне без блокировки UI
 * - Данные доступны даже после перезагрузки страницы
 */
export function useProductsCache<T>(
  fetchFn: (signal?: AbortSignal, forceSync?: boolean) => Promise<T>,
  config: CacheConfig
): UseProductsCacheResult<T> {
  console.log('🔧 useProductsCache вызван с config:', config);
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  
  // Обновляем ref при изменении функции
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);
  
  console.log('📦 Текущее состояние товаров:', { loading, backgroundLoading, hasData: !!data, error });

  // Загрузка данных из localStorage
  const loadFromCache = useCallback((): CachedData<T> | null => {
    try {
      const cached = localStorage.getItem(config.key);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      
      // Проверяем, не истек ли срок действия кеша
      if (Date.now() > parsed.expiresAt) {
        console.log(`🗑️ Кеш товаров для ${config.key} истек, удаляем...`);
        localStorage.removeItem(config.key);
        return null;
      }

      const ageMinutes = Math.round((Date.now() - parsed.timestamp) / 60000);
      console.log(`📂 Загружены товары из кеша (возраст: ${ageMinutes} мин)`);
      return parsed;
    } catch (err) {
      console.error('❌ Ошибка загрузки товаров из кеша:', err);
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
      console.log(`💾 Товары сохранены в кеш (TTL: ${config.ttl / 60000} мин)`);
    } catch (err) {
      console.error('❌ Ошибка сохранения товаров в кеш:', err);
    }
  }, [config.key, config.ttl]);

  // Очистка кеша
  const clearCache = useCallback(() => {
    localStorage.removeItem(config.key);
    console.log(`🗑️ Кеш товаров для ${config.key} очищен`);
  }, [config.key]);

  // Загрузка данных с сервера
  const fetchData = useCallback(async (isBackground = false, forceSync = false) => {
    try {
      // Отменяем предыдущий запрос если он есть
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      if (isBackground) {
        setBackgroundLoading(true);
        console.log('🔄 Фоновое обновление товаров...', forceSync ? '(с WB)' : '');
      } else {
        setLoading(true);
        console.log('📦 Загрузка товаров...', forceSync ? '(с WB)' : '');
      }
      
      setError(null);

      const result = await fetchFnRef.current(abortControllerRef.current.signal, forceSync);
      
      setData(result);
      setLastUpdate(new Date());
      setIsFromCache(false);
      saveToCache(result);
      
      console.log('✅ Товары успешно загружены и сохранены в кеш');
    } catch (err: any) {
      // Игнорируем ошибки отмены запроса
      if (err.name === 'AbortError') {
        console.log('⚠️ Запрос товаров отменен');
        return;
      }
      
      console.error('❌ Ошибка загрузки товаров:', err);
      setError(err.message || 'Ошибка загрузки товаров');
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
      abortControllerRef.current = null;
    }
  }, [saveToCache]);

  // Принудительное обновление
  const refresh = useCallback(async (force = false) => {
    if (force) {
      clearCache();
    }
    // При force=true загружаем с WB (forceSync=true)
    await fetchData(!!data, force); // Если есть данные, обновляем в фоне
  }, [data, clearCache, fetchData]);

  // Инициализация при монтировании
  useEffect(() => {
    if (!isInitialMount.current) {
      console.log('⚠️ useProductsCache: повторный вызов useEffect, пропускаем (компонент уже инициализирован)');
      return;
    }
    isInitialMount.current = false;

    console.log('🔄 useProductsCache: инициализация компонента...');

    // Пытаемся загрузить из кеша
    const cached = loadFromCache();
    
    if (cached) {
      // Показываем кешированные данные сразу
      const ageMinutes = Math.round((Date.now() - cached.timestamp) / 60000);
      console.log(`✅ useProductsCache: найдены кешированные товары (возраст: ${ageMinutes} мин)`);
      setData(cached.data);
      setLastUpdate(new Date(cached.timestamp));
      setIsFromCache(true);
      setLoading(false);
      
      // Если включено фоновое обновление, запускаем его
      if (config.backgroundRefresh) {
        console.log('🔄 useProductsCache: запуск фонового обновления товаров...');
        fetchData(true); // Фоновая загрузка
      }
    } else {
      // Нет кеша, загружаем данные
      console.log('📥 useProductsCache: кеш товаров не найден, загружаем данные...');
      fetchData(false);
    }

    // Cleanup при размонтировании
    return () => {
      console.log('🧹 useProductsCache: размонтирование компонента, отмена запросов...');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей - выполняется только при монтировании

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
