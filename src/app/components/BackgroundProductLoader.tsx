'use client';

import { useEffect, useRef } from 'react';

/**
 * Компонент для фоновой загрузки товаров
 * Работает независимо от активной вкладки
 */
export default function BackgroundProductLoader() {
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('✅ BackgroundProductLoader: инициализация фоновой загрузки товаров');
    const CACHE_KEY = 'wb-products-cache';
    const CACHE_TTL = 30 * 60 * 1000; // 30 минут
    const BACKGROUND_INTERVAL = 5 * 60 * 1000; // Проверять каждые 5 минут
    
    const loadProducts = async () => {
      // Предотвращаем одновременные загрузки
      if (isLoadingRef.current) {
        console.log('⏳ Фоновая загрузка товаров уже выполняется, пропускаем...');
        return;
      }
      
      // Проверяем, не загружали ли мы недавно
      const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;
      if (timeSinceLastLoad < 60000) { // Минимум 1 минута между загрузками
        console.log('⏱️ Слишком рано для повторной загрузки, пропускаем...');
        return;
      }
      
      try {
        // Проверяем кеш
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          
          // Если кеш свежий (меньше 5 минут), не загружаем
          if (age < 5 * 60 * 1000) {
            console.log(`✅ Кеш товаров свежий (${Math.round(age / 60000)} мин), загрузка не требуется`);
            return;
          }
          
          console.log(`🔄 Кеш товаров устарел (${Math.round(age / 60000)} мин), запускаем фоновую загрузку...`);
        } else {
          console.log('📥 Кеш товаров отсутствует, запускаем фоновую загрузку...');
        }
        
        isLoadingRef.current = true;
        lastLoadTimeRef.current = Date.now();
        
        // Загружаем товары из БД
        console.log('🔄 Отправляем запрос на /api/wb/products?source=db');
        const response = await fetch('/api/wb/products?source=db', {
          signal: AbortSignal.timeout(30000) // 30 секунд таймаут
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Не удалось прочитать ответ');
          console.error(`❌ HTTP ${response.status}: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Ответ получен:', { hasProducts: !!data.products, count: data.products?.length });
        
        if (data.products && data.products.length > 0) {
          // Преобразуем и сохраняем в кеш
          const transformedProducts = data.products.map((p: any) => ({
            nmID: parseInt(p.wbNmId) || parseInt(p.id) || 0,
            vendorCode: p.vendorCode || '',
            title: p.generatedName || p.name || '',
            description: p.seoDescription || '',
            brand: p.brand || 'Не указан',
            category: p.wbData?.category || 'Не указана',
            price: p.price || 0,
            discountPrice: p.discountPrice || p.price || 0,
            discount: p.discount || 0,
            costPrice: p.costPrice || 0,
            stock: p.stock || 0,
            reserved: p.reserved || 0,
            inTransit: p.inTransit || 0,
            inReturn: p.inReturn || 0,
            analytics: {
              sales: { orders: 0, revenue: 0, avgOrderValue: 0, units: 0 },
              conversion: { views: 0, addToCart: 0, cartToOrder: 0, ctr: 0 },
              searchQueries: { topQueries: [], totalQueries: 0 }
            },
            images: p.wbData?.images || [],
            rating: 0,
            reviewsCount: 0,
            status: p.status || 'draft',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }));
          
          const cacheData = {
            data: transformedProducts,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_TTL
          };
          
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          console.log(`✅ Фоновая загрузка завершена: ${transformedProducts.length} товаров сохранено в кеш`);
        } else {
          console.log('⚠️ Товары не найдены в БД');
        }
      } catch (error: any) {
        if (error.name === 'TimeoutError') {
          console.error('⏱️ Таймаут фоновой загрузки товаров');
        } else if (error.name === 'AbortError') {
          console.log('⚠️ Фоновая загрузка товаров отменена');
        } else {
          const errorMessage = error?.message || error?.toString() || 'Неизвестная ошибка';
          console.error('❌ Ошибка фоновой загрузки товаров:', errorMessage);
        }
      } finally {
        isLoadingRef.current = false;
      }
    };
    
    // Первая загрузка через 2 секунды после монтирования
    timeoutRef.current = setTimeout(() => {
      loadProducts();
    }, 2000);
    
    // Периодическая проверка и загрузка
    intervalRef.current = setInterval(() => {
      loadProducts();
    }, BACKGROUND_INTERVAL);
    
    // Загрузка при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Вкладка стала активной, проверяем необходимость загрузки товаров...');
        loadProducts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Компонент не рендерит ничего
  return null;
}
