import React from 'react';
import { Upload, X, Plus, Trash2, Image, FileText, Camera, AlertCircle, Info } from 'lucide-react';

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
  mainImage: File | null;
  additionalImages: File[];
  imageComments: string;
}

interface Step2ImagesInfoProps {
  formData: ProductFormData;
  imagePreview: string;
  additionalImagePreviews: string[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdditionalImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAdditionalImage: (index: number) => void;
  onClearAllAdditionalImages: () => void;
}

export default function Step2ImagesInfo({
  formData,
  imagePreview,
  additionalImagePreviews,
  onInputChange,
  onImageChange,
  onAdditionalImagesChange,
  onRemoveAdditionalImage,
  onClearAllAdditionalImages
}: Step2ImagesInfoProps) {

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Изображения товара</h2>
        <p className="text-base text-gray-300">Загрузите изображения для анализа ИИ</p>
      </div>

      {/* Главное изображение */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
          <Image className="w-5 h-5 text-blue-400" />
          Главное изображение *
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
            Основное фото товара для карточки
          </div>
        </label>
        
        {imagePreview ? (
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Главное изображение"
              className="w-full max-w-lg h-64 object-cover rounded-xl border border-blue-500/30 shadow-lg"
            />
            <button
              type="button"
              onClick={() => onImageChange({ target: { files: null } } as any)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl transform hover:scale-110 backdrop-blur-sm border border-red-500/50 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg h-64 border-2 border-dashed border-blue-500/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-300 bg-black/40 backdrop-blur-md">
            <Camera className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-lg text-gray-300 font-medium mb-2">Загрузите главное фото</p>
            <p className="text-gray-400 text-center text-sm">Перетащите изображение сюда или нажмите для выбора</p>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Дополнительные изображения */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
            <Image className="w-5 h-5 text-blue-400" />
            Дополнительные изображения
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
              Дополнительные фото для детального просмотра
            </div>
          </label>
          
          {additionalImagePreviews.length > 0 && (
            <button
              type="button"
              onClick={onClearAllAdditionalImages}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-medium flex items-center gap-2 backdrop-blur-sm border border-red-500/50 group cursor-help text-sm"
              title="Удалить все дополнительные изображения"
            >
              <Trash2 className="w-4 h-4" />
              Очистить все
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
                Удаляет все загруженные дополнительные изображения
              </div>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {additionalImagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Дополнительное изображение ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-blue-500/30 shadow-md"
              />
              <button
                type="button"
                onClick={() => onRemoveAdditionalImage(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl transform hover:scale-110 backdrop-blur-sm border border-red-500/50 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {additionalImagePreviews.length < 9 && (
            <div className="w-full h-32 border-2 border-dashed border-blue-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-300 bg-black/40 backdrop-blur-md">
              <Plus className="w-6 h-6 text-gray-400 mb-2" />
              <p className="text-xs text-gray-300 text-center">Добавить фото</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onAdditionalImagesChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
        
        {additionalImagePreviews.length === 9 && (
          <div className="px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg">
            <p className="text-blue-400 text-xs text-center">
              Достигнут лимит дополнительных изображений (9)
            </p>
          </div>
        )}
      </div>

      {/* Комментарии к изображениям */}
      <div className="space-y-3">
        <label className="block text-lg font-semibold text-white flex items-center gap-2 group cursor-help">
          <FileText className="w-5 h-5 text-blue-400" />
          Комментарии к изображениям
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bg-black/90 text-white text-sm px-3 py-2 rounded-lg -mt-16 ml-2 whitespace-nowrap z-10">
            Опишите особенности изображений для лучшего анализа ИИ
          </div>
        </label>
        <textarea
          name="imageComments"
          value={formData.imageComments}
          onChange={onInputChange}
          rows={3}
          className="w-full px-4 py-3 border border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 resize-none text-base bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
          placeholder="Опишите особенности изображений, которые помогут ИИ лучше проанализировать товар..."
        />
        <p className="text-gray-400 text-xs px-2">
          Например: "Товар показан с разных ракурсов", "Особое внимание к деталям", "Показан в упаковке"
        </p>
      </div>

      {/* Рекомендации по изображениям */}
      <div className="px-4 py-3 bg-black/40 border border-blue-500/20 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Рекомендации по изображениям</h3>
        </div>
        <ul className="text-gray-300 space-y-1 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            Главное изображение должно быть качественным и показывать товар в лучшем виде
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            Дополнительные фото помогут ИИ лучше понять характеристики товара
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            Поддерживаются форматы: JPG, PNG, WEBP
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            Рекомендуемое разрешение: минимум 800x800 пикселей
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            Максимум 9 дополнительных изображений
          </li>
        </ul>
      </div>
    </div>
  );
}