// app/components/PublishModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { Cabinet } from '../../../lib/types/cabinet';
import { useAuth } from './AuthProvider';
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface Product {
  id: string;
  originalName: string;
  generatedName?: string;
  originalImage: string;
  price: number;
  suggestedCategory?: string;
  colorAnalysis?: string;
  seoDescription?: string;
}

interface PublishResult {
  cabinetId: string;
  cabinetName: string;
  success: boolean;
  wbCardId?: string;
  error?: string;
}

interface PublishModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublishModal({ product, onClose, onSuccess }: PublishModalProps) {
  const { user, loading: authLoading } = useAuth();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinets, setSelectedCabinets] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadCabinets();
    }
  }, [authLoading, user]);

  const loadCabinets = async () => {
    if (authLoading || !user) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/cabinets');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCabinets(data.cabinets.filter((c: Cabinet) => c.isActive));
    } catch (error) {
      console.error('Ошибка загрузки кабинетов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCabinetToggle = (cabinetId: string) => {
    setSelectedCabinets(prev => 
      prev.includes(cabinetId)
        ? prev.filter(id => id !== cabinetId)
        : [...prev, cabinetId]
    );
  };

  const handlePublish = async () => {
    if (selectedCabinets.length === 0) {
      alert('Выберите хотя бы один кабинет');
      return;
    }

    setIsPublishing(true);
    setPublishResults([]);

    try {
      const response = await fetch(`/api/products/${product.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cabinetIds: selectedCabinets
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка публикации');
      }

      setPublishResults(data.results);
      setIsComplete(true);

    } catch (error) {
      console.error('Ошибка публикации:', error);
      alert(error instanceof Error ? error.message : 'Ошибка публикации');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (isComplete) {
      onSuccess();
    } else {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            <span className="ml-2">Загрузка...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isComplete ? 'Результаты публикации' : 'Публикация товара'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Информация о товаре */}
          <div className="flex items-start space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <img
              src={product.originalImage}
              alt={product.originalName}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {product.generatedName || product.originalName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Цена: {product.price.toLocaleString('ru-RU')} ₽
              </p>
              {product.suggestedCategory && (
                <p className="text-sm text-gray-600">
                  Категория: {product.suggestedCategory}
                </p>
              )}
            </div>
          </div>

          {!isComplete ? (
            <>
              {/* Выбор кабинетов */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Выберите кабинеты для публикации:</h3>
                
                {cabinets.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Нет активных кабинетов. Добавьте кабинеты в разделе "Кабинеты WB".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cabinets.map((cabinet) => (
                      <label
                        key={cabinet.id}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCabinets.includes(cabinet.id)}
                          onChange={() => handleCabinetToggle(cabinet.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={isPublishing}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {cabinet.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Предупреждение */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Внимание
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      После публикации карточка будет создана в выбранных кабинетах Wildberries. 
                      Убедитесь, что все данные корректны.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Результаты публикации */
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Результаты публикации:</h3>
              
              {publishResults.map((result) => (
                <div
                  key={result.cabinetId}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="ml-3 font-medium">
                      {result.cabinetName}
                    </span>
                  </div>
                  
                  {result.success ? (
                    <p className="mt-2 text-sm text-green-700">
                      Товар успешно опубликован
                      {result.wbCardId && (
                        <span className="ml-2 font-mono text-xs">
                          (ID: {result.wbCardId})
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-red-700">
                      Ошибка: {result.error}
                    </p>
                  )}
                </div>
              ))}

              {/* Сводка */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Сводка:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    Успешно: {publishResults.filter(r => r.success).length} из {publishResults.length}
                  </li>
                  <li>
                    Ошибок: {publishResults.filter(r => !r.success).length}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          {!isComplete ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isPublishing}
              >
                Отмена
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || selectedCabinets.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Публикация...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Опубликовать
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}