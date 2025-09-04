// src/components/ProductList.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Eye, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Zap,
  Tag,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  generatedName?: string;
  price: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'PUBLISHING' | 'PUBLISHED' | 'ERROR';
  originalImage?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  errorMessage?: string;
  categoryDisplay?: string;
  wbSubjectId?: number;
  
  // ИИ анализ
  aiAnalysis?: {
    confidence: number;
    characteristicsCount: number;
    warnings: string[];
    keywords: string[];
    tnvedCode?: string;
    hasCompetitorAnalysis: boolean;
  };
  
  // Информация о публикации
  publishInfo?: {
    userVendorCode?: string;
    barcode?: string;
    autoPublish?: boolean;
    taskId?: string;
    realWbSubjectId?: number;
    deliveryType?: string;
  };
  
  // Ценовая информация
  priceInfo?: {
    original?: number;
    discount?: number;
    final: number;
    hasDiscount: boolean;
    discountPercent?: number;
  };
  
  // Информация об изображениях
  imageInfo?: {
    mainImage?: string;
    additionalImages: string[];
    totalImages: number;
  };
  
  // Информация о размерах
  sizingInfo?: {
    hasVariantSizes: boolean;
    variantSizes: string[];
    sizesCreated: number;
    uniqueBarcodes: string[];
  };
  
  comments?: string;
}

interface ProductListProps {
  onUpdate?: () => void;
}

export default function ProductList({ onUpdate }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/products?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
      } else {
        setError(data.error || 'Ошибка загрузки товаров');
      }
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        onUpdate?.();
        alert('Товар успешно удален');
      } else {
        alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      alert('Ошибка соединения при удалении товара');
    }
  };

  const handlePublish = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/publish`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Товар успешно опубликован на Wildberries!');
        loadProducts();
        onUpdate?.();
      } else {
        alert('❌ Ошибка публикации: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка публикации товара:', error);
      alert('❌ Ошибка соединения при публикации товара');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'PROCESSING':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'READY':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PUBLISHING':
        return <Upload className="w-4 h-4 text-orange-500" />;
      case 'PUBLISHED':
        return <Zap className="w-4 h-4 text-green-600" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Ожидает';
      case 'PROCESSING': return 'Обрабатывается';
      case 'READY': return 'Готов';
      case 'PUBLISHING': return 'Публикуется';
      case 'PUBLISHED': return 'Опубликован';
      case 'ERROR': return 'Ошибка';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'READY': return 'bg-green-100 text-green-800';
      case 'PUBLISHING': return 'bg-orange-100 text-orange-800';
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (product.generatedName?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-400 mr-3" />
        <span className="text-lg text-slate-300">Загрузка товаров...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#261a1a] border border-red-900/40 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-200">Ошибка загрузки</h3>
            <p className="text-red-300 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadProducts}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Фильтры и поиск */}
      <div className="rounded-lg border border-slate-700 bg-[#121a2b] shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Поиск */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-[#0f1729] text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Фильтры */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-700 bg-[#0f1729] text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все статусы</option>
                <option value="PENDING">Ожидает</option>
                <option value="PROCESSING">Обрабатывается</option>
                <option value="READY">Готов</option>
                <option value="PUBLISHING">Публикуется</option>
                <option value="PUBLISHED">Опубликован</option>
                <option value="ERROR">Ошибка</option>
              </select>
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="border border-slate-700 bg-[#0f1729] text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt-desc">Сначала новые</option>
              <option value="createdAt-asc">Сначала старые</option>
              <option value="name-asc">По названию А-Я</option>
              <option value="name-desc">По названию Я-А</option>
              <option value="status-asc">По статусу</option>
            </select>

            <button
              onClick={loadProducts}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Список товаров */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {products.length === 0 ? 'У вас пока нет товаров' : 'Товары не найдены'}
          </h3>
          <p className="text-gray-500">
            {products.length === 0 
              ? 'Создайте первый товар, используя форму загрузки'
              : 'Попробуйте изменить параметры поиска'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="rounded-lg border border-slate-700 bg-[#121a2b] hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  {/* Основная информация */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Изображение */}
                    <div className="w-16 h-16 bg-[#0f1729] rounded-lg overflow-hidden flex-shrink-0">
                      {product.originalImage || product.imageInfo?.mainImage ? (
                        <img
                          src={product.originalImage || product.imageInfo?.mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Детали товара */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-100 truncate">
                          {product.generatedName || product.name}
                        </h3>
                        
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                          {getStatusIcon(product.status)}
                          {getStatusText(product.status)}
                        </div>
                      </div>

                      {product.generatedName && product.generatedName !== product.name && (
                        <p className="text-sm text-slate-300 mb-2">
                          Оригинальное название: {product.name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(product.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                        
                        {product.categoryDisplay && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {product.categoryDisplay}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {product.priceInfo?.final || product.price} ₽
                          {product.priceInfo?.hasDiscount && (
                            <span className="text-green-400 font-medium">
                              (-{product.priceInfo.discountPercent}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Дополнительная информация */}
                      <div className="flex flex-wrap gap-2">
                        {product.aiAnalysis && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            Характеристик: {product.aiAnalysis.characteristicsCount}
                          </span>
                        )}
                        
                        {product.imageInfo && product.imageInfo.totalImages > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            Фото: {product.imageInfo.totalImages}
                          </span>
                        )}
                        
                        {product.sizingInfo?.hasVariantSizes && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                            Размеров: {product.sizingInfo.variantSizes.length}
                          </span>
                        )}
                        
                        {product.publishInfo?.userVendorCode && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono">
                            {product.publishInfo.userVendorCode}
                          </span>
                        )}
                      </div>

                      {/* Ошибка */}
                      {product.status === 'ERROR' && product.errorMessage && (
                        <div className="mt-3 p-3 bg-[#261a1a] border border-red-900/40 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-200">Ошибка:</span>
                          </div>
                          <p className="text-sm text-red-300 mt-1">{product.errorMessage}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center gap-2 ml-4">
                    {product.status === 'READY' && (
                      <button
                        onClick={() => handlePublish(product.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Опубликовать
                      </button>
                    )}
                    
                    <button
                      onClick={() => window.open(`/products/${product.id}`, '_blank')}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Просмотр
                    </button>
                    
                    <div className="relative group">
                      <button className="flex items-center gap-1 px-3 py-2 bg-slate-700 text-slate-100 rounded-lg hover:bg-slate-600 transition-colors text-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {/* Выпадающее меню */}
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[#121a2b] border border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => window.open(`/products/${product.id}/edit`, '_blank')}
                          className="w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-[#0f1729] flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Редактировать
                        </button>
                        
                        {product.publishInfo?.taskId && (
                          <button
                            onClick={() => window.open(`https://seller.wildberries.ru/`, '_blank')}
                            className="w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-[#0f1729] flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Открыть в WB
                          </button>
                        )}
                        
                        <hr className="my-1" />
                        
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#261a1a] flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Статистика */}
      <div className="rounded-lg border border-slate-700 bg-[#121a2b] shadow-sm p-6">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            Показано {filteredProducts.length} из {products.length} товаров
          </span>
          
          <div className="flex items-center gap-4">
            <span>Готовых к публикации: {products.filter(p => p.status === 'READY').length}</span>
            <span>Опубликованных: {products.filter(p => p.status === 'PUBLISHED').length}</span>
          </div>
        </div>
      </div>

      {/* Мобильная панель действий снизу */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 border-t border-slate-700 bg-[#0f1729]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f1729]/70">
        <div className="max-w-screen-md mx-auto grid grid-cols-3 gap-2 p-2">
          <button onClick={loadProducts} className="btn btn--primary w-full justify-center">Обновить</button>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn w-full justify-center">Вверх</button>
          <button onClick={() => setStatusFilter('READY')} className="btn w-full justify-center">Готовые</button>
        </div>
      </div>
    </div>
  );
}