// src/app/api/products/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Edit3, 
  Package, 
  Settings,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader,
  Info,
  Eye,
  Sparkles
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  generatedName: string;
  seoDescription: string;
  status: string;
  price: number;
  originalImage: string;
  category: {
    id: number;
    name: string;
    parentName: string;
    displayName: string;
  };
  characteristics: Array<{
    id: number;
    name: string;
    value: any;
    confidence: number;
    reasoning: string;
    type: 'string' | 'number';
    isRequired: boolean;
    possibleValues?: string[];
    maxLength?: number;
  }>;
  wbData: {
    userVendorCode: string;
    barcode: string;
    originalPrice: number;
    discountPrice?: number;
    finalPrice: number;
  };
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCharacteristics, setEditingCharacteristics] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setProduct(data.product);
      } else {
        setError(data.error || 'Ошибка загрузки товара');
      }
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const updateCharacteristic = async (characteristicId: number, newValue: any) => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/products/${productId}/characteristics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characteristicId,
          value: newValue
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Обновляем локальное состояние
        setProduct(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            characteristics: prev.characteristics.map(char => 
              char.id === characteristicId 
                ? { ...char, value: newValue, confidence: 1.0 }
                : char
            )
          };
        });
        
        setEditingCharacteristics(prev => ({ ...prev, [characteristicId]: false }));
        setSuccess('Характеристика обновлена');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка обновления');
      }
    } catch (error) {
      console.error('Ошибка обновления характеристики:', error);
      setError('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      setError('');
      
      const response = await fetch(`/api/products/${productId}/publish`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('✅ Товар успешно опубликован на Wildberries!');
        // Обновляем статус товара
        setProduct(prev => prev ? { ...prev, status: 'PUBLISHED' } : prev);
      } else {
        setError('❌ Ошибка публикации: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка публикации:', error);
      setError('❌ Ошибка соединения при публикации товара');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Загрузка товара...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Товар не найден</h1>
          <p className="text-gray-600 mb-4">Товар с указанным ID не существует</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Редактирование товара</h1>
            <p className="text-gray-600">ID: {productId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Статус товара */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            product.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
            product.status === 'READY' ? 'bg-blue-100 text-blue-800' :
            product.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {product.status === 'PUBLISHED' ? '✅ Опубликовано' :
             product.status === 'READY' ? '📋 Готов к публикации' :
             product.status === 'PROCESSING' ? '⏳ Обрабатывается' :
             '❌ Ошибка'}
          </div>
          
          {/* Кнопка публикации */}
          {product.status === 'READY' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Публикуем...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Опубликовать на WB
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка - Основная информация */}
        <div className="lg:col-span-1 space-y-6">
          {/* Изображение товара */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Изображение товара</h3>
            {product.originalImage ? (
              <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={product.originalImage} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Основная информация */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Оригинальное название
                </label>
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  {product.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SEO название (ИИ)
                </label>
                <div className="p-3 bg-blue-50 rounded border text-sm">
                  {product.generatedName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Категория
                </label>
                <div className="p-3 bg-gray-50 rounded border text-sm">
                  {product.category.displayName}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цены
                </label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Цена без скидки:</span>
                    <span className="font-medium">{product.wbData.originalPrice}₽</span>
                  </div>
                  {product.wbData.discountPrice && (
                    <div className="flex justify-between text-sm">
                      <span>Цена со скидкой:</span>
                      <span className="font-medium text-green-600">{product.wbData.discountPrice}₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium">Финальная цена:</span>
                    <span className="font-bold text-blue-600">{product.wbData.finalPrice}₽</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Артикул / Штрихкод
                </label>
                <div className="space-y-1">
                  <div className="p-2 bg-gray-50 rounded border text-xs font-mono">
                    {product.wbData.userVendorCode}
                  </div>
                  <div className="p-2 bg-gray-50 rounded border text-xs font-mono">
                    {product.wbData.barcode}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Характеристики */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Характеристики товара ({product.characteristics.length})
              </h3>
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                Можно редактировать
              </span>
            </div>

            {product.characteristics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Характеристики не найдены</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {product.characteristics.map((characteristic) => (
                  <div key={characteristic.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{characteristic.name}</span>
                        {characteristic.isRequired && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            *
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {characteristic.type === 'number' ? 'Число' : 'Текст'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setEditingCharacteristics(prev => ({
                          ...prev,
                          [characteristic.id]: !prev[characteristic.id]
                        }))}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        <Edit3 className="w-3 h-3" />
                        {editingCharacteristics[characteristic.id] ? 'Отмена' : 'Изменить'}
                      </button>
                    </div>

                    {editingCharacteristics[characteristic.id] ? (
                      <div className="space-y-3">
                        {characteristic.possibleValues && characteristic.possibleValues.length > 0 ? (
                          <select
                            value={characteristic.value}
                            onChange={(e) => updateCharacteristic(characteristic.id, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                          >
                            <option value="">Выберите значение</option>
                            {characteristic.possibleValues.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                        ) : characteristic.type === 'number' ? (
                          <input
                            type="number"
                            value={characteristic.value}
                            onChange={(e) => updateCharacteristic(characteristic.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                          />
                        ) : (
                          <input
                            type="text"
                            value={characteristic.value}
                            onChange={(e) => updateCharacteristic(characteristic.id, e.target.value)}
                            maxLength={characteristic.maxLength}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            disabled={saving}
                          />
                        )}
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateCharacteristic(characteristic.id, characteristic.value)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800 font-medium">
                          {characteristic.value}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>ИИ: {Math.round(characteristic.confidence * 100)}%</span>
                          <Info className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEO описание */}
      {product.seoDescription && (
        <div className="mt-6 bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            SEO описание (ИИ)
          </h3>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-gray-700 leading-relaxed">{product.seoDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}