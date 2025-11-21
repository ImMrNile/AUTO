'use client';

import { useEffect, useRef } from 'react';
import { clientLogger } from '@/lib/logger';

/**
 * 🔄 ФОНОВЫЙ WORKER ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
 * 
 * Что делает:
 * 1. Обновляет аналитику каждые 90 минут
 * 2. Обновляет цены товаров (защита от автоснижения WB)
 * 3. Работает в фоне, даже когда вкладка неактивна
 * 4. Автоматически восстанавливается после ошибок
 */
export default function BackgroundSyncWorker() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<{ analytics: number; prices: number }>({
    analytics: 0,
    prices: 0
  });

  useEffect(() => {
    clientLogger.log('🔄 [BackgroundSync] Запуск фонового обновления...');

    // ✅ ФУНКЦИЯ 1: Обновление аналитики (через Inngest фоновую задачу)
    const syncAnalytics = async () => {
      const now = Date.now();
      const lastSync = lastSyncRef.current.analytics;
      const timeSinceLastSync = now - lastSync;
      const SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 часов (было 90 минут)

      // Проверяем, прошло ли 6 часов с последней синхронизации
      if (lastSync > 0 && timeSinceLastSync < SYNC_INTERVAL) {
        return;
      }

      try {
        clientLogger.log('📊 [BackgroundSync] Запуск фоновой синхронизации аналитики через Inngest...');
        
        // Используем фоновую синхронизацию через Inngest
        const response = await fetch('/api/analytics/sync-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 10 })
        });

        if (response.ok) {
          const data = await response.json();
          lastSyncRef.current.analytics = now;
          clientLogger.log('✅ [BackgroundSync] Фоновая синхронизация запущена:', data.taskId);
          clientLogger.log('ℹ️ Синхронизация будет работать в фоне 3-4 часа');
        } else if (response.status === 400) {
          // Игнорируем ошибку 400 (нет кабинетов) - это нормально для новых пользователей
          clientLogger.log('ℹ️ [BackgroundSync] Пропускаем синхронизацию - нет активных кабинетов');
        }
      } catch (error) {
        clientLogger.error('❌ [BackgroundSync] Ошибка запуска фоновой синхронизации:', error);
      }
    };

    // ✅ ФУНКЦИЯ 2: Обновление цен товаров (защита от автоснижения WB)
    const syncPrices = async () => {
      const now = Date.now();
      const lastSync = lastSyncRef.current.prices;
      const timeSinceLastSync = now - lastSync;
      const SYNC_INTERVAL = 90 * 60 * 1000; // 90 минут

      // Проверяем, прошло ли 90 минут с последней синхронизации
      if (lastSync > 0 && timeSinceLastSync < SYNC_INTERVAL) {
        return;
      }

      try {
        clientLogger.log('💰 [BackgroundSync] Начинаем обновление цен товаров...');
        
        // Получаем все товары пользователя
        const productsResponse = await fetch('/api/wb/products?source=db&limit=1000');
        if (!productsResponse.ok) {
          throw new Error('Не удалось загрузить товары');
        }

        const productsData = await productsResponse.json();
        const products = productsData.products || [];

        let updatedCount = 0;
        let errorCount = 0;

        // Обновляем цены для каждого товара
        for (const product of products) {
          // Пропускаем товары без цены или неопубликованные
          if (!product.price || product.status !== 'PUBLISHED') {
            continue;
          }

          // Валидация цен перед отправкой
          const originalPrice = Number(product.price);
          const discountPrice = Number(product.discountPrice || product.price);
          
          if (!originalPrice || originalPrice <= 0 || !discountPrice || discountPrice <= 0) {
            clientLogger.log(`⚠️ Пропускаем товар ${product.id} - некорректные цены`);
            continue;
          }

          try {
            // Отправляем запрос на обновление цены (защита от автоснижения)
            const updateResponse = await fetch(`/api/products/${product.id}/update-price`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originalPrice,
                discountPrice
              })
            });

            if (updateResponse.ok) {
              updatedCount++;
            } else {
              const errorData = await updateResponse.json().catch(() => ({}));
              clientLogger.log(`⚠️ Ошибка обновления цены товара ${product.id}:`, errorData.error);
              errorCount++;
            }

            // Задержка между запросами (чтобы не перегрузить WB API)
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 секунды
          } catch (error) {
            errorCount++;
          }
        }

        lastSyncRef.current.prices = now;
        clientLogger.log('✅ [BackgroundSync] Цены обновлены:', updatedCount);
      } catch (error) {
        clientLogger.error('❌ [BackgroundSync] Ошибка синхронизации цен:', error);
      }
    };

    // ✅ ФУНКЦИЯ 3: Общая синхронизация (аналитика + цены)
    const runFullSync = async () => {
      clientLogger.log('🔄 [BackgroundSync] Запуск полной синхронизации...');
      
      // Сначала обновляем аналитику
      await syncAnalytics();
      
      // Затем обновляем цены (с задержкой 5 секунд)
      await new Promise(resolve => setTimeout(resolve, 5000));
      await syncPrices();
      
      clientLogger.log('✅ [BackgroundSync] Полная синхронизация завершена');
    };

    // ❌ ОТКЛЮЧЕНО: Автоматическая синхронизация аналитики (используйте фоновую через Inngest)
    // Причина: WB API имеет очень строгие rate limits, автоматическая синхронизация вызывает 429 ошибки
    // Используйте POST /api/analytics/sync-background для фоновой синхронизации
    
    // const initialTimeout = setTimeout(() => {
    //   runFullSync();
    // }, 5 * 60 * 1000); // 5 минут

    // syncIntervalRef.current = setInterval(() => {
    //   runFullSync();
    // }, 6 * 60 * 60 * 1000); // 6 часов
    
    clientLogger.log('ℹ️ [BackgroundSync] Автоматическая синхронизация аналитики ОТКЛЮЧЕНА');
    clientLogger.log('💡 Используйте ручную синхронизацию или фоновую через Inngest');

    // ❌ ОТКЛЮЧЕНО: Синхронизация при возврате на вкладку (вызывала множественные синхронизации)
    // const handleVisibilityChange = () => {
    //   if (!document.hidden) {
    //     const now = Date.now();
    //     const analyticsNeedsSync = now - lastSyncRef.current.analytics > 6 * 60 * 60 * 1000;
    //     const pricesNeedSync = now - lastSyncRef.current.prices > 90 * 60 * 1000;
    //     if (analyticsNeedsSync || pricesNeedSync) {
    //       runFullSync();
    //     }
    //   }
    // };
    // document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ CLEANUP: Очистка при размонтировании
    return () => {
      // Очистка отключена, так как автоматическая синхронизация отключена
      clientLogger.log('🧹 [BackgroundSync] Cleanup - автоматическая синхронизация была отключена');
    };
  }, []);

  // Компонент невидимый, работает только в фоне
  return null;
}
