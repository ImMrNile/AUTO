'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface AnalyticsContextType {
  isLoading: boolean;
  progress: number;
  error: string | null;
  startLoading: () => void;
  cancelLoading: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startLoading = useCallback(() => {
    console.log('🚀 Запуск фоновой загрузки аналитики...');
    setIsLoading(true);
    setProgress(0);
    setError(null);
    
    // Создаем новый AbortController для этой загрузки
    abortControllerRef.current = new AbortController();
  }, []);

  const cancelLoading = useCallback(() => {
    console.log('⛔ Отмена фоновой загрузки');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setProgress(0);
  }, []);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <AnalyticsContext.Provider value={{ isLoading, progress, error, startLoading, cancelLoading }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsLoading() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsLoading must be used within AnalyticsProvider');
  }
  return context;
}
