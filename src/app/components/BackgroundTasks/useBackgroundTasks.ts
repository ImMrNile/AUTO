'use client';

import { useState, useCallback } from 'react';
import { ProductTask } from './TaskNotifications';

export function useBackgroundTasks() {
  const [tasks, setTasks] = useState<ProductTask[]>([]);
  
  const addTask = useCallback((productName: string, productId?: string) => {
    const newTask: ProductTask = {
      id: Math.random().toString(36).substr(2, 9),
      productName,
      status: 'creating',
      progress: 0,
      productId,
      createdAt: new Date()
    };
    
    setTasks(prev => [...prev, newTask]);
    return newTask.id;
  }, []);
  
  const updateTask = useCallback((taskId: string, updates: Partial<ProductTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);
  
  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);
  
  const completeTask = useCallback((taskId: string, productId?: string) => {
    updateTask(taskId, {
      status: 'completed',
      progress: 100,
      productId
    });
  }, [updateTask]);
  
  const errorTask = useCallback((taskId: string, error: string) => {
    updateTask(taskId, {
      status: 'error',
      error
    });
  }, [updateTask]);
  
  return {
    tasks,
    addTask,
    updateTask,
    removeTask,
    completeTask,
    errorTask
  };
}
