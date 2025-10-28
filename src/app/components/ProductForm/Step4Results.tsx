// src/components/ProductForm/Step4Results.tsx - ПОЛНЫЙ КОД

import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Sparkles, 
  Zap, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Wrench,
  Lock,
  FileText,
  Palette,
  Save,
  X,
  Upload,
  Eye,
  ExternalLink,
  AlertTriangle,
  Lightbulb,
  Plus,
  Trash2,
  Settings,
  Database,
  Globe
} from 'lucide-react';

interface AICharacteristic {
  id: number;
  name: string;
  value: any;
  confidence: number;
  reasoning: string;
  type: 'string' | 'number';
  isRequired?: boolean;
  isFilled?: boolean;
  category?: 'ai_filled' | 'manual_required' | 'user_protected' | 'declaration';
  possibleValues?: Array<{
    id: number;
    value: string;
    displayName?: string;
  }>;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  description?: string;
  source?: string;
  isEditable?: boolean;
}

interface Step4ResultsProps {
  createdProductId: string | null;
  aiResponse: any;
  aiCharacteristics: AICharacteristic[];
  allCategoryCharacteristics: any[];
  isLoadingCharacteristics: boolean;
  editingCharacteristics: {[key: number]: boolean};
  onUpdateProductField: (field: string, value: string) => void;
  onUpdateCharacteristic: (characteristicId: number, newValue: any) => void;
  onDeleteCharacteristic: (characteristicId: number) => void;
  onAddNewCharacteristic: (characteristicId: number, value: any) => void;
  onToggleEditCharacteristic: (characteristicId: number) => void;
  onPublish: () => void;
  onSaveOnly: () => void;
  onCreateInfographic: () => void;
  onClearForm: () => void;
  onLoadProductCharacteristics: (productId: string) => void;
  onCharacteristicUpdate?: (characteristicId: number, newValue: string) => void;
  hasPendingData?: boolean;
  isPublished?: boolean;
  isPublishing?: boolean;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  };
}

// Компонент для отображения характеристики
const CharacteristicItem = ({ 
  characteristic, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}: {
  characteristic: AICharacteristic;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}) => {
  const [editValue, setEditValue] = useState(String(characteristic.value || ''));

  const getCategoryIcon = () => {
    if (characteristic.category === 'user_protected') {
      return <Lock className="w-4 h-4 text-blue-600" />;
    } else if (characteristic.isFilled) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = () => {
    if (characteristic.category === 'user_protected') {
      return 'border-blue-400 bg-blue-50';
    } else if (characteristic.isFilled) {
      return 'border-green-400 bg-green-50';
    } else {
      return 'border-gray-300 bg-gray-50';
    }
  };

  const getCategoryLabel = () => {
    if (characteristic.category === 'user_protected') {
      return 'Системная';
    } else if (characteristic.isFilled) {
      return 'Заполнено ИИ';
    } else {
      return 'Не заполнено';
    }
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${getCategoryColor()} hover:border-purple-400 transition-all shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getCategoryIcon()}
            <span className="font-semibold text-gray-900 text-sm">{characteristic.name}</span>
            
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
              characteristic.category === 'user_protected'
                ? 'bg-blue-200 text-blue-800'
                : characteristic.isFilled 
                ? 'bg-green-200 text-green-800' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {getCategoryLabel()}
            </span>
            
            {characteristic.isRequired && (
              <span className="px-1.5 py-0.5 bg-red-200 text-red-800 text-xs rounded-md font-semibold">
                Обязательная
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              {characteristic.possibleValues && characteristic.possibleValues.length > 0 ? (
                <select
                  value={editValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setEditValue(newValue);
                    setTimeout(() => {
                      if (newValue !== String(characteristic.value || '')) {
                        onSave(newValue);
                      }
                      onCancel();
                    }, 500); // Добавляем задержку перед автосохранением и закрытием режима редактирования
                  }}
                  autoFocus
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-medium"
                >
                  <option value="">Выберите значение</option>
                  {characteristic.possibleValues.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.displayName || option.value}
                    </option>
                  ))}
                </select>
              ) : characteristic.type === 'number' ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSave(editValue);
                      setTimeout(() => onCancel(), 500); // Добавляем задержку перед закрытием режима редактирования
                    } else if (e.key === 'Escape') {
                      onCancel();
                    }
                  }}
                  onBlur={() => {
                    if (editValue !== String(characteristic.value || '')) {
                      onSave(editValue);
                    }
                    setTimeout(() => onCancel(), 500); // Добавляем задержку перед закрытием режима редактирования
                  }}
                  min={characteristic.minValue}
                  max={characteristic.maxValue}
                  placeholder="Введите число"
                  autoFocus
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-medium"
                />
              ) : (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSave(editValue);
                      setTimeout(() => onCancel(), 500); // Добавляем задержку перед закрытием режима редактирования
                    } else if (e.key === 'Escape') {
                      onCancel();
                    }
                  }}
                  onBlur={() => {
                    if (editValue !== String(characteristic.value || '')) {
                      onSave(editValue);
                    }
                    setTimeout(() => onCancel(), 500); // Добавляем задержку перед закрытием режима редактирования
                  }}
                  maxLength={characteristic.maxLength}
                  placeholder="Введите значение"
                  autoFocus
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-medium"
                />
              )}
              
              {characteristic.description && (
                <p className="text-xs text-gray-600 font-medium">{characteristic.description}</p>
              )}
              
              <p className="text-xs text-blue-700 mt-1 font-medium">
                💡 Нажмите Enter или уберите фокус для сохранения
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div 
                className="text-gray-900 text-sm min-h-[20px] cursor-pointer hover:bg-purple-50 p-2 rounded-lg transition-colors border border-transparent hover:border-purple-300"
                onClick={onEdit}
                title="Нажмите для редактирования"
              >
                {characteristic.value !== null && characteristic.value !== undefined && characteristic.value !== '' ? (
                  <span className={`font-semibold ${
                    characteristic.category === 'user_protected' ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {characteristic.value}
                  </span>
                ) : (
                  <span className="text-gray-500 italic font-medium">
                    Нажмите для заполнения
                  </span>
                )}
              </div>
              
              {characteristic.isFilled && characteristic.confidence > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-700 font-semibold">
                    Уверенность ИИ: {Math.round(characteristic.confidence * 100)}%
                  </div>
                  {characteristic.confidence < 0.7 && (
                    <div className="text-xs text-yellow-700 flex items-center gap-1 font-semibold">
                      <Lightbulb className="w-3 h-3" />
                      Рекомендуется проверить
                    </div>
                  )}
                </div>
              )}
              
              {characteristic.reasoning && characteristic.reasoning !== 'ai_analysis' && (
                <div className="text-xs text-gray-700 bg-gray-100 rounded-lg p-2 font-medium">
                  {characteristic.reasoning}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопка редактирования убрана - редактирование по клику на значение */}
      </div>
    </div>
  );
};

export default function Step4Results({
  createdProductId,
  aiResponse,
  aiCharacteristics,
  isLoadingCharacteristics,
  onUpdateProductField,
  onPublish,
  onSaveOnly,
  onCreateInfographic,
  onClearForm,
  onLoadProductCharacteristics,
  onCharacteristicUpdate,
  hasPendingData = false,
  isPublished = false,
  isPublishing = false,
  dimensions
}: Step4ResultsProps) {
  const [characteristics, setCharacteristics] = useState<AICharacteristic[]>([]);
  const [editingCharacteristic, setEditingCharacteristic] = useState<number | null>(null);
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [retryButtonClicked, setRetryButtonClicked] = useState(false);

  // Обновляем характеристики когда приходят новые данные
  useEffect(() => {
    if (aiCharacteristics && aiCharacteristics.length > 0) {
      console.log('Получены все характеристики категории:', aiCharacteristics.length);
      
      // Сортируем характеристики: сначала заполненные, потом пустые по алфавиту
      const sortedCharacteristics = [...aiCharacteristics].sort((a, b) => {
        // Сначала заполненные
        if (a.isFilled && !b.isFilled) return -1;
        if (!a.isFilled && b.isFilled) return 1;
        
        // В пределах группы - по алфавиту
        return a.name.localeCompare(b.name);
      });
      
      setCharacteristics(sortedCharacteristics);
      
      const filledCount = sortedCharacteristics.filter(c => c.isFilled).length;
      
      console.log(`Статистика характеристик: ${filledCount} заполнено из ${sortedCharacteristics.length} общих`);
    }
  }, [aiCharacteristics]);

  const handleCharacteristicSave = async (characteristicId: number, newValue: string) => {
    console.log('Сохраняем характеристику:', characteristicId, newValue);
    
    // Обновляем локальное состояние
    setCharacteristics(prev => 
      prev.map(char => 
        char.id === characteristicId 
          ? { ...char, value: newValue, isFilled: !!newValue }
          : char
      )
    );

    setEditingCharacteristic(null);

    // Сохраняем через родительский компонент
    if (onCharacteristicUpdate) {
      try {
        await onCharacteristicUpdate(characteristicId, newValue);
        console.log('Характеристика сохранена');
      } catch (error) {
        console.error('Ошибка сохранения характеристики:', error);
      }
    }
  };

  // Фильтрация характеристик для отображения
  const filteredCharacteristics = characteristics.filter(char => {
    if (showOnlyFilled && !char.isFilled) return false;
    return true;
  });

  // Статистика с учетом системных характеристик
  const stats = {
    total: characteristics.length,
    filled: characteristics.filter(c => c.isFilled).length,
    editable: characteristics.filter(c => c.isEditable !== false).length,
    editableFilled: characteristics.filter(c => c.isEditable !== false && c.isFilled).length,
    system: characteristics.filter(c => c.category === 'user_protected').length,
    required: characteristics.filter(c => c.isRequired).length,
    requiredFilled: characteristics.filter(c => c.isRequired && c.isFilled).length,
    fillRate: characteristics.filter(c => c.isEditable !== false).length > 0 
      ? Math.round((characteristics.filter(c => c.isEditable !== false && c.isFilled).length / characteristics.filter(c => c.isEditable !== false).length) * 100) 
      : 0
  };

  if (isLoadingCharacteristics) {
    return (
      <div className="text-center py-8">
        <Loader className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">ИИ анализирует товар и создает характеристики...</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-700 rounded animate-pulse w-3/4 mx-auto"></div>
          <div className="h-2 bg-gray-700 rounded animate-pulse w-1/2 mx-auto"></div>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          Анализируем изображения и создаем подходящие характеристики для вашего товара...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статус */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Результаты создания товара</h2>
        {hasPendingData && !isPublished ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4 shadow-md">
            <p className="text-yellow-800 text-sm flex items-center justify-center gap-2 font-semibold">
              <AlertCircle className="w-5 h-5" />
              Проверьте характеристики и нажмите "Опубликовать товар" для сохранения в БД и публикации на Wildberries
            </p>
          </div>
        ) : isPublished ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 mb-4 shadow-md">
            <p className="text-green-800 text-sm flex items-center justify-center gap-2 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Товар опубликован на Wildberries и сохранен в базе данных
            </p>
          </div>
        ) : (
          <p className="text-gray-600 font-medium">Проверьте и настройте все характеристики перед публикацией</p>
        )}
      </div>

      {/* Основная информация товара */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          Информация о товаре
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Название товара</label>
            <input
              type="text"
              value={aiResponse?.generatedName || ''}
              onChange={(e) => onUpdateProductField('name', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="Название товара"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Качество заполнения</label>
            <div className="flex items-center gap-4 px-4 py-3 border-2 border-green-400 rounded-lg bg-green-50 shadow-sm">
              <div className="text-3xl font-bold text-green-700">{stats.fillRate}%</div>
              <div className="text-sm text-green-800 font-semibold">
                {stats.editableFilled} из {stats.editable} редактируемых заполнено
              </div>
            </div>
          </div>
        </div>
        
        {/* Цены и остатки */}
        <div className="grid md:grid-cols-5 gap-4 mt-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Цена без скидки (₽) *</label>
            <input
              type="number"
              value={aiResponse?.price || ''}
              onChange={(e) => onUpdateProductField('price', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Цена со скидкой (₽)</label>
            <input
              type="number"
              value={aiResponse?.discountPrice || ''}
              onChange={(e) => onUpdateProductField('discountPrice', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Себестоимость (₽)</label>
            <input
              type="number"
              value={aiResponse?.costPrice || ''}
              onChange={(e) => onUpdateProductField('costPrice', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Остатки (шт) *</label>
            <input
              type="number"
              value={aiResponse?.stock || ''}
              onChange={(e) => onUpdateProductField('stock', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Резерв (шт)</label>
            <input
              type="number"
              value={aiResponse?.reserved || ''}
              onChange={(e) => onUpdateProductField('reserved', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              disabled={isPublishing}
            />
          </div>
        </div>
        
        {/* Габариты упаковки */}
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Длина (см)</label>
            <input
              type="number"
              value={dimensions?.length || ''}
              onChange={(e) => onUpdateProductField('length', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Ширина (см)</label>
            <input
              type="number"
              value={dimensions?.width || ''}
              onChange={(e) => onUpdateProductField('width', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Высота (см)</label>
            <input
              type="number"
              value={dimensions?.height || ''}
              onChange={(e) => onUpdateProductField('height', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Вес (кг)</label>
            <input
              type="number"
              value={dimensions?.weight || ''}
              onChange={(e) => onUpdateProductField('weight', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
        </div>
        
        {/* Габариты товара */}
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Длина (см)</label>
            <input
              type="number"
              value={dimensions?.length || ''}
              onChange={(e) => onUpdateProductField('length', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Ширина (см)</label>
            <input
              type="number"
              value={dimensions?.width || ''}
              onChange={(e) => onUpdateProductField('width', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Высота (см)</label>
            <input
              type="number"
              value={dimensions?.height || ''}
              onChange={(e) => onUpdateProductField('height', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.1"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Вес (кг)</label>
            <input
              type="number"
              value={dimensions?.weight || ''}
              onChange={(e) => onUpdateProductField('weight', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
              placeholder="0"
              min="0"
              step="0.01"
              disabled={isPublishing}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Описание товара</label>
          <textarea
            value={aiResponse?.seoDescription || ''}
            onChange={(e) => onUpdateProductField('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium"
            placeholder="Описание товара для покупателей..."
            disabled={isPublishing}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600 font-medium">
            <span>Рекомендуемая длина: 1300-2000 символов</span>
            <span className="font-semibold">{(aiResponse?.seoDescription || '').length} символов</span>
          </div>
        </div>
      </div>

      {/* Статистика и управление */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Характеристики товара ({stats.total})
            </h3>
            
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-600"></div>
                <span className="text-green-800 font-semibold">Заполнено ИИ: {stats.editableFilled}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-600"></div>
                <span className="text-blue-800 font-semibold">Системных: {stats.system}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-600"></div>
                <span className="text-red-800 font-semibold">Обязательных: {stats.requiredFilled}/{stats.required}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-600"></div>
                <span className="text-gray-800 font-semibold">Можно дополнить: {stats.editable - stats.editableFilled}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowOnlyFilled(!showOnlyFilled)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
                showOnlyFilled 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
            >
              {showOnlyFilled ? 'Показать все' : 'Только заполненные'}
            </button>
            
            <button
              onClick={() => setShowSystemInfo(!showSystemInfo)}
              className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-all shadow-md"
              title="Системная информация"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Системная информация */}
        {showSystemInfo && (
          <div className="mb-4 p-4 bg-gray-100 rounded-xl border-2 border-gray-300 shadow-sm">
            <h4 className="text-gray-900 font-bold mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              Системная информация
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 block font-semibold">Товар ID:</span>
                <span className="text-gray-900 font-mono font-bold">{createdProductId?.slice(-8) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600 block font-semibold">ИИ Система:</span>
                <span className="text-gray-900 font-bold">Unified AI v3</span>
              </div>
              <div>
                <span className="text-gray-600 block font-semibold">Модель:</span>
                <span className="text-gray-900 font-bold">GPT-5-mini</span>
              </div>
              <div>
                <span className="text-gray-600 block font-semibold">Статус:</span>
                <span className={`font-bold ${hasPendingData ? 'text-yellow-700' : isPublished ? 'text-green-700' : 'text-gray-700'}`}>
                  {hasPendingData ? 'Предпросмотр' : isPublished ? 'Опубликован' : 'Создан'}
                </span>
              </div>
            </div>
          </div>
        )}

        {filteredCharacteristics.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredCharacteristics.map((char) => (
              <CharacteristicItem
                key={char.id}
                characteristic={char}
                isEditing={editingCharacteristic === char.id}
                onEdit={() => setEditingCharacteristic(char.id)}
                onSave={(value) => handleCharacteristicSave(char.id, value)}
                onCancel={() => setEditingCharacteristic(null)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4 font-semibold">
              {showOnlyFilled && stats.filled === 0 
                ? 'Нет заполненных характеристик - ИИ не смог определить значения автоматически' 
                : 'Характеристики не загружены'
              }
            </p>
            {showOnlyFilled && stats.filled === 0 ? (
              <button
                onClick={() => setShowOnlyFilled(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Показать все характеристики
              </button>
            ) : createdProductId ? (
              <button
                onClick={() => onLoadProductCharacteristics && onLoadProductCharacteristics(createdProductId)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Перезагрузить характеристики
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Рекомендации */}
      {characteristics.length > 0 && !isPublished && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 shadow-md">
          <h4 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Рекомендации по улучшению карточки товара:
          </h4>
          <ul className="text-sm text-gray-800 space-y-2 font-medium">
            {stats.fillRate < 50 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-700 mt-0.5 font-bold">•</span>
                <span>Заполните больше характеристик для улучшения ранжирования на Wildberries (рекомендуется 60%+)</span>
              </li>
            )}
            {stats.requiredFilled < stats.required && (
              <li className="flex items-start gap-2">
                <span className="text-red-700 mt-0.5 font-bold">•</span>
                <span>Обязательно заполните все обязательные характеристики ({stats.requiredFilled}/{stats.required})</span>
              </li>
            )}
            {stats.fillRate >= 80 && (
              <li className="flex items-start gap-2">
                <span className="text-green-700 mt-0.5 font-bold">•</span>
                <span>Отличное заполнение характеристик! Товар готов к публикации</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-700 mt-0.5 font-bold">•</span>
              <span>Проверьте точность характеристик, заполненных ИИ, особенно с низкой уверенностью</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-700 mt-0.5 font-bold">•</span>
              <span>Все характеристики опциональны - заполняйте те, которые помогут покупателям</span>
            </li>
          </ul>
        </div>
      )}

      {/* Действия */}
      <div className="space-y-4">
        {/* Основные кнопки публикации и сохранения */}
        {!isPublished && hasPendingData && (
          <div className="text-center space-y-4">
            {/* DEBUG: Показываем количество характеристик */}
            <p className="text-gray-600 text-xs font-medium">
              📊 Характеристик загружено: {characteristics.length}
            </p>
            
            {/* Основная кнопка публикации - ВСЕГДА АКТИВНА */}
            <button
              onClick={onPublish}
              disabled={isPublishing}
              className={`px-8 py-4 rounded-xl flex items-center gap-3 font-semibold text-lg mx-auto transition-all duration-300 ${
                isPublishing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-105'
              }`}
            >
              {isPublishing ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Публикация товара...
                </>
              ) : (
                <>
                  <Globe className="w-6 h-6" />
                  Опубликовать товар на Wildberries
                </>
              )}
            </button>
            
            <p className="text-gray-700 text-sm font-medium">
              Товар будет автоматически сохранен в базе данных и опубликован на Wildberries
            </p>
            
            {/* Кнопка сохранения без публикации */}
            <div className="border-t-2 border-gray-300 pt-4">
              <button
                onClick={onSaveOnly}
                disabled={isPublishing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Database className="w-5 h-5" />
                Сохранить без публикации на WB
              </button>
              <p className="text-gray-600 text-xs mt-2 font-medium">
                Сохранить данные в базу без публикации на Wildberries
              </p>
            </div>
          </div>
        )}

        {/* Дополнительные действия */}
        <div className="flex flex-wrap gap-4 justify-center">
          {isPublished && !retryButtonClicked && (
            <button
              onClick={() => {
                setRetryButtonClicked(true);
                onPublish();
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Upload className="w-5 h-5" />
              Опубликовать повторно
            </button>
          )}
          
          <button
            onClick={onCreateInfographic}
            disabled={!createdProductId}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Palette className="w-5 h-5" />
            Создать инфографику
          </button>
          
          <button
            onClick={onClearForm}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5" />
            Создать новый товар
          </button>
        </div>
      </div>

      {/* Статус предпросмотра */}
      {hasPendingData && !isPublished && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-yellow-700" />
            <span className="text-yellow-900 font-bold">Режим предварительного просмотра</span>
          </div>
          <p className="text-yellow-800 text-sm font-medium">
            Данные отображаются для проверки и редактирования. После нажатия кнопки "Опубликовать товар" 
            все изменения будут сохранены в базе данных и товар будет опубликован на Wildberries.
          </p>
        </div>
      )}

      {/* Информация об успешной публикации */}
      {isPublished && (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-700" />
            <span className="text-green-900 font-bold">Товар успешно опубликован</span>
          </div>
          <p className="text-green-800 text-sm font-medium">
            Ваш товар сохранен в базе данных и опубликован на Wildberries. 
            Теперь вы можете просмотреть его в личном кабинете или создать новый товар.
          </p>
        </div>
      )}
    </div>
  );
};