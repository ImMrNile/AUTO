// lib/utils/sqliteJsonUtils.ts - УТИЛИТЫ ДЛЯ JSON В SQLITE

/**
 * Утилиты для работы с JSON полями в SQLite
 * Поскольку SQLite не поддерживает нативный JSON тип,
 * используем строки с автоматической сериализацией/десериализацией
 */

// Интерфейсы для агентных метрик
export interface AgentMetrics {
  workflowId: string;
  processingMethod: 'legacy' | 'hybrid' | 'agents';
  
  // Общие метрики
  totalStages: number;
  completedStages: number;
  executionTimeMs: number;
  tokensUsed: number;
  apiCalls: number;
  qualityScore: number;
  confidence: number;
  
  // Специфичные метрики
  characteristicsFilled: number;
  characteristicsTotal: number;
  fillPercentage: number;
  competitorDataUsed: boolean;
  additionalSearchPerformed: boolean;
  
  // Этапы выполнения
  stageTimings: Record<string, number>;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  
  // Timestamp
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowStageData {
  currentStage: string;
  completedStages: string[];
  stageResults: Record<string, any>;
  progress: {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    currentAction: string;
  };
  performance: {
    totalDuration: number;
    agentTimings: Record<string, number>;
    apiCallCount: number;
    tokensUsed: number;
  };
}

/**
 * Сериализация объекта в JSON строку для SQLite
 */
export function serializeJson<T>(data: T): string {
  try {
    return JSON.stringify(data, jsonReplacer);
  } catch (error) {
    console.error('Ошибка сериализации JSON:', error);
    return '{}';
  }
}

/**
 * Десериализация JSON строки из SQLite
 */
export function deserializeJson<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString || jsonString.trim() === '') {
    return fallback;
  }
  
  try {
    return JSON.parse(jsonString, jsonReviver) as T;
  } catch (error) {
    console.error('Ошибка десериализации JSON:', error, 'Строка:', jsonString);
    return fallback;
  }
}

/**
 * JSON replacer для обработки Date объектов и Map
 */
function jsonReplacer(key: string, value: any): any {
  if (value instanceof Date) {
    return {
      __type: 'Date',
      value: value.toISOString()
    };
  }
  
  if (value instanceof Map) {
    return {
      __type: 'Map',
      value: Array.from(value.entries())
    };
  }
  
  if (value instanceof Set) {
    return {
      __type: 'Set',
      value: Array.from(value)
    };
  }
  
  return value;
}

/**
 * JSON reviver для восстановления Date объектов и Map
 */
function jsonReviver(key: string, value: any): any {
  if (value && typeof value === 'object' && value.__type) {
    switch (value.__type) {
      case 'Date':
        return new Date(value.value);
      case 'Map':
        return new Map(value.value);
      case 'Set':
        return new Set(value.value);
    }
  }
  
  return value;
}

/**
 * Создание агентных метрик
 */
export function createAgentMetrics(
  workflowId: string,
  processingMethod: 'legacy' | 'hybrid' | 'agents',
  result: any
): AgentMetrics {
  const now = new Date().toISOString();
  
  return {
    workflowId,
    processingMethod,
    
    // Общие метрики
    totalStages: result.agentStats?.totalStages || 0,
    completedStages: result.agentStats?.completedStages || 0,
    executionTimeMs: result.agentStats?.executionTimeMs || 0,
    tokensUsed: result.agentStats?.tokensUsed || 0,
    apiCalls: result.agentStats?.apiCalls || 0,
    qualityScore: result.agentStats?.qualityScore || result.qualityScore || 0,
    confidence: result.confidence || 0,
    
    // Специфичные метрики
    characteristicsFilled: result.agentStats?.characteristicsFilled || result.characteristics?.length || 0,
    characteristicsTotal: result.agentStats?.characteristicsTotal || 0,
    fillPercentage: result.agentStats?.fillPercentage || 0,
    competitorDataUsed: result.agentStats?.competitorDataUsed || false,
    additionalSearchPerformed: result.agentStats?.additionalSearchPerformed || false,
    
    // Детали выполнения
    stageTimings: result.agentStats?.stageTimings || {},
    errors: result.errors || [],
    warnings: result.warnings || [],
    recommendations: result.recommendations || [],
    
    // Timestamps
    createdAt: now,
    completedAt: result.agentStats?.completedAt || now
  };
}

/**
 * Обновление агентных метрик
 */
export function updateAgentMetrics(
  existingMetrics: AgentMetrics,
  updates: Partial<AgentMetrics>
): AgentMetrics {
  return {
    ...existingMetrics,
    ...updates,
    // Объединяем массивы
    errors: [...(existingMetrics.errors || []), ...(updates.errors || [])],
    warnings: [...(existingMetrics.warnings || []), ...(updates.warnings || [])],
    recommendations: [...(existingMetrics.recommendations || []), ...(updates.recommendations || [])],
    
    // Объединяем объекты
    stageTimings: {
      ...existingMetrics.stageTimings,
      ...updates.stageTimings
    }
  };
}

/**
 * Валидация агентных метрик
 */
export function validateAgentMetrics(metrics: any): metrics is AgentMetrics {
  return (
    typeof metrics === 'object' &&
    typeof metrics.workflowId === 'string' &&
    typeof metrics.processingMethod === 'string' &&
    ['legacy', 'hybrid', 'agents'].includes(metrics.processingMethod) &&
    typeof metrics.totalStages === 'number' &&
    typeof metrics.completedStages === 'number'
  );
}

/**
 * Создание данных этапа workflow
 */
export function createWorkflowStageData(
  currentStage: string,
  completedStages: string[] = [],
  stageResults: Record<string, any> = {},
  progress: any = {}
): WorkflowStageData {
  return {
    currentStage,
    completedStages,
    stageResults,
    progress: {
      currentStep: progress.currentStep || 0,
      totalSteps: progress.totalSteps || 0,
      percentage: progress.percentage || 0,
      currentAction: progress.currentAction || ''
    },
    performance: {
      totalDuration: 0,
      agentTimings: {},
      apiCallCount: 0,
      tokensUsed: 0
    }
  };
}

/**
 * Помощники для работы с Product полями
 */
export class ProductJsonHelper {
  /**
   * Сохранение агентных метрик в Product
   */
  static setAgentMetrics(metrics: AgentMetrics): string {
    return serializeJson(metrics);
  }

  /**
   * Получение агентных метрик из Product
   */
  static getAgentMetrics(product: any): AgentMetrics | null {
    if (!product.agentMetrics) return null;
    
    const metrics = deserializeJson(product.agentMetrics, null);
    
    if (validateAgentMetrics(metrics)) {
      return metrics;
    }
    
    return null;
  }

  /**
   * Сохранение данных этапа workflow
   */
  static setWorkflowData(stageData: WorkflowStageData): string {
    return serializeJson(stageData);
  }

  /**
   * Получение данных этапа workflow
   */
  static getWorkflowData(jsonString: string | null): WorkflowStageData | null {
    const fallback = createWorkflowStageData('unknown');
    return deserializeJson(jsonString, fallback);
  }

  /**
   * Обновление существующих agentMetrics
   */
  static updateAgentMetrics(
    existingJsonString: string | null,
    updates: Partial<AgentMetrics>
  ): string {
    const existing = this.getAgentMetrics({ agentMetrics: existingJsonString });
    
    if (!existing) {
      // Создаем новые метрики если их нет
      const newMetrics = createAgentMetrics(
        updates.workflowId || 'unknown',
        updates.processingMethod || 'legacy',
        updates
      );
      return this.setAgentMetrics(newMetrics);
    }
    
    const updated = updateAgentMetrics(existing, updates);
    return this.setAgentMetrics(updated);
  }

  /**
   * Проверка, использовались ли агенты для обработки
   */
  static wasProcessedByAgents(product: any): boolean {
    const metrics = this.getAgentMetrics(product);
    return metrics?.processingMethod === 'agents' || metrics?.processingMethod === 'hybrid';
  }

  /**
   * Получение краткой статистики для UI
   */
  static getProcessingSummary(product: any): {
    method: string;
    quality: number;
    duration: number;
    characteristics: number;
    hasErrors: boolean;
    hasWarnings: boolean;
  } {
    const metrics = this.getAgentMetrics(product);
    
    if (!metrics) {
      return {
        method: 'unknown',
        quality: 0,
        duration: 0,
        characteristics: 0,
        hasErrors: false,
        hasWarnings: false
      };
    }
    
    return {
      method: metrics.processingMethod,
      quality: metrics.qualityScore,
      duration: metrics.executionTimeMs,
      characteristics: metrics.characteristicsFilled,
      hasErrors: metrics.errors.length > 0,
      hasWarnings: metrics.warnings.length > 0
    };
  }
}

// Экспорт для использования в других модулях
export default {
  serializeJson,
  deserializeJson,
  createAgentMetrics,
  updateAgentMetrics,
  validateAgentMetrics,
  createWorkflowStageData,
  ProductJsonHelper
};