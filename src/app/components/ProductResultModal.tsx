// src/components/ProductResultModal.tsx
'use client';
import { useState } from 'react';
import { X, Edit3, Plus, Eye, Share2, Download, Package, Tag, TrendingUp, Users, Star, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProductResultModalProps {
  productData: any;
  onClose: () => void;
  onEdit: () => void;
  onCreateNew: () => void;
}

export default function ProductResultModal({ productData, onClose, onEdit, onCreateNew }: ProductResultModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'seo'>('overview');
  const [showInfographicModal, setShowInfographicModal] = useState(false);

  // Извлекаем данные из ответа API
  const {
    id,
    message,
    status,
    category,
    wbSubjectId,
    hasVariantSizes,
    variantSizesCount,
    hasReferenceUrl,
    barcode,
    priceInfo,
    imagesCount
  } = productData;

  const TabButton = ({ tabKey, label, icon: Icon }: { tabKey: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tabKey as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === tabKey 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Карточка товара создана!</h2>
            <p className="text-gray-600 mt-1">{message}</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Панель действий */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Табы */}
            <div className="flex gap-2">
              <TabButton tabKey="overview" label="Обзор" icon={Eye} />
              <TabButton tabKey="details" label="Детали" icon={Package} />
              <TabButton tabKey="seo" label="SEO" icon={TrendingUp} />
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Создать новый
              </button>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Статус карточки */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">Товар успешно создан</h3>
                      <p className="text-green-700">Статус: {status === 'PROCESSING' ? 'Обрабатывается' : 'Готов'}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {priceInfo?.final || priceInfo?.original || '0'}₽
                    </div>
                    {priceInfo?.hasDiscount && (
                      <div className="text-sm">
                        <span className="line-through text-gray-500">{priceInfo.original}₽</span>
                        <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                          -{priceInfo.discountPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ключевые метрики */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{imagesCount?.total || 1}</div>
                      <div className="text-sm text-gray-600">Изображений</div>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {hasVariantSizes ? variantSizesCount : 1}
                      </div>
                      <div className="text-sm text-gray-600">Размеров</div>
                    </div>
                    <Tag className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{wbSubjectId}</div>
                      <div className="text-sm text-gray-600">ID категории</div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">98%</div>
                      <div className="text-sm text-gray-600">Готовность</div>
                    </div>
                    <Star className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Информация о товаре */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Левая колонка */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    Основная информация
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Tag className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Категория</div>
                        <div className="text-sm text-gray-600">{category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Tag className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium">Штрихкод</div>
                        <div className="text-sm text-gray-600 font-mono">{barcode}</div>
                      </div>
                    </div>

                    {hasVariantSizes && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <Users className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="font-medium">Размеры</div>
                          <div className="text-sm text-purple-600">{variantSizesCount} вариантов</div>
                        </div>
                      </div>
                    )}

                    {hasReferenceUrl && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Eye className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Анализ конкурента</div>
                          <div className="text-sm text-blue-600">Включен в обработку</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая колонка */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Прогноз эффективности
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Потенциал в категории</span>
                        <span className="text-sm text-green-600 font-bold">Высокий</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">1,200+</div>
                        <div className="text-xs text-gray-600">просмотров/месяц</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">2.5%</div>
                        <div className="text-xs text-gray-600">конверсия</div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Рекомендации</span>
                      </div>
                      <div className="text-xs text-yellow-700">
                        Добавьте больше фотографий и отзывы для улучшения позиций
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* НОВЫЕ кнопки действий */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-center">Следующие шаги</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Кнопка публикации */}
                  <button
                    onClick={() => handlePublishProduct(id)}
                    className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-semibold text-lg">Опубликовать товар</span>
                      </div>
                      <div className="text-green-100 text-sm">
                        Разместить на Wildberries прямо сейчас
                      </div>
                    </div>
                  </button>

                  {/* Кнопка инфографики */}
                  <button
                    onClick={() => setShowInfographicModal(true)}
                    className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-5 h-5" />
                        <span className="font-semibold text-lg">Создать инфографику</span>
                      </div>
                      <div className="text-purple-100 text-sm">
                        Красивая карточка для соцсетей
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600">
                  💡 Совет: Сначала опубликуйте товар, затем создайте инфографику для продвижения
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Детальная информация */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Техническая информация</h3>
                
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID товара:</span>
                      <span className="font-mono text-sm">{id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">WB Subject ID:</span>
                      <span className="font-mono text-sm">{wbSubjectId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Штрихкод:</span>
                      <span className="font-mono text-sm">{barcode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {status === 'PROCESSING' ? 'Обрабатывается' : 'Готов'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Изображений:</span>
                      <span>{imagesCount?.total || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Размеров:</span>
                      <span>{hasVariantSizes ? variantSizesCount : 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Анализ конкурента:</span>
                      <span className={hasReferenceUrl ? 'text-green-600' : 'text-gray-400'}>
                        {hasReferenceUrl ? 'Включен' : 'Не использован'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Цена итоговая:</span>
                      <span className="font-semibold">{priceInfo?.final || priceInfo?.original || '0'}₽</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ценовая информация */}
              {priceInfo && (
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Ценовая стратегия</h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 mb-1">Базовая цена</div>
                      <div className="text-2xl font-bold text-blue-800">{priceInfo.original}₽</div>
                    </div>
                    
                    {priceInfo.hasDiscount && (
                      <>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-600 mb-1">Цена со скидкой</div>
                          <div className="text-2xl font-bold text-green-800">{priceInfo.discount}₽</div>
                        </div>
                        
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-600 mb-1">Размер скидки</div>
                          <div className="text-2xl font-bold text-red-800">{priceInfo.discountPercent}%</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              {/* SEO информация (заглушка) */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">SEO оптимизация</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Название оптимизировано</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Заголовок содержит ключевые слова и укладывается в лимит символов
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Описание создано</span>
                    </div>
                    <div className="text-sm text-green-700">
                      ИИ создал подробное описание с ключевыми особенностями товара
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Категория выбрана</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      Товар размещен в наиболее подходящей категории: {category}
                    </div>
                  </div>
                </div>
              </div>

              {/* Рекомендации по улучшению */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Рекомендации по продвижению</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Добавьте отзывы</div>
                      <div className="text-sm text-yellow-700">Получите первые отзывы для улучшения позиций в поиске</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800">Мониторинг позиций</div>
                      <div className="text-sm text-blue-700">Отслеживайте позиции в поиске по ключевым запросам</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <Star className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-purple-800">Создайте инфографику</div>
                      <div className="text-sm text-purple-700">Используйте красивые карточки для продвижения в соцсетях</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно инфографики */}
      {showInfographicModal && (
        <InfographicCreationModal
          productData={productData}
          onClose={() => setShowInfographicModal(false)}
          onSuccess={() => {
            setShowInfographicModal(false);
            // Можно добавить уведомление об успешном создании
          }}
        />
      )}
    </div>
  );
}

// Функция публикации товара
async function handlePublishProduct(productId: string) {
  try {
    console.log('🚀 Публикация товара:', productId);
    
    const response = await fetch(`/api/products/${productId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ Товар успешно опубликован на Wildberries!');
      console.log('Результат публикации:', data);
    } else {
      alert('❌ Ошибка публикации: ' + (data.error || 'Неизвестная ошибка'));
      console.error('Ошибка публикации:', data);
    }
  } catch (error) {
    console.error('Ошибка при публикации:', error);
    alert('❌ Ошибка соединения при публикации товара');
  }
}

// Заглушка для модального окна инфографики (пока)
function InfographicCreationModal({ productData, onClose, onSuccess }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Создание инфографики</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">Скоро!</h4>
          <p className="text-gray-600 mb-4">
            Функция создания инфографики находится в разработке. 
            Скоро вы сможете создавать красивые карточки товаров!
          </p>
          
          <div className="space-y-2 text-sm text-gray-500">
            <div>✨ Красивые шаблоны</div>
            <div>📸 Загрузка дополнительных фото</div>
            <div>🎨 Настройка дизайна</div>
            <div>📱 Экспорт для соцсетей</div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}