// src/components/ProductForm/Step4Results.tsx
import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Settings, 
  Upload, 
  Sparkles, 
  Zap, 
  Star, 
  TrendingUp, 
  Palette, 
  Camera, 
  Eye, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  X,
  Save,
  Plus,
  Info
} from 'lucide-react';

interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
}

interface AICharacteristic {
  id: number;
  name: string;
  value: any;
  confidence: number;
  reasoning: string;
  type: 'string' | 'number';
  isRequired?: boolean;
  possibleValues?: string[];
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
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
  onCreateInfographic: () => void;
  onClearForm: () => void;
  onLoadProductCharacteristics: (productId: string) => void;
  onUpdateDescription?: (description: string) => void;
}

// Компонент для отображения характеристики
const CharacteristicItem = ({ 
  characteristic, 
  isEditing, 
  onToggleEdit, 
  onUpdate, 
  isFilled,
  onDelete 
}: {
  characteristic: any;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (value: any) => void;
  isFilled: boolean;
  onDelete?: () => void;
}) => {
  const [tempValue, setTempValue] = useState(characteristic.value || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(tempValue);
    } catch (error) {
      console.error('Ошибка сохранения характеристики:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(characteristic.value || '');
    onToggleEdit();
  };

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      isFilled 
        ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' 
        : 'bg-black/40 border-blue-500/20 hover:bg-black/60'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-white">{characteristic.name}</span>
          {characteristic.isRequired && (
            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded-full">
              обязательная
            </span>
          )}
          <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1 rounded-full">
            {characteristic.type === 'number' ? 'число' : 'текст'}
          </span>
          {isFilled && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full">
              заполнено
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleEdit}
            disabled={isSaving}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
              isFilled 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {isSaving ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : isEditing ? (
              <Save className="w-3 h-3" />
            ) : (
              <Edit3 className="w-3 h-3" />
            )}
            {isEditing ? 'Сохранить' : isFilled ? 'Изменить' : 'Заполнить'}
          </button>
          
          {isFilled && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {characteristic.possibleValues && characteristic.possibleValues.length > 0 ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-500/30 rounded-md focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-black/40 backdrop-blur-md text-white"
            >
              <option value="">Выберите значение</option>
              {characteristic.possibleValues.map((value: string) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          ) : characteristic.type === 'number' ? (
            <input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-500/30 rounded-md focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
              placeholder="Введите число"
              min={characteristic.minValue}
              max={characteristic.maxValue}
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              maxLength={characteristic.maxLength}
              className="w-full px-3 py-2 text-sm border border-blue-500/30 rounded-md focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
              placeholder="Введите значение"
            />
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Сохранить
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
              Отмена
            </button>
          </div>
          
          {/* Подсказки по ограничениям */}
          <div className="text-xs text-gray-400">
            {characteristic.maxLength && `Макс. длина: ${characteristic.maxLength} символов`}
            {characteristic.minValue !== undefined && ` • Мин. значение: ${characteristic.minValue}`}
            {characteristic.maxValue !== undefined && ` • Макс. значение: ${characteristic.maxValue}`}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className={`font-medium text-sm ${
            isFilled ? 'text-white' : 'text-gray-400 italic'
          }`}>
            {characteristic.value || 'Не заполнено'}
          </span>
          {isFilled && characteristic.confidence && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Уверенность: {Math.round(characteristic.confidence * 100)}%</span>
              <Info className="w-3 h-3" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Компонент для редактирования полей
const EditableField = ({ 
  label, 
  value, 
  onSave, 
  type = 'text', 
  maxLength, 
  placeholder 
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
  type?: 'text' | 'textarea';
  maxLength?: number;
  placeholder?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex gap-2">
          {type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              maxLength={maxLength}
              placeholder={placeholder}
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={maxLength}
              placeholder={placeholder}
            />
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {maxLength && (
          <div className="text-xs text-gray-500">
            {editValue.length}/{maxLength} символов
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 text-sm text-gray-800">
          {type === 'textarea' ? (
            <div className="whitespace-pre-wrap">{value || placeholder}</div>
          ) : (
            <span>{value || placeholder}</span>
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Изменить
        </button>
      </div>
    </div>
  );
};

export default function Step4Results({
  createdProductId,
  aiResponse,
  aiCharacteristics,
  allCategoryCharacteristics,
  isLoadingCharacteristics,
  editingCharacteristics,
  onUpdateProductField,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  onAddNewCharacteristic,
  onToggleEditCharacteristic,
  onPublish,
  onCreateInfographic,
  onClearForm,
  onLoadProductCharacteristics
}: Step4ResultsProps) {
  // Добавляем логирование для отладки
  console.log('🔍 [Step4Results] Получены пропсы:', {
    createdProductId,
    aiResponse,
    aiCharacteristics,
    characteristicsCount: aiCharacteristics?.length || 0,
    isLoadingCharacteristics
  });

  const [localEditingCharacteristics, setLocalEditingCharacteristics] = useState<{[key: number]: boolean}>({});
  const [localCharacteristics, setLocalCharacteristics] = useState(aiCharacteristics);
  
  // Обновляем локальные характеристики при изменении props
  useEffect(() => {
    console.log('🔄 [Step4Results] useEffect: обновляем localCharacteristics:', {
      aiCharacteristics,
      aiCharacteristicsLength: aiCharacteristics?.length || 0,
      localCharacteristicsLength: localCharacteristics?.length || 0
    });
    setLocalCharacteristics(aiCharacteristics);
  }, [aiCharacteristics]);

  // Если характеристики не загружены, но есть ID товара, загружаем их
  useEffect(() => {
    if (createdProductId && (!aiCharacteristics || aiCharacteristics.length === 0)) {
      console.log('🔄 [Step4Results] Загружаем характеристики для товара:', createdProductId);
      onLoadProductCharacteristics(createdProductId);
    }
  }, [createdProductId, aiCharacteristics, onLoadProductCharacteristics]);

  const [showInfographicCreator, setShowInfographicCreator] = useState(false);

  if (!aiResponse) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Загрузка результатов...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Результаты создания товара</h2>
        <p className="text-base text-gray-300">
          {isLoadingCharacteristics 
            ? 'Загружаем характеристики, созданные ИИ...' 
            : 'Товар успешно создан! Проверьте и настройте характеристики'
          }
        </p>
        {isLoadingCharacteristics && (
          <div className="mt-3 flex items-center justify-center gap-2 text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <span className="text-sm">ИИ анализирует товар...</span>
          </div>
        )}
      </div>

      {/* Основная информация о товаре */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-blue-500/20 p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Основная информация
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Название товара</label>
            <input
              type="text"
              value={aiResponse.generatedName || ''}
              onChange={(e) => onUpdateProductField('name', e.target.value)}
              className="w-full px-3 py-2 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-sm bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
              placeholder="Название товара"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Категория</label>
            <div className="px-3 py-2 bg-black/40 border border-blue-500/30 rounded-lg text-sm text-white">
              {aiResponse.category?.displayName || 'Не выбрана'}
            </div>
          </div>
        </div>
        
        {/* Описание товара */}
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-gray-300">Описание товара</label>
          <textarea
            value={aiResponse.seoDescription || ''}
            onChange={(e) => onUpdateProductField('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 hover:border-blue-300 text-sm bg-black/40 backdrop-blur-md text-white placeholder-gray-400"
            placeholder="Описание товара, созданное ИИ..."
          />
        </div>
      </div>

              {/* Характеристики ИИ */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl border border-blue-500/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Характеристики ИИ
            </h3>
            {aiResponse.qualityScore && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Качество анализа:</span>
                <span className={`font-medium px-2 py-1 rounded ${
                  aiResponse.qualityScore >= 80 ? 'bg-green-900/50 text-green-400' :
                  aiResponse.qualityScore >= 60 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {aiResponse.qualityScore}%
                </span>
              </div>
            )}
          </div>
        
        {isLoadingCharacteristics ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {localCharacteristics.length > 0 ? (
              localCharacteristics.map((characteristic) => (
                <CharacteristicItem
                  key={characteristic.id}
                  characteristic={characteristic}
                  isEditing={localEditingCharacteristics[characteristic.id] || false}
                  onToggleEdit={() => {
                    setLocalEditingCharacteristics(prev => ({
                      ...prev,
                      [characteristic.id]: !prev[characteristic.id]
                    }));
                  }}
                  onUpdate={(value) => {
                    const updatedCharacteristics = localCharacteristics.map((char: any) =>
                      char.id === characteristic.id ? { ...char, value } : char
                    );
                    setLocalCharacteristics(updatedCharacteristics);
                    onUpdateCharacteristic(characteristic.id, value);
                    setLocalEditingCharacteristics(prev => ({
                      ...prev,
                      [characteristic.id]: false
                    }));
                  }}
                  isFilled={!!characteristic.value}
                  onDelete={() => onDeleteCharacteristic(characteristic.id)}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <p>Характеристики еще не загружены или отсутствуют</p>
                {createdProductId && (
                  <button
                    onClick={() => onLoadProductCharacteristics(createdProductId)}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Загрузить характеристики
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onPublish}
          disabled={isLoadingCharacteristics || localCharacteristics.length === 0}
          className={`px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:transform hover:scale-105 ${
            isLoadingCharacteristics || localCharacteristics.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {isLoadingCharacteristics ? 'Ожидание ИИ-анализа...' : 'Опубликовать товар'}
        </button>
        
        <button
          onClick={onCreateInfographic}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:transform hover:scale-105"
        >
          <Palette className="w-4 h-4" />
          Создать инфографику
        </button>
        
        <button
          onClick={onClearForm}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:transform hover:scale-105"
        >
          <RotateCcw className="w-4 h-4" />
          Создать новый товар
        </button>
      </div>
    </div>
  );
}