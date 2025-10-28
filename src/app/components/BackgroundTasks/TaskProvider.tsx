'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';

interface TaskContextType {
  createTask: (productName: string, productId?: string) => Promise<string | null>;
  updateTask: (taskId: string, updates: any) => Promise<void>;
  completeTask: (taskId: string, productId?: string) => Promise<void>;
  errorTask: (taskId: string, error: string) => Promise<void>;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const createTask = useCallback(async (productName: string, productId?: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productName,
          productId,
          metadata: {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.task) {
          triggerRefresh(); // Обновляем список задач
          return data.task.id;
        }
      }
      return null;
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      return null;
    }
  }, [triggerRefresh]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          ...updates
        })
      });
    } catch (error) {
      console.error('Ошибка обновления задачи:', error);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string, productId?: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          status: 'COMPLETED',
          progress: 100,
          productId,
          currentStage: 'Завершено'
        })
      });
      
      if (response.ok) {
        triggerRefresh(); // Обновляем список задач сразу после завершения
      }
    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
    }
  }, [triggerRefresh]);

  const errorTask = useCallback(async (taskId: string, error: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          status: 'ERROR',
          errorMessage: error,
          currentStage: 'Ошибка'
        })
      });
    } catch (err) {
      console.error('Ошибка установки ошибки задачи:', err);
    }
  }, []);

  return (
    <TaskContext.Provider value={{ createTask, updateTask, completeTask, errorTask, refreshTrigger, triggerRefresh }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within TaskProvider');
  }
  return context;
}
