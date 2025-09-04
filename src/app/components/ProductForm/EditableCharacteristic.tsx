// src/components/ProductForm/EditableCharacteristic.tsx - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

import React, { useState, useRef, useEffect } from 'react';
import { 
  Edit3, 
  Check, 
  X, 
  Trash2, 
  AlertCircle,
  Info,
  Lock,
  Wrench,
  FileText,
  Zap,
  Settings,
  Star,
  CheckCircle
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
  isManualInput?: boolean;
  isProtected?: boolean;
  isDeclaration?: boolean;
}

interface EditableCharacteristicProps {
  characteristic: AICharacteristic;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (value: string) => void;
  isFilled: boolean;
  onDelete?: () => void;
  showDelete?: boolean;
}

const EditableCharacteristic: React.FC<EditableCharacteristicProps> = ({
  characteristic,
  isEditing,
  onToggleEdit,
  onUpdate,
  isFilled,
  onDelete,
  showDelete = false
}) => {
  const [editValue, setEditValue] = useState(String(characteristic.value || ''));
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(String(characteristic.value || ''));
    setError('');
  }, [characteristic.value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Определяем можно ли редактировать характеристику
  const isEditable = !characteristic.isProtected && 
                    !characteristic.isManualInput && 
                    !characteristic.isDeclaration &&
                    characteristic.category !== 'declaration' &&
                    characteristic.category !== 'user_protected' &&
                    characteristic.category !== 'manual_required';

  const validateValue = (value: string): string | null => {
    if (!value && characteristic.isRequired) {
      return 'Обязательная характеристика не может быть пустой';
    }

    if (characteristic.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return 'Введите корректное число';
      }
      if (characteristic.minValue !== undefined && num < characteristic.minValue) {
        return `Значение должно быть не менее ${characteristic.minValue}`;
      }
      if (characteristic.maxValue !== undefined && num > characteristic.maxValue) {
        return `Значение должно быть не более ${characteristic.maxValue}`;
      }
    }

    if (characteristic.type === 'string') {
      if (characteristic.maxLength && value.length > characteristic.maxLength) {
        return `Максимальная длина: ${characteristic.maxLength} символов`;
      }
    }

    if (characteristic.possibleValues && characteristic.possibleValues.length > 0) {
      const allowedValues = characteristic.possibleValues.map(v => v.value);
      if (!allowedValues.includes(value)) {
        return 'Значение должно быть из списка допустимых';
      }
    }

    return null;
  };

  const handleSave = () => {
    const validationError = validateValue(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError('');
    onUpdate(editValue);
  };

  const handleCancel = () => {
    setEditValue(String(characteristic.value || ''));
    setError('');
    onToggleEdit();
  };

  // Получаем иконку и цвет в зависимости от категории
  const getCategoryInfo = () => {
    switch (characteristic.category) {
      case 'manual_required':
        return {
          icon: <Wrench className="w-4 h-4" />,
          color: 'border-orange-500/30 bg-orange-900/10',
          textColor: 'text-orange-300',
          badge: 'Ручной ввод',
          badgeColor: 'bg-orange-900/30 text-orange-300'
        };
      case 'user_protected':
        return {
          icon: <Lock className="w-4 h-4" />,
          color: 'border-blue-500/30 bg-blue-900/10',
          textColor: 'text-blue-300',
          badge: 'Защищено',
          badgeColor: 'bg-blue-900/30 text-blue-300'
        };
      case 'declaration':
        return {
          icon: <FileText className="w-4 h-4" />,
          color: 'border-purple-500/30 bg-purple-900/10',
          textColor: 'text-purple-300',
          badge: 'Декларация',
          badgeColor: 'bg-purple-900/30 text-purple-300'
        };
      default:
        return {
          icon: <Zap className="w-4 h-4" />,
          color: isFilled 
            ? 'border-green-500/30 bg-green-900/10' 
            : characteristic.isRequired 
              ? 'border-orange-500/30 bg-orange-900/10'
              : 'border-blue-500/20',
          textColor: isFilled ? 'text-green-300' : 'text-white',
          badge: 'ИИ',
          badgeColor: 'bg-blue-900/30 text-blue-300'
        };
    }
  };

  const categoryInfo = getCategoryInfo();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'Очень высокая';
    if (confidence >= 0.8) return 'Высокая';
    if (confidence >= 0.6) return 'Средняя';
    if (confidence >= 0.4) return 'Низкая';
    return 'Очень низкая';
  };

  const renderInput = () => {
    // Селект для предустановленных значений
    if (characteristic.possibleValues && characteristic.possibleValues.length > 0) {
      return (
        <select
          value={editValue || ''}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError('');
          }}
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-black/40 backdrop-blur-md text-white ${
            error 
              ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-400' 
              : 'border-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400'
          } transition-all duration-300`}
        >
          <option value="">Выберите значение</option>
          {characteristic.possibleValues.map((option) => (
            <option key={option.id} value={option.value} className="bg-gray-800">
              {option.displayName || option.value}
            </option>
          ))}
        </select>
      );
    }

    // Числовой инпут
    if (characteristic.type === 'number') {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue || ''}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError('');
          }}
          min={characteristic.minValue}
          max={characteristic.maxValue}
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-black/40 backdrop-blur-md text-white ${
            error 
              ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-400' 
              : 'border-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400'
          } transition-all duration-300`}
          placeholder="Введите число..."
        />
      );
    }

    // Текстовый инпут или textarea
    if (characteristic.maxLength && characteristic.maxLength > 100) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue || ''}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError('');
          }}
          maxLength={characteristic.maxLength}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-black/40 backdrop-blur-md text-white resize-none ${
            error 
              ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-400' 
              : 'border-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400'
          } transition-all duration-300`}
          placeholder="Введите значение..."
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue || ''}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError('');
        }}
        maxLength={characteristic.maxLength}
        className={`w-full px-3 py-2 border rounded-lg text-sm bg-black/40 backdrop-blur-md text-white ${
          error 
            ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/50 focus:border-red-400' 
            : 'border-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400'
        } transition-all duration-300`}
        placeholder="Введите значение..."
      />
    );
  };

  const renderNonEditableReason = () => {
    if (characteristic.category === 'manual_required') {
      return (
        <div className="text-xs text-orange-400 flex items-center gap-1 mt-2">
          <Wrench className="w-3 h-3" />
          Требует ручного измерения/ввода
        </div>
      );
    }
    if (characteristic.category === 'user_protected') {
      return (
        <div className="text-xs text-blue-400 flex items-center gap-1 mt-2">
          <Lock className="w-3 h-3" />
          Защищенные данные пользователя
        </div>
      );
    }
    if (characteristic.category === 'declaration') {
      return (
        <div className="text-xs text-purple-400 flex items-center gap-1 mt-2">
          <FileText className="w-3 h-3" />
          Заполняется отдельно (НДС/декларации)
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-black/30 backdrop-blur-md rounded-lg border p-4 transition-all duration-300 ${categoryInfo.color}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Основная информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Иконка категории */}
            <div className={`${categoryInfo.textColor}`}>
              {categoryInfo.icon}
            </div>

            <h4 className={`font-medium text-sm ${categoryInfo.textColor}`}>
              {characteristic.name}
            </h4>
            
            {/* Бейдж категории */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.badgeColor}`}>
              {categoryInfo.badge}
            </span>
            
            {characteristic.isRequired && (
              <div title="Обязательное поле">
                <Star className="w-3 h-3 text-orange-400" />
              </div>
            )}
            
            {isFilled && (
              <div title="Заполнено">
                <CheckCircle className="w-3 h-3 text-green-400" />
              </div>
            )}
          </div>

          {/* Режим редактирования */}
          {isEditing ? (
            <div className="space-y-3">
              {renderInput()}
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
              
              {characteristic.description && (
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {characteristic.description}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Сохранить
                </button>
                
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Отображение значения */}
              <div className={`text-sm ${
                isFilled ? 'text-white' : 'text-gray-400 italic'
              }`}>
                {characteristic.value || 'Не заполнено'}
              </div>

              {/* Причина, почему не может быть отредактировано */}
              {!isEditable && renderNonEditableReason()}

              {/* Дополнительная информация */}
              {isFilled && characteristic.confidence > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Уверенность ИИ:</span>
                  <span className={getConfidenceColor(characteristic.confidence)}>
                    {getConfidenceText(characteristic.confidence)} ({Math.round(characteristic.confidence * 100)}%)
                  </span>
                </div>
              )}

              {characteristic.reasoning && (
                <div className="text-xs text-gray-400">
                  <span className="font-medium">Обоснование:</span> {characteristic.reasoning}
                </div>
              )}
              
              {characteristic.possibleValues && characteristic.possibleValues.length > 0 && (
                <div className="text-xs text-gray-400">
                  <span className="font-medium">Варианты:</span> {
                    characteristic.possibleValues.slice(0, 3).map(pv => pv.displayName || pv.value).join(', ')
                  }{characteristic.possibleValues.length > 3 ? '...' : ''}
                </div>
              )}

              {/* Информация об источнике */}
              {characteristic.source && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Источник:</span> {
                    characteristic.source === 'ai_analysis' ? 'ИИ анализ' :
                    characteristic.source === 'user_input' ? 'Ввод пользователя' :
                    characteristic.source === 'manual_input_required' ? 'Требует ручного ввода' :
                    characteristic.source === 'declaration_required' ? 'Декларации/НДС' :
                    characteristic.source
                  }
                </div>
              )}
            </div>
          )}
        </div>

        {/* Действия */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            {isEditable && (
              <button
                onClick={onToggleEdit}
                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                title="Редактировать"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            
            {!isEditable && (
              <div
                className="p-1.5 text-gray-600 cursor-not-allowed relative"
                title="Нельзя редактировать"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Settings className="w-4 h-4" />
                {showTooltip && (
                  <div className="absolute z-10 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -mt-8 -ml-20 whitespace-nowrap">
                    Редактирование недоступно для этого типа характеристик
                  </div>
                )}
              </div>
            )}
            
            {showDelete && onDelete && characteristic.category === 'ai_filled' && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Индикатор типа и метаданные */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${
            characteristic.type === 'number' ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'
          }`}>
            {characteristic.type}
          </span>
          
          {characteristic.maxLength && (
            <span>макс. {characteristic.maxLength} симв.</span>
          )}
          
          {characteristic.minValue !== undefined && characteristic.maxValue !== undefined && (
            <span>{characteristic.minValue}-{characteristic.maxValue}</span>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          ID: {characteristic.id}
        </div>
      </div>
    </div>
  );
};

export default EditableCharacteristic;