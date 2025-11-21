'use client';

import { useEffect } from 'react';

/**
 * Компонент для инициализации фоновых задач при загрузке приложения
 * Вызывает API роут /api/init который запускает BackgroundTaskProcessor
 */
export default function BackgroundTaskInitializer() {
  useEffect(() => {
    // Вызываем API роут для инициализации фоновых задач
    fetch('/api/init')
      .then(res => res.json())
      .then(data => {
        console.log('✅ [Client] Background tasks initialized:', data);
      })
      .catch(error => {
        console.error('❌ [Client] Failed to initialize background tasks:', error);
      });
  }, []);

  return null; // Этот компонент ничего не рендерит
}
