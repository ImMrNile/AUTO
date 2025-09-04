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
  onLoadAllCategoryCharacteristics?: (categoryId: number) => void;
  onCharacteristicUpdate?: (characteristicId: number, newValue: string) => void;
  hasPendingData?: boolean;
  isPublished?: boolean;
  isPublishing?: boolean;
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
    if (characteristic.category === 'declaration') {
      return <FileText className="w-4 h-4 text-orange-400" />;
    } else if (characteristic.category === 'manual_required') {
      return <Wrench className="w-4 h-4 text-yellow-400" />;
    } else if (characteristic.category === 'user_protected') {
      return <Lock className="w-4 h-4 text-blue-400" />;
    } else if (characteristic.isFilled) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = () => {
    if (characteristic.category === 'declaration') {
      return 'border-orange-500/30 bg-orange-900/10';
    } else if (characteristic.category === 'manual_required') {
      return 'border-yellow-500/30 bg-yellow-900/10';
    } else if (characteristic.category === 'user_protected') {
      return 'border-blue-500/30 bg-blue-900/10';
    } else if (characteristic.isFilled) {
      return 'border-green-500/30 bg-green-900/10';
    } else {
      return 'border-gray-500/20 bg-gray-900/10';
    }
  };

  const getCategoryLabel = () => {
    if (characteristic.category === 'declaration') {
      return 'Декларационная';
    } else if (characteristic.category === 'manual_required') {
      return 'Требует ввода';
    } else if (characteristic.category === 'user_protected') {
      return 'Системная';
    } else if (characteristic.isFilled) {
      return 'Заполнено ИИ';
    } else {
      return 'Не заполнено';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getCategoryColor()} bg-black/30 hover:border-blue-500/30 transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getCategoryIcon()}
            <span className="font-medium text-white text-sm">{characteristic.name}</span>
            
            <span className={`px-2 py-0.5 rounded text-xs ${
              characteristic.category === 'declaration'
                ? 'bg-orange-900/30 text-orange-300'
                : characteristic.category === 'manual_required'
                ? 'bg-yellow-900/30 text-yellow-300'
                : characteristic.category === 'user_protected'
                ? 'bg-blue-900/30 text-blue-300'
                : characteristic.isFilled 
                ? 'bg-green-900/30 text-green-300' 
                : 'bg-gray-900/30 text-gray-300'
            }`}>
              {getCategoryLabel()}
            </span>
            
            {characteristic.isRequired && (
              <span className="px-1.5 py-0.5 bg-red-900/30 text-red-300 text-xs rounded">
                Обязательная
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              {characteristic.possibleValues && characteristic.possibleValues.length > 0 ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-blue-500/30 rounded text-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
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
                  min={characteristic.minValue}
                  max={characteristic.maxValue}
                  placeholder="Введите число"
                  className="w-full px-3 py-2 bg-black/40 border border-blue-500/30 rounded text-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  maxLength={characteristic.maxLength}
                  placeholder="Введите значение"
                  className="w-full px-3 py-2 bg-black/40 border border-blue-500/30 rounded text-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              )}
              
              {characteristic.description && (
                <p className="text-xs text-gray-400">{characteristic.description}</p>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => onSave(editValue)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Сохранить
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-white text-sm min-h-[20px]">
                {characteristic.value ? (
                  <span className={`font-medium ${
                    characteristic.category === 'user_protected' ? 'text-blue-200' : 'text-white'
                  }`}>
                    {characteristic.value}
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="text-gray-400 italic">
                      {characteristic.category === 'manual_required' 
                        ? 'Требует ручного ввода - нажмите ✏️ для заполнения'
                        : characteristic.category === 'user_protected'
                        ? 'Системная характеристика - нажмите ✏️ для редактирования'
                        : 'Не заполнено ИИ - нажмите ✏️ для добавления значения'
                      }
                    </span>
                    {characteristic.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        💡 {characteristic.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {characteristic.isFilled && characteristic.confidence > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400">
                    Уверенность ИИ: {Math.round(characteristic.confidence * 100)}%
                  </div>
                  {characteristic.confidence < 0.7 && (
                    <div className="text-xs text-yellow-400 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Рекомендуется проверить
                    </div>
                  )}
                </div>
              )}
              
              {characteristic.reasoning && characteristic.reasoning !== 'ai_analysis' && (
                <div className="text-xs text-gray-400 bg-gray-800/30 rounded p-2">
                  {characteristic.reasoning}
                </div>
              )}
            </div>
          )}
        </div>

        {characteristic.isEditable !== false && characteristic.category !== 'declaration' && !isEditing && (
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
            title="Редактировать характеристику"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        
        {characteristic.category === 'declaration' && (
          <div className="p-2 text-orange-400" title="Декларационные данные заполняются отдельно">
            <Lock className="w-4 h-4" />
          </div>
        )}
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
  onLoadAllCategoryCharacteristics,
  onCharacteristicUpdate,
  hasPendingData = false,
  isPublished = false,
  isPublishing = false
}: Step4ResultsProps) {
  const [characteristics, setCharacteristics] = useState<AICharacteristic[]>([]);
  const [editingCharacteristic, setEditingCharacteristic] = useState<number | null>(null);
  const [showOnlyFilled, setShowOnlyFilled] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

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
        <h2 className="text-2xl font-bold text-white mb-2">Результаты создания товара</h2>
        {hasPendingData && !isPublished ? (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-300 text-sm flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Проверьте характеристики и нажмите "Опубликовать товар" для сохранения в БД и публикации на Wildberries
            </p>
          </div>
        ) : isPublished ? (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
            <p className="text-green-300 text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Товар опубликован на Wildberries и сохранен в базе данных
            </p>
          </div>
        ) : (
          <p className="text-gray-300">Проверьте и настройте все характеристики перед публикацией</p>
        )}
      </div>

      {/* Основная информация товара */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-blue-500/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Информация о товаре
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Название товара</label>
            <input
              type="text"
              value={aiResponse?.generatedName || ''}
              onChange={(e) => onUpdateProductField('name', e.target.value)}
              className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-black/40 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              placeholder="Название товара"
              disabled={isPublishing}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Качество заполнения</label>
            <div className="flex items-center gap-4 px-4 py-3 border border-green-500/30 rounded-lg bg-green-900/10">
              <div className="text-2xl font-bold text-green-400">{stats.fillRate}%</div>
              <div className="text-sm text-green-300">
                {stats.editableFilled} из {stats.editable} редактируемых заполнено
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-300 block mb-2">Описание товара</label>
          <textarea
            value={aiResponse?.seoDescription || ''}
            onChange={(e) => onUpdateProductField('description', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-black/40 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            placeholder="Описание товара для покупателей..."
            disabled={isPublishing}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Рекомендуемая длина: 1300-2000 символов</span>
            <span>{(aiResponse?.seoDescription || '').length} символов</span>
          </div>
        </div>
      </div>

      {/* Статистика и управление */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-blue-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Характеристики товара ({stats.total})
            </h3>
            
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-green-300">Заполнено ИИ: {stats.editableFilled}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-yellow-300">Требуют ввода: {characteristics.filter(c => c.category === 'manual_required').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-blue-300">Системных: {stats.system}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-orange-300">Декларационных: {characteristics.filter(c => c.category === 'declaration').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500"></div>
                <span className="text-gray-300">Можно дополнить: {stats.editable - stats.editableFilled}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowOnlyFilled(!showOnlyFilled)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showOnlyFilled 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {showOnlyFilled ? 'Показать все' : 'Только заполненные'}
            </button>

            {/* Кнопки управления характеристиками */}
            {createdProductId && (
              <>
                <button
                  onClick={() => onLoadProductCharacteristics && onLoadProductCharacteristics(createdProductId)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Обновить список характеристик"
                >
                  🔄 Обновить
                </button>
                
                <button
                  onClick={() => {
                    // Показать подсказку о заполнении характеристик
                    const emptyCount = characteristics.filter(c => !c.isFilled && c.isEditable !== false).length;
                    alert(`Найдено ${emptyCount} незаполненных характеристик. Нажмите кнопку "Показать все" чтобы увидеть их, затем используйте кнопку ✏️ для редактирования.`);
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Помощь по заполнению"
                >
                  💡 Помощь
                </button>
                
                {/* Кнопка для загрузки всех характеристик категории */}
                {onLoadAllCategoryCharacteristics && aiResponse?.category?.id && (
                  <button
                    onClick={() => onLoadAllCategoryCharacteristics(aiResponse.category.id)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    title="Загрузить все характеристики категории"
                  >
                    📋 Все поля
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={() => setShowSystemInfo(!showSystemInfo)}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              title="Системная информация"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Системная информация */}
        {showSystemInfo && (
          <div className="mb-4 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Системная информация
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block">Товар ID:</span>
                <span className="text-white font-mono">{createdProductId?.slice(-8) || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">ИИ Система:</span>
                <span className="text-white">Unified AI v3</span>
              </div>
              <div>
                <span className="text-gray-400 block">Модель:</span>
                <span className="text-white">GPT-5-mini</span>
              </div>
              <div>
                <span className="text-gray-400 block">Статус:</span>
                <span className={`${hasPendingData ? 'text-yellow-400' : isPublished ? 'text-green-400' : 'text-gray-400'}`}>
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
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
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
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-400" />
            Рекомендации по улучшению карточки товара:
          </h4>
          <ul className="text-sm text-blue-200 space-y-2">
            {stats.fillRate < 50 && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Заполните больше характеристик для улучшения ранжирования на Wildberries (рекомендуется 60%+)</span>
              </li>
            )}
            {stats.requiredFilled < stats.required && (
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Обязательно заполните все обязательные характеристики ({stats.requiredFilled}/{stats.required})</span>
              </li>
            )}
            {stats.fillRate >= 80 && (
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>Отличное заполнение характеристик! Товар готов к публикации</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>Проверьте точность характеристик, заполненных ИИ, особенно с низкой уверенностью</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
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
            {/* Основная кнопка публикации */}
            <button
              onClick={onPublish}
              disabled={isPublishing || characteristics.length === 0}
              className={`px-8 py-4 rounded-xl flex items-center gap-3 font-semibold text-lg mx-auto transition-all duration-300 ${
                isPublishing || characteristics.length === 0
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
            
            <p className="text-gray-400 text-sm">
              Товар будет автоматически сохранен в базе данных и опубликован на Wildberries
            </p>
            
            {/* Кнопка сохранения без публикации */}
            <div className="border-t border-gray-600 pt-4">
              <button
                onClick={onSaveOnly}
                disabled={isPublishing || characteristics.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Database className="w-5 h-5" />
                Сохранить без публикации на WB
              </button>
              <p className="text-gray-400 text-xs mt-2">
                Сохранить данные в базу без публикации на Wildberries
              </p>
            </div>
          </div>
        )}

        {/* Дополнительные действия */}
        <div className="flex flex-wrap gap-4 justify-center">
          {isPublished && (
            <button
              onClick={() => {
                console.log('Переход к товару на WB');
                // TODO: Добавить реальный переход к товару на WB
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <ExternalLink className="w-5 h-5" />
              Посмотреть на Wildberries
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
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-300 font-medium">Режим предварительного просмотра</span>
          </div>
          <p className="text-yellow-200 text-sm">
            Данные отображаются для проверки и редактирования. После нажатия кнопки "Опубликовать товар" 
            все изменения будут сохранены в базе данных и товар будет опубликован на Wildberries.
          </p>
        </div>
      )}

      {/* Информация об успешной публикации */}
      {isPublished && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">Товар успешно опубликован</span>
          </div>
          <p className="text-green-200 text-sm">
            Ваш товар сохранен в базе данных и опубликован на Wildberries. 
            Теперь вы можете просмотреть его в личном кабинете или создать новый товар.
          </p>
        </div>
      )}
    </div>
  );
};