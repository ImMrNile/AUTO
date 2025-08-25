// src/app/components/InfographicCreator.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ

import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon,
  Upload,
  Sparkles,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  Camera,
  Zap,
  Star,
  TrendingUp,
  Palette
} from 'lucide-react';

interface InfographicCreatorProps {
  productId: string;
  productName: string;
  mainProductImage: string;
  isVisible: boolean;
  onClose: () => void;
}

interface InfographicImage {
  id: string;
  url: string;
  type: 'main' | 'angle' | 'detail' | 'comparison';
  focus: string;
  quality: {
    textAccuracy: number;
    visualAppeal: number;
    brandConsistency: number;
    productPreservation: number;
    overallScore: number;
  };
  productImageUsed: string;
}

interface CreationStats {
  totalImages: number;
  processingTime: number;
  qualityScore: number;
  inputImages: {
    productPhotos: number;
    competitorReferences: number;
  };
}

export default function InfographicCreator({ 
  productId, 
  productName, 
  mainProductImage,
  isVisible, 
  onClose 
}: InfographicCreatorProps) {
  // Состояния
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Входные данные
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [brandColors, setBrandColors] = useState('#2563eb,#ffffff,#f3f4f6');
  
  // Результаты
  const [createdInfographics, setCreatedInfographics] = useState<InfographicImage[]>([]);
  const [creationStats, setCreationStats] = useState<CreationStats | null>(null);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [existingInfographics, setExistingInfographics] = useState<InfographicImage[]>([]);

  useEffect(() => {
    if (isVisible && productId) {
      checkExistingInfographics();
    }
  }, [isVisible, productId]);

  const checkExistingInfographics = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/infographic`);
      const data = await response.json();
      
      if (data.success && data.hasInfographics) {
        setExistingInfographics(data.data.infographics);
        setCreationStats({
          totalImages: data.data.stats.totalCount,
          processingTime: data.data.stats.processingTime,
          qualityScore: data.data.stats.qualityScore,
          inputImages: { productPhotos: 0, competitorReferences: 0 }
        });
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Ошибка загрузки существующих инфографик:', error);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    const totalImages = 1 + additionalImages.length + files.length;
    if (totalImages > 10) {
      setError('Максимум можно загрузить 9 дополнительных изображений');
      return;
    }
    
    // Валидация файлов
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Все файлы должны быть изображениями (JPEG, PNG, WebP)');
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        setError('Размер каждого файла не должен превышать 10MB');
        return;
      }
    }

    const newImages = [...additionalImages, ...files];
    setAdditionalImages(newImages);
    setError('');
    
    // Создаем превью
    const newPreviews = [...additionalImagePreviews];
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === additionalImagePreviews.length + files.length) {
          setAdditionalImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalImage = (index: number) => {
    const newImages = additionalImages.filter((_, i) => i !== index);
    const newPreviews = additionalImagePreviews.filter((_, i) => i !== index);
    setAdditionalImages(newImages);
    setAdditionalImagePreviews(newPreviews);
  };



// ИСПРАВЛЕННАЯ функция startInfographicCreation - НЕ переходим сразу к шагу 3

const startInfographicCreation = async () => {
  console.log('🚀 Начинаем создание инфографики...');
  
  // ПРОВЕРЯЕМ, что пользователь загрузил файлы
  if (additionalImages.length === 0) {
    setError('Загрузите хотя бы одно дополнительное изображение товара');
    return;
  }

  setIsCreating(true);
  setCreationProgress(0);
  setError('');
  // ИСПРАВЛЕНО: НЕ переходим автоматически к шагу 3
  // setCurrentStep(3); // УБРАЛИ ЭТУ СТРОКУ

  try {
    console.log('📋 Подготавливаем FormData...');
    
    // Создаем FormData и проверяем файлы
    const formData = new FormData();
    
    // Добавляем файлы
    additionalImages.forEach((file, index) => {
      console.log(`📸 Добавляем файл ${index}: ${file.name} (${file.size} bytes, type: ${file.type})`);
      formData.append(`additionalImage${index}`, file, file.name);
    });
    
    // Добавляем текстовые параметры
    formData.append('additionalImagesCount', additionalImages.length.toString());
    formData.append('competitorUrls', competitorUrls.trim());
    formData.append('brandColors', brandColors.trim());
    
    // Логируем содержимое FormData
    console.log('📊 FormData содержит:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`- ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`- ${key}: "${value}"`);
      }
    }
    
    // Валидация данных
    if (!productId) {
      throw new Error('productId отсутствует');
    }

    // ПЕРЕХОДИМ К ШАГУ 3 ТОЛЬКО СЕЙЧАС
    setCurrentStep(3);

    // Симулируем прогресс
    const progressInterval = setInterval(() => {
      setCreationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 2000);

    console.log('🌐 Отправляем запрос на сервер...');
    console.log(`📍 URL: /api/products/${productId}/infographic`);

    const requestOptions: RequestInit = {
      method: 'POST',
      body: formData
    };

    console.log('🔧 Параметры запроса:', {
      method: requestOptions.method,
      bodyType: requestOptions.body?.constructor.name,
      bodySize: formData.entries ? Array.from(formData.entries()).length : 'unknown'
    });

    const response = await fetch(`/api/products/${productId}/infographic`, requestOptions);

    clearInterval(progressInterval);

    // Подробное логирование ответа
    console.log('📨 Ответ сервера:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Читаем ответ
    const responseText = await response.text();
    console.log('📄 Тело ответа (первые 500 символов):', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('❌ HTTP ошибка:', response.status, response.statusText);
      console.error('❌ Полный ответ:', responseText);
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    // Парсим JSON
    let data: any;
    try {
      data = JSON.parse(responseText);
      console.log('✅ JSON успешно распарсен:', {
        success: data.success,
        hasData: !!data.data,
        hasError: !!data.error
      });
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
      console.error('❌ Проблемный текст:', responseText);
      throw new Error(`Ошибка парсинга JSON: ${parseError instanceof Error ? parseError.message : 'Неизвестная ошибка'}`);
    }

    // Обрабатываем ответ
    if (data.success) {
      setCreationProgress(100);
      setCreatedInfographics(data.data?.infographics || []);
      setCreationStats(data.data?.stats || null);
      setAgentLogs(data.data?.agentLogs || []);
      
      const infographicsCount = data.data?.infographics?.length || 0;
      const qualityScore = data.data?.stats?.qualityScore || 0;
      
      setSuccess(`✅ Создано ${infographicsCount} инфографик! Качество: ${Math.round(qualityScore * 100)}%`);
      setCurrentStep(4); // Переходим к результатам

      console.log('🎉 Инфографика создана успешно!');
      console.log(`📊 Создано: ${infographicsCount} изображений`);
      console.log(`🎯 Качество: ${Math.round(qualityScore * 100)}%`);
    } else {
      console.error('❌ Сервер вернул ошибку:', data);
      throw new Error(data.error || 'Неизвестная ошибка сервера');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка создания инфографики:', error);
    setCreationProgress(0);
    
    let errorMessage = 'Неизвестная ошибка создания инфографики';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('❌ Stack trace:', error.stack);
    }
    
    // Специальная обработка ошибок сети
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = 'Ошибка сети. Проверьте подключение к интернету и перезагрузите страницу.';
    }
    
    setError(`Ошибка: ${errorMessage}`);
  } finally {
    setIsCreating(false);
  }
};
const downloadInfographic = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      setError('Ошибка скачивания изображения');
    }
  };

  const resetCreator = () => {
    setCurrentStep(1);
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setCompetitorUrls('');
    setBrandColors('#2563eb,#ffffff,#f3f4f6');
    setCreatedInfographics([]);
    setExistingInfographics([]);
    setCreationStats(null);
    setAgentLogs([]);
    setError('');
    setSuccess('');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">ИИ Создание инфографики</h2>
              <p className="text-sm text-gray-600">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Индикатор прогресса */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step === 1 && <Upload className="w-4 h-4" />}
                  {step === 2 && <Palette className="w-4 h-4" />}
                  {step === 3 && <Zap className="w-4 h-4" />}
                  {step === 4 && <Eye className="w-4 h-4" />}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step < currentStep ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">
            {currentStep === 1 && 'Загрузка изображений'}
            {currentStep === 2 && 'Дополнительные настройки'}
            {currentStep === 3 && 'ИИ создает инфографику'}
            {currentStep === 4 && 'Результаты'}
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          {/* Сообщения об ошибках и успехе */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Ошибка:</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Успех:</span>
              </div>
              <p className="text-green-600 mt-1">{success}</p>
            </div>
          )}

         {/* ШАГ 1: Загрузка изображений */}
{currentStep === 1 && (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Загрузите изображения товара</h3>
      <p className="text-gray-600">ИИ будет использовать эти фото для создания инфографики</p>
    </div>

    {/* Основное фото товара */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Основное фото товара (уже загружено)
      </h4>
      <div className="w-32 h-32 border rounded-lg overflow-hidden bg-white mx-auto">
        {mainProductImage ? (
          <img src={mainProductImage} alt="Основное фото" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
            Нет изображения
          </div>
        )}
      </div>
    </div>

    {/* Загрузка дополнительных изображений */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Дополнительные фото товара *
        <span className="text-xs text-gray-500 block">Загрузите 1-9 дополнительных фото товара для создания инфографики</span>
      </label>
      
      <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50">
        <div className="text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAdditionalImagesChange}
            className="hidden"
            id="additionalImages"
          />
          <label
            htmlFor="additionalImages"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-purple-500 mb-4" />
            <span className="text-lg font-medium text-purple-700 mb-2">
              Загрузить фото товара
            </span>
            <span className="text-sm text-purple-600">
              Нажмите или перетащите изображения сюда
            </span>
            <span className="text-xs text-purple-500 mt-2">
              Поддерживаются: JPEG, PNG, WebP (до 5MB каждое)
            </span>
          </label>
        </div>
        
        <div className="text-xs text-purple-600 mt-3 text-center">
          💡 Дополнительные фото помогут ИИ лучше проанализировать товар
        </div>
      </div>

      {/* Превью загруженных изображений */}
      {additionalImagePreviews.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Загружено изображений: {additionalImagePreviews.length}/9
            </span>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {additionalImagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square border rounded-lg overflow-hidden bg-gray-50">
                  <img 
                    src={preview} 
                    alt={`Дополнительное фото ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => removeAdditionalImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
                
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Информация о том, что будет создано */}
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border">
      <h4 className="font-medium text-gray-800 mb-2">ИИ создаст инфографику используя:</h4>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• Основное фото товара (для анализа продукта)</li>
        <li>• {additionalImagePreviews.length} дополнительных фото (для создания инфографики)</li>
        <li>• Характеристики товара из ИИ-анализа</li>
        <li>• Профессиональные шаблоны дизайна</li>
      </ul>
      {additionalImagePreviews.length > 0 && (
        <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-700">
          ✅ Готово! ИИ создаст {additionalImagePreviews.length} уникальных инфографик
        </div>
      )}
      {additionalImagePreviews.length === 0 && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-700">
          ⚠️ Загрузите хотя бы одно дополнительное изображение для продолжения
        </div>
      )}
    </div>
  </div>
)}
          {/* ШАГ 2: Дополнительные настройки */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Дополнительные настройки</h3>
                <p className="text-gray-600">Настройте стиль инфографики (необязательно)</p>
              </div>

              {/* Цвета бренда */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цвета бренда
                  <span className="text-xs text-gray-500 block">Через запятую в формате HEX: #2563eb,#ffffff,#f3f4f6</span>
                </label>
                <input
                  type="text"
                  value={brandColors}
                  onChange={(e) => setBrandColors(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="#2563eb,#ffffff,#f3f4f6"
                />
                <div className="mt-2 flex gap-2">
                  {brandColors.split(',').slice(0, 5).map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: color.trim() }}
                      title={color.trim()}
                    />
                  ))}
                </div>
              </div>

              {/* URL конкурентов */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ссылки на товары конкурентов (необязательно)
                  <span className="text-xs text-gray-500 block">ИИ проанализирует конкурентов для создания лучшей инфографики</span>
                </label>
                <textarea
                  value={competitorUrls}
                  onChange={(e) => setCompetitorUrls(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://www.wildberries.ru/catalog/123456/detail.aspx"
                />
              </div>

              {/* Итоговые настройки */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Итоговые параметры:</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Инфографик будет создано:</span>
                    <span className="font-medium">{additionalImages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Цветовая схема:</span>
                    <span className="font-medium">{brandColors.split(',').length} цветов</span>
                  </div>
                  <div className="flex justify-between">
                    <span>URL для анализа:</span>
                    <span className="font-medium">{competitorUrls.split('\n').filter(url => url.trim()).length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ШАГ 3: Процесс создания */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  {isCreating ? (
                    <Loader className="w-10 h-10 text-purple-600 animate-spin" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-purple-600" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {isCreating ? 'ИИ создает инфографику...' : 'Готов к созданию'}
                </h3>
                <p className="text-gray-600">
                  {isCreating 
                    ? 'ИИ анализирует ваши фото и создает профессиональную инфографику'
                    : 'Нажмите кнопку ниже для запуска процесса'
                  }
                </p>
              </div>

              {/* Прогресс-бар */}
              {isCreating && (
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Прогресс создания</span>
                    <span className="text-sm text-gray-500">{Math.round(creationProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${creationProgress}%` }}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600">
                      {creationProgress < 25 && '🤖 ИИ анализирует загруженные изображения...'}
                      {creationProgress >= 25 && creationProgress < 50 && '🎨 Создание дизайна инфографики...'}
                      {creationProgress >= 50 && creationProgress < 75 && '✨ Генерация инфографики с помощью DALL-E...'}
                      {creationProgress >= 75 && creationProgress < 95 && '🔍 Проверка качества и оптимизация...'}
                      {creationProgress >= 95 && '📝 Финальная обработка...'}
                    </div>
                  </div>
                </div>
              )}

              {/* Краткая статистика */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Что создает ИИ:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>{additionalImages.length} инфографик</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span>Брендовый дизайн</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>Размер 1024×1792px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-600" />
                    <span>ИИ оптимизация</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ШАГ 4: Результаты */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">🎉 Инфографика готова!</h3>
                <p className="text-gray-600">ИИ создал профессиональную инфографику из ваших фото</p>
              </div>

              {/* Статистика */}
              {creationStats && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Статистика создания
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{creationStats.totalImages}</div>
                      <div className="text-xs text-gray-600">Изображений</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{Math.round(creationStats.qualityScore * 100)}%</div>
                      <div className="text-xs text-gray-600">Качество</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{Math.round(creationStats.processingTime / 1000)}с</div>
                      <div className="text-xs text-gray-600">Время</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{creationStats.inputImages.productPhotos}</div>
                      <div className="text-xs text-gray-600">Исходных фото</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Галерея инфографик */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Созданные инфографики</h4>
                {(createdInfographics.length > 0 || existingInfographics.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(createdInfographics.length > 0 ? createdInfographics : existingInfographics).map((infographic, index) => (
                      <div key={infographic.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="aspect-[3/4] bg-gray-100">
                          <img 
                            src={infographic.url} 
                            alt={`Инфографика ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-800 capitalize">
                              {infographic.type === 'main' && '🎯 Основная'}
                              {infographic.type === 'angle' && '📐 Ракурс'}
                              {infographic.type === 'detail' && '🔍 Детали'}
                              {infographic.type === 'comparison' && '⚖️ Сравнение'}
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              {Math.round(infographic.quality.overallScore * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">{infographic.focus}</p>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => window.open(infographic.url, '_blank')}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              Просмотр
                            </button>
                            <button
                              onClick={() => downloadInfographic(infographic.url, `infographic_${infographic.type}_${index + 1}.png`)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Скачать
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-800 mb-2">Инфографики не найдены</h4>
                    <p className="text-gray-600">Попробуйте создать инфографику заново</p>
                  </div>
                )}
              </div>

              {/* Логи агентов (для отладки) */}
              {agentLogs.length > 0 && (
                <details className="bg-gray-50 rounded-lg border">
                  <summary className="p-4 cursor-pointer font-medium text-gray-800">
                    Детали работы ИИ ({agentLogs.length} записей)
                  </summary>
                  <div className="px-4 pb-4 max-h-60 overflow-y-auto">
                    {agentLogs.map((log, index) => (
                      <div key={index} className="text-xs py-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-mono text-gray-500">{log.agentName}</span>
                        <span className="text-gray-700">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Футер с кнопками */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && currentStep < 4 && !isCreating && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Назад
              </button>
            )}
            
            {currentStep === 4 && (
              <button
                onClick={resetCreator}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Создать заново
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Закрыть
            </button>
            
            {currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(2)}
                disabled={additionalImages.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Далее
              </button>
            )}
            
            {currentStep === 2 && (
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Продолжить
              </button>
            )}
            
            {currentStep === 3 && !isCreating && (
              <button
                onClick={startInfographicCreation}
                disabled={additionalImages.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Создать инфографику
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}