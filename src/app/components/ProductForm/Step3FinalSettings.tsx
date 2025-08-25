'use client';

import React from 'react';
import { Ruler, Package, BarChart3, Store, CheckCircle, Settings, Hash, Link, FileText, AlertCircle } from 'lucide-react';

interface Cabinet {
  id: string;
  name: string;
  apiToken: string;
  isActive: boolean;
  description?: string;
}

interface ProductFormData {
  length: string;
  width: string;
  height: string;
  weight: string;
  vendorCode: string;
  barcode: string;
  autoGenerateVendorCode: boolean;
  cabinetId: string;
  packageContents: string;
  hasVariantSizes: boolean;
  variantSizes: string[];
  description?: string;
  referenceUrl?: string;
}

interface Step3FinalSettingsProps {
  formData: ProductFormData;
  cabinets: Cabinet[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string; // Добавляем ошибку
}

export default function Step3FinalSettings({
  formData,
  cabinets,
  onInputChange,
  error
}: Step3FinalSettingsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Финальные настройки</h2>
        <p className="text-base text-gray-300">Проверьте и настройте параметры товара</p>
      </div>

      {/* Артикул и штрихкод */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
            <Hash className="w-5 h-5 text-blue-400" />
            Артикул *
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
              Уникальный идентификатор товара
            </div>
          </label>
          <input
            type="text"
            name="vendorCode"
            value={formData.vendorCode}
            onChange={onInputChange}
            className="w-full px-4 py-3 border border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-base bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
            placeholder="Введите артикул"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Штрихкод
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
              Штрихкод товара (опционально)
            </div>
          </label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={onInputChange}
            className="w-full px-4 py-3 border border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-base bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
            placeholder="Введите штрихкод"
          />
        </div>
      </div>

      {/* Ссылка на аналогичный товар */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
          <Link className="w-5 h-5 text-blue-400" />
          Ссылка на аналогичный товар
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
            Ссылка для анализа характеристик
          </div>
        </label>
        <input
          type="url"
          name="referenceUrl"
          value={formData.referenceUrl}
          onChange={onInputChange}
          className="w-full px-4 py-3 border border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-base bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
          placeholder="https://www.wildberries.ru/..."
        />
        <p className="text-gray-400 text-xs">
          Ссылка на похожий товар для автоматического заполнения характеристик
        </p>
      </div>

      {/* Размеры */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
          <Settings className="w-5 h-5 text-blue-400" />
          Варианты размеров
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
            Настройка размерной сетки
          </div>
        </label>
        
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasVariantSizes"
            name="hasVariantSizes"
            checked={formData.hasVariantSizes}
            onChange={(e) => onInputChange({ ...e, target: { ...e.target, name: 'hasVariantSizes', value: e.target.checked } } as any)}
            className="w-4 h-4 text-blue-600 bg-black/40 border border-blue-500/30 rounded focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
          />
          <label htmlFor="hasVariantSizes" className="text-gray-300">
            Товар имеет варианты размеров
          </label>
        </div>

        {formData.hasVariantSizes && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Выберите доступные размеры:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54'].map((size) => (
                <label key={size} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.variantSizes.includes(size)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onInputChange({ ...e, target: { ...e.target, name: 'variantSizes', value: [...formData.variantSizes, size] } } as any);
                      } else {
                        onInputChange({ ...e, target: { ...e.target, name: 'variantSizes', value: formData.variantSizes.filter(s => s !== size) } } as any);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-black/40 border border-blue-500/30 rounded focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">{size}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Описание */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
          <FileText className="w-5 h-5 text-blue-400" />
          Описание товара
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
            Детальное описание товара
          </div>
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={onInputChange}
          rows={4}
          className="w-full px-4 py-3 border border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-base bg-black/40 backdrop-blur-md text-white placeholder-gray-400 resize-vertical"
          placeholder="Опишите товар, его особенности и преимущества..."
        />
      </div>

      {/* Ошибки */}
      {error && (
        <div className="px-4 py-3 bg-red-900/30 border border-red-600/50 rounded-xl">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}