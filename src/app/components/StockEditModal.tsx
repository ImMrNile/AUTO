// src/app/components/StockEditModal.tsx - Модальное окно для редактирования остатков товара

'use client';

import { useState, useEffect } from 'react';
import { X, Save, Package, Loader2, AlertCircle, CheckCircle, Warehouse } from 'lucide-react';

interface StockEditModalProps {
  productId: string;
  productName: string;
  currentStock: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WarehouseStock {
  warehouseId: number;
  warehouseName: string;
  amount: number;
}

export default function StockEditModal({
  productId,
  productName,
  currentStock,
  isOpen,
  onClose,
  onSuccess
}: StockEditModalProps) {
  const [stock, setStock] = useState(currentStock);
  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wbStocks, setWbStocks] = useState<WarehouseStock[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStock(currentStock);
      setError(null);
      setSuccess(false);
      loadWbStocks();
    }
  }, [isOpen, currentStock]);

  const loadWbStocks = async () => {
    try {
      setLoadingWarehouses(true);
      const response = await fetch(`/api/products/${productId}/stock`);
      
      if (response.ok) {
        const data = await response.json();
        setWbStocks(data.wbStocks || null);
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков с WB:', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка обновления остатков');
      }

      setSuccess(true);
      
      // Показываем успех на 1.5 секунды, затем закрываем
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Ошибка обновления остатков:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Управление остатками</h3>
                <p className="text-sm text-white/80 mt-1">{productName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6 space-y-6">
          {/* Текущий остаток в БД */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Остаток (шт) *
            </label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium text-lg"
              placeholder="0"
              min="0"
              disabled={loading}
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущий остаток: <span className="font-semibold">{currentStock} шт</span>
            </p>
          </div>

          {/* Остатки на складах WB */}
          {loadingWarehouses && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Загрузка остатков с WB...</span>
            </div>
          )}

          {wbStocks && wbStocks.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Остатки на складах WB</h4>
              </div>
              <div className="space-y-2">
                {wbStocks.map((ws) => (
                  <div key={ws.warehouseId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{ws.warehouseName}</span>
                    <span className="font-semibold text-blue-900">{ws.amount} шт</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Сообщения */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Ошибка</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">Успешно</p>
                <p className="text-sm text-green-700 mt-1">
                  Остаток обновлен в БД и на WB
                </p>
              </div>
            </div>
          )}

          {/* Информация */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              <span className="font-semibold">💡 Подсказка:</span> После сохранения остаток будет обновлен в базе данных. 
              Если товар опубликован на Wildberries, остаток также будет обновлен на первом доступном FBS складе.
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={loading || success}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Сохранение...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Сохранено
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
