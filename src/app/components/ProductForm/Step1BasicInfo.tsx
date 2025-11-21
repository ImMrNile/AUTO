import React from 'react';
import { 
  Package, 
  Tag, 
  DollarSign, 
  Percent, 
  Truck, 
  ShoppingCart,
  RefreshCw,
  Info,
  AlertCircle,
  Star,
  BarChart,
  Settings,
  Upload,
  Image
} from 'lucide-react';

// AI будет определять категорию автоматически по фото
// import CategorySelector from './CategorySelector'; // Убрано - заменено на AI агента

// Типы данных
interface Cabinet {
  id: string;
  name: string;
  apiToken: string;
  isActive: boolean;
  description?: string;
}

interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

interface ProductFormData {
  name: string;
  originalPrice: string;
  discountPrice: string;
  costPrice?: string;
  packageContents: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  referenceUrl: string;
  cabinetId: string;
  vendorCode: string;
  autoGenerateVendorCode: boolean;
  barcode: string;
  hasVariantSizes: boolean;
  variantSizes: string[];
  description?: string;
  mainImage: File | null;
  imageComments: string;
}

interface Step1BasicInfoProps {
  formData: ProductFormData;
  selectedCategory: WBSubcategory | null;
  cabinets: Cabinet[];
  selectedImage: File | null;
  imagePreview: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onCategorySelect: (category: WBSubcategory | null) => void;
  onVariantSizeChange: (size: string, checked: boolean) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getSizeOptionsForCategory: () => string[];
  discountPercent?: number;
  generateVendorCode: () => string;
  isLoadingCabinets: boolean;
  isCategoryDetecting?: boolean;
  categoryDetectionError?: string;
}

export default function Step1BasicInfo({
  formData,
  selectedCategory,
  cabinets,
  selectedImage,
  imagePreview,
  onInputChange,
  onCategorySelect,
  onVariantSizeChange,
  onImageChange,
  getSizeOptionsForCategory,
  discountPercent,
  generateVendorCode,
  isLoadingCabinets,
  isCategoryDetecting = false,
  categoryDetectionError = ''
}: Step1BasicInfoProps) {
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Основная информация</h2>
        <p className="text-base text-gray-300">Заполните данные о товаре</p>
      </div>

      {/* Название товара */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          Название товара *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          maxLength={60}
          className="glass-input w-full text-base"
          placeholder="Введите название товара"
        />
        <p className="text-gray-400 text-xs px-2">
          {formData.name.length}/60 символов
        </p>
      </div>

      {/* Загрузка основного изображения */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          Основное изображение товара *
        </label>
        
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <input
            type="file"
            onChange={onImageChange}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            id="main-image-step1"
          />
          <label htmlFor="main-image-step1" className="cursor-pointer">
            {imagePreview ? (
              <div className="space-y-3">
                <img 
                  src={imagePreview} 
                  alt="Превью товара" 
                  className="max-w-xs mx-auto rounded-lg shadow-lg"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.png';
                  }}
                />
                <div className="flex items-center justify-center gap-2">
                  <Image className="w-4 h-4 text-green-400" />
                  <p className="text-green-400 font-medium">Изображение загружено</p>
                </div>
                <p className="text-gray-400 text-sm">Нажмите для замены</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-300 font-medium">Загрузите фото товара</p>
                  <p className="text-gray-500 text-sm">JPEG, PNG, WebP до 5MB</p>
                </div>
                <div className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg inline-block">
                  <p className="text-blue-400 text-sm">🤖 AI определит категорию по фото</p>
                </div>
              </div>
            )}
          </label>
        </div>
        
        <p className="text-gray-400 text-xs px-2">
          Загрузите качественное фото товара - ИИ автоматически определит категорию
        </p>
      </div>

      {/* AI определение категории */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-400" />
          Категория товара
        </label>
        <div className="glass-container p-4 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="flex-1">
              {isCategoryDetecting ? (
                <div>
                  <p className="text-yellow-400 font-medium">🔍 AI анализирует изображение...</p>
                  <p className="text-yellow-300 text-sm">Определяем наиболее подходящую категорию</p>
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                </div>
              ) : categoryDetectionError ? (
                <div>
                  <p className="text-red-400 font-medium">❌ Ошибка определения категории</p>
                  <p className="text-red-300 text-sm">{categoryDetectionError}</p>
                  {categoryDetectionError.includes('недоступен') ? (
                    <p className="text-yellow-400 text-xs mt-1">Можете продолжить без автоопределения категории</p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">Попробуйте загрузить другое изображение</p>
                  )}
                </div>
              ) : selectedCategory ? (
                <div>
                  <p className="text-white font-medium">{selectedCategory.displayName}</p>
                  <p className="text-green-400 text-sm">✓ Категория определена автоматически по фото</p>
                  <p className="text-gray-400 text-xs">ID: {selectedCategory.id} • Комиссия: {selectedCategory.commissions?.fbw || 'N/A'}%</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-300 font-medium">Категория будет определена автоматически</p>
                  <p className="text-blue-400 text-sm">🤖 AI определит категорию по фото на следующем шаге</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-gray-400 text-xs px-2">
          ИИ-агент автоматически определит наиболее подходящую категорию на основе анализа изображений товара
        </p>
      </div>

      {/* Цены */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Оригинальная цена *
          </label>
          <input
            type="number"
            name="originalPrice"
            value={formData.originalPrice}
            onChange={onInputChange}
            min="0"
            step="0.01"
            className="glass-input w-full text-base"
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-green-400" />
            Цена со скидкой *
            {discountPercent && (
              <span className="text-green-400 text-sm">
                (-{discountPercent}%)
              </span>
            )}
          </label>
          <input
            type="number"
            name="discountPrice"
            value={formData.discountPrice}
            onChange={onInputChange}
            min="0"
            step="0.01"
            className="glass-input w-full text-base"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-yellow-400" />
            Себестоимость
          </label>
          <input
            type="number"
            name="costPrice"
            value={formData.costPrice || ''}
            onChange={onInputChange}
            min="0"
            step="0.01"
            className="glass-input w-full text-base"
            placeholder="0.00"
          />
          <p className="text-gray-400 text-xs px-2">
            Внутренняя стоимость товара
          </p>
        </div>
      </div>

      {/* Комплектация */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          Комплектация *
        </label>
        <input
          type="text"
          name="packageContents"
          value={formData.packageContents}
          onChange={onInputChange}
          className="glass-input w-full text-base"
          placeholder="Товар - 1 шт., упаковка - 1 шт."
        />
        <p className="text-gray-400 text-xs px-2">
          Точное описание того, что получит покупатель
        </p>
      </div>

      {/* Габариты */}
      <div className="space-y-4">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Габариты и вес *
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Длина (см)</label>
            <input
              type="number"
              name="length"
              value={formData.length}
              onChange={onInputChange}
              min="1"
              className="glass-input w-full"
              placeholder="30"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Ширина (см)</label>
            <input
              type="number"
              name="width"
              value={formData.width}
              onChange={onInputChange}
              min="1"
              className="glass-input w-full"
              placeholder="20"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Высота (см)</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={onInputChange}
              min="1"
              className="glass-input w-full"
              placeholder="10"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Вес (кг)</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={onInputChange}
              min="0.001"
              step="0.001"
              className="glass-input w-full"
              placeholder="0.5"
            />
          </div>
        </div>
        
        <p className="text-gray-400 text-xs px-2">
          Измерьте товар в упаковке. Точные размеры важны для расчета доставки.
        </p>
      </div>

      {/* Кабинет */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-400" />
          Магазин на Wildberries *
        </label>
        
        {isLoadingCabinets ? (
          <div className="glass-input w-full flex items-center justify-center py-4">
            <div className="loading-spinner w-5 h-5 mr-2"></div>
            <span className="text-gray-400">Загрузка кабинетов...</span>
          </div>
        ) : cabinets.length === 0 ? (
          <div className="glass-container p-4 border border-orange-500/50 bg-orange-500/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-orange-400 font-medium">Нет доступных кабинетов</p>
                <p className="text-gray-400 text-sm">
                  Сначала добавьте кабинет Wildberries в разделе "Кабинеты"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <select
            name="cabinetId"
            value={formData.cabinetId}
            onChange={onInputChange}
            className="glass-input w-full text-base"
          >
            <option value="">Выберите кабинет</option>
            {cabinets.filter(cabinet => cabinet.isActive).map(cabinet => (
              <option key={cabinet.id} value={cabinet.id}>
                {cabinet.name} {cabinet.description && `(${cabinet.description})`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Артикул и штрихкод */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-lg font-semibold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              Артикул *
            </label>
            <button
              type="button"
              onClick={generateVendorCode}
              className="glass-button text-xs"
            >
              <RefreshCw className="w-3 h-3" />
              Сгенерировать
            </button>
          </div>
          <input
            type="text"
            name="vendorCode"
            value={formData.vendorCode}
            onChange={onInputChange}
            maxLength={13}
            className="glass-input w-full text-base font-mono"
            placeholder="PRD123ABC"
          />
          <p className="text-gray-400 text-xs px-2">
            Уникальный код товара (8-13 символов)
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="block text-lg font-semibold text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-400" />
            Штрихкод *
          </label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={onInputChange}
            maxLength={13}
            className="glass-input w-full text-base font-mono"
            placeholder="2200000000000"
          />
          <p className="text-gray-400 text-xs px-2">
            EAN-13 штрихкод (13 цифр)
          </p>
        </div>
      </div>

      {/* Размерная сетка */}
      {selectedCategory && getSizeOptionsForCategory().length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="hasVariantSizes"
              checked={formData.hasVariantSizes}
              onChange={onInputChange}
              className="glass-checkbox"
            />
            <label className="text-lg font-semibold text-white">
              Товар имеет размеры
            </label>
          </div>
          
          {formData.hasVariantSizes && (
            <div className="glass-container p-4 space-y-3">
              <p className="text-gray-300 text-sm">Выберите доступные размеры:</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {getSizeOptionsForCategory().map(size => (
                  <label key={size} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.variantSizes.includes(size)}
                      onChange={(e) => onVariantSizeChange(size, e.target.checked)}
                      className="glass-checkbox"
                    />
                    <span className="text-white">{size}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Дополнительная информация */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Дополнительное описание
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={onInputChange}
          rows={3}
          className="glass-input w-full text-base resize-none"
          placeholder="Дополнительная информация о товаре (необязательно)"
        />
      </div>

      {/* Референс URL */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-400" />
          Ссылка на референс
        </label>
        <input
          type="url"
          name="referenceUrl"
          value={formData.referenceUrl}
          onChange={onInputChange}
          className="glass-input w-full text-base"
          placeholder="https://example.com/similar-product"
        />
        <p className="text-gray-400 text-xs px-2">
          Ссылка на похожий товар для лучшего понимания ИИ (необязательно)
        </p>
      </div>
    </div>
  );
}