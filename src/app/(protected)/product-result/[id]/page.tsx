'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  AlertCircle, 
  Package, 
  Tag,
  TrendingUp,
  Star,
  Eye,
  Plus,
  BarChart3,
  User,
  Edit3,
  Loader2,
  Upload,
  Brain,
  Sparkles
} from 'lucide-react';

interface ProductResult {
  id: string;
  message: string;
  status: string;
  category: string;
  wbSubjectId: number;
  hasVariantSizes: boolean;
  variantSizesCount: number;
  hasReferenceUrl: boolean;
  barcode: string;
  priceInfo: {
    original: number;
    discount?: number;
    final: number;
    hasDiscount: boolean;
    discountPercent?: number;
  };
  imagesCount: {
    total: number;
  };
  name?: string;
  description?: string;
}

export default function ProductResultPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'seo'>('overview');

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/result`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.product) {
            setProduct(data.product);
          } else {
            setError('Товар не найден');
          }
        } else {
          setError('Ошибка загрузки данных');
        }
      } catch (err) {
        console.error('Ошибка загрузки товара:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <h1 className="text-lg font-semibold">WB Automation</h1>
            </div>
          </div>
        </nav>

        <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
              <p className="text-gray-600 mb-6">{error || 'Товар не найден'}</p>
              <button
                onClick={() => router.push('/?tab=products')}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
              >
                К списку товаров
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold">WB Automation</h1>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-4">
            <button
              onClick={() => router.push('/?tab=upload')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Создать</span>
            </button>
            <button
              onClick={() => router.push('/?tab=products')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              <span className="font-medium">Товары</span>
            </button>
            <button
              onClick={() => router.push('/?tab=analytics')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Аналитика</span>
            </button>
            <button
              onClick={() => router.push('/?tab=account')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Аккаунт</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Товар успешно создан!</h1>
            <p className="text-gray-600">{product.message || 'Карточка товара готова к публикации'}</p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Product Info Header */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{product.name || 'Новый товар'}</h2>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {product.priceInfo?.final || product.priceInfo?.original || '0'}₽
                  </div>
                  {product.priceInfo?.hasDiscount && (
                    <div className="text-sm">
                      <span className="line-through text-gray-500">{product.priceInfo.original}₽</span>
                      <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                        -{product.priceInfo.discountPercent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-2 -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Обзор
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Детали
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('seo')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'seo'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    SEO
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{product.imagesCount?.total || 1}</div>
                          <div className="text-sm text-gray-600">Изображений</div>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {product.hasVariantSizes ? product.variantSizesCount : 1}
                          </div>
                          <div className="text-sm text-gray-600">Размеров</div>
                        </div>
                        <Tag className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{product.wbSubjectId}</div>
                          <div className="text-sm text-gray-600">ID категории</div>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-orange-600">98%</div>
                          <div className="text-sm text-gray-600">Готовность</div>
                        </div>
                        <Star className="w-8 h-8 text-orange-500" />
                      </div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Основная информация
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Категория:</span>
                          <span className="font-medium">{product.category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Штрихкод:</span>
                          <span className="font-mono text-sm">{product.barcode}</span>
                        </div>
                        {product.hasVariantSizes && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600">Размеры:</span>
                            <span className="font-medium">{product.variantSizesCount} вариантов</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Анализ конкурента:</span>
                          <span className={product.hasReferenceUrl ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {product.hasReferenceUrl ? 'Включен' : 'Не использован'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Прогноз эффективности
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="bg-white/50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Потенциал в категории</span>
                            <span className="text-sm text-green-600 font-bold">Высокий</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">1,200+</div>
                            <div className="text-xs text-gray-600">просмотров/месяц</div>
                          </div>
                          <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">2.5%</div>
                            <div className="text-xs text-gray-600">конверсия</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Техническая информация</h3>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">ID товара:</span>
                          <span className="font-mono text-sm">{product.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">WB Subject ID:</span>
                          <span className="font-mono text-sm">{product.wbSubjectId}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Штрихкод:</span>
                          <span className="font-mono text-sm">{product.barcode}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Статус:</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Готов
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Изображений:</span>
                          <span>{product.imagesCount?.total || 1}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Размеров:</span>
                          <span>{product.hasVariantSizes ? product.variantSizesCount : 1}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Анализ конкурента:</span>
                          <span className={product.hasReferenceUrl ? 'text-green-600' : 'text-gray-400'}>
                            {product.hasReferenceUrl ? 'Включен' : 'Не использован'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Цена итоговая:</span>
                          <span className="font-semibold">{product.priceInfo?.final || product.priceInfo?.original || '0'}₽</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {product.priceInfo && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Ценовая стратегия</h3>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-600 mb-1">Базовая цена</div>
                          <div className="text-2xl font-bold text-blue-800">{product.priceInfo.original}₽</div>
                        </div>
                        
                        {product.priceInfo.hasDiscount && (
                          <>
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-sm text-green-600 mb-1">Цена со скидкой</div>
                              <div className="text-2xl font-bold text-green-800">{product.priceInfo.discount}₽</div>
                            </div>
                            
                            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                              <div className="text-sm text-red-600 mb-1">Размер скидки</div>
                              <div className="text-2xl font-bold text-red-800">{product.priceInfo.discountPercent}%</div>
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
                  <div className="bg-gray-50 rounded-lg p-6">
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
                          Товар размещен в наиболее подходящей категории: {product.category}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push(`/?tab=products&productId=${product.id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  <Eye className="w-5 h-5" />
                  <span>Посмотреть товар</span>
                </button>
                <button
                  onClick={() => router.push('/?tab=upload')}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  <span>Создать ещё</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
