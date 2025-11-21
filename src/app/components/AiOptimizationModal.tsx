'use client';

import { useState, useCallback } from 'react';
import { X, Sparkles, TrendingUp, FileText, DollarSign, Calendar, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AiOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onOptimizationStarted?: (result: any) => void;
}

interface OptimizationResult {
  success: boolean;
  product: {
    id: string;
    name: string;
  };
  chats: Array<{
    id: string;
    chatType: string;
    title: string;
    status: string;
    dailyBudget: number;
    weeklyBudget: number;
  }>;
  optimization: {
    weeklyBudget: number;
    dailyBudget: number;
    startDate: string;
    endDate: string;
    optimizationType: string;
  };
  error?: string;
}

export default function AiOptimizationModal({
  isOpen,
  onClose,
  productId,
  productName,
  onOptimizationStarted
}: AiOptimizationModalProps) {
  const [weeklyBudget, setWeeklyBudget] = useState(1000);
  const [optimizationType, setOptimizationType] = useState<'both' | 'promotion' | 'content'>('both');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dailyBudget = Math.round(weeklyBudget / 7);

  const handleStartOptimization = useCallback(async () => {
    if (weeklyBudget < 100) {
      setError('Минимальный бюджет - 100₽ в неделю');
      return;
    }

    if (weeklyBudget > 50000) {
      setError('Максимальный бюджет - 50,000₽ в неделю');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weeklyBudget,
          optimizationType
        })
      });

      const result: OptimizationResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка запуска оптимизации');
      }

      console.log('✅ AI оптимизация запущена:', result);

      // Вызываем callback
      if (onOptimizationStarted) {
        onOptimizationStarted(result);
      }

      // Закрываем модальное окно
      onClose();

    } catch (err: any) {
      console.error('❌ Ошибка запуска оптимизации:', err);
      setError(err.message || 'Неизвестная ошибка');
    } finally {
      setIsStarting(false);
    }
  }, [weeklyBudget, optimizationType, productId, onOptimizationStarted, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                AI оптимизация товара
              </h2>
              <p className="text-sm text-gray-600 truncate max-w-64">
                {productName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Budget Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Бюджет на неделю
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="1000"
                min="100"
                max="50000"
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              ≈ {dailyBudget}₽ в день
            </p>
          </div>

          {/* Optimization Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Тип оптимизации
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="optimizationType"
                  value="both"
                  checked={optimizationType === 'both'}
                  onChange={(e) => setOptimizationType(e.target.value as any)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium text-gray-900">Комплексная оптимизация</div>
                    <div className="text-sm text-gray-600">Продвижение + Контент</div>
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="optimizationType"
                  value="promotion"
                  checked={optimizationType === 'promotion'}
                  onChange={(e) => setOptimizationType(e.target.value as any)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">Продвижение</div>
                    <div className="text-sm text-gray-600">Рекламные кампании, ставки, бюджет</div>
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="optimizationType"
                  value="content"
                  checked={optimizationType === 'content'}
                  onChange={(e) => setOptimizationType(e.target.value as any)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Контент</div>
                    <div className="text-sm text-gray-600">Название, описание, характеристики</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Что будет происходить?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI проанализирует текущую ситуацию товара</li>
                  <li>• Создаст индивидуальный план оптимизации</li>
                  <li>• Будет автоматически управлять в течение недели</li>
                  <li>• Отправит отчеты о результатах</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isStarting}
          >
            Отмена
          </button>
          <button
            onClick={handleStartOptimization}
            disabled={isStarting}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Запуск...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Запустить оптимизацию
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
