'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Edit2 } from 'lucide-react';

interface ProductEditModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
}

export default function ProductEditModal({ product, isOpen, onClose, onSave }: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    vendorCode: '',
    brand: '',
    price: 0,
    discountPrice: 0,
    discount: 0,
    costPrice: 0,
    seoDescription: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.title || '',
        vendorCode: product.vendorCode || '',
        brand: product.brand || '',
        price: product.price || 0,
        discountPrice: product.discountPrice || 0,
        discount: product.discount || 0,
        costPrice: product.costPrice || 0,
        seoDescription: product.description || ''
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении товара');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="liquid-glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Edit2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Редактирование товара</h2>
                <p className="text-sm text-gray-400 mt-1">nmID: {product?.nmID}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={saving}
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
              Основная информация
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название товара
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Артикул
                </label>
                <input
                  type="text"
                  value={formData.vendorCode}
                  onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Бренд
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Цены */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
              Цены и скидки
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Базовая цена (₽)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    const discount = formData.discount;
                    const discountPrice = discount > 0 ? price * (1 - discount / 100) : price;
                    setFormData({ 
                      ...formData, 
                      price,
                      discountPrice: Math.round(discountPrice)
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Скидка (%)
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => {
                    const discount = parseFloat(e.target.value) || 0;
                    const discountPrice = formData.price * (1 - discount / 100);
                    setFormData({ 
                      ...formData, 
                      discount,
                      discountPrice: Math.round(discountPrice)
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Цена со скидкой (₽)
                </label>
                <input
                  type="number"
                  value={formData.discountPrice}
                  onChange={(e) => {
                    const discountPrice = parseFloat(e.target.value) || 0;
                    const discount = formData.price > 0 
                      ? Math.round(((formData.price - discountPrice) / formData.price) * 100)
                      : 0;
                    setFormData({ 
                      ...formData, 
                      discountPrice,
                      discount
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Себестоимость (₽)
                  <span className="ml-2 text-xs text-gray-500">можно редактировать</span>
                </label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-purple-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            {/* Расчет маржи */}
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Маржа:</span>
                <span className="text-lg font-bold text-green-400">
                  {(formData.discountPrice - formData.costPrice).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-300">Рентабельность:</span>
                <span className="text-lg font-bold text-blue-400">
                  {formData.costPrice > 0 
                    ? Math.round(((formData.discountPrice - formData.costPrice) / formData.costPrice) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
