// src/app/components/ProductFinancialDetails.tsx - Детальная финансовая аналитика товара

'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Package, Truck, Warehouse, FileText, AlertCircle, RefreshCw, Edit2, Check, XCircle, BarChart3, Percent, Eye, ShoppingCart, Building2 } from 'lucide-react';

interface ProductFinancialDetailsProps {
  nmId: number;
  onClose: () => void;
}

interface FinancialData {
  taxRate: number; // Налоговая ставка
  product: {
    nmId: number;
    name: string;
    vendorCode?: string;
    category: string;
    parentCategory?: string;
    price: number;
    originalPrice: number;
    costPrice?: number;
    deliveryType: string;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      weight?: number;
    };
    stock?: number;
    reserved?: number;
  };
  conversion?: {
    views: number;
    addToCart: number;
    orders: number;
    ctr: number;
    conversionRate: number;
  };
  warehouses?: Array<{
    id: string;
    name: string;
    type: string;
    stock: number;
  }>;
  financialAnalysis: {
    productPrice: number;
    productPricePercent: number;
    wbExpenses: {
      total: number;
      totalPercent: number;
      commission: {
        amount: number;
        percent: number;
        rate: number;
      };
      logistics: {
        total: number;
        totalPercent: number;
        toClient: {
          amount: number;
          percent: number;
        };
        fromClient: {
          amount: number;
          percent: number;
        };
      };
      storage: {
        amount: number;
        percent: number;
        days?: number;
      };
      acceptance: {
        amount: number;
        percent: number;
      };
    };
    toTransfer: {
      amount: number;
      percent: number;
    };
    sellerExpenses: {
      total: number;
      totalPercent: number;
      taxes: {
        amount: number;
        percent: number;
        rate: number;
      };
      costPrice: {
        amount: number;
        percent: number;
      };
      advertising: {
        amount: number;
        percent: number;
      };
      other: {
        amount: number;
        percent: number;
      };
    };
    totalExpenses: {
      amount: number;
      percent: number;
    };
    profit: {
      amount: number;
      percent: number;
    };
    deliveryType: string;
    category: string;
  };
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
  };
}

export default function ProductFinancialDetails({ nmId, onClose }: ProductFinancialDetailsProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для редактирования
  const [editingCost, setEditingCost] = useState(false);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [editingTax, setEditingTax] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(6);
  const [editingPrice, setEditingPrice] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discountPrice, setDiscountPrice] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  
  // Состояния для закрепления цены
  const [priceLocked, setPriceLocked] = useState(false);
  const [lockingPrice, setLockingPrice] = useState(false);
  
  // Состояния для конверсии и остатков
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    loadFinancialData();
  }, [nmId]);

  // Убрали автоскролл - он мешал при просмотре

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Добавляем timestamp для обхода кеша браузера и Next.js
      const timestamp = Date.now();
      const response = await fetch(`/api/analytics/product-details?nmId=${nmId}&t=${timestamp}`, {
        cache: 'no-store', // Отключаем кеширование Next.js
        headers: {
          'Cache-Control': 'no-cache' // Отключаем кеш браузера
        }
      });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки данных');
      }
      
      setData(result);
      console.log('📊 Загружены данные:', {
        price: result.product.price,
        costPrice: result.product.costPrice,
        taxRate: result.taxRate,
        hasConversion: !!result.conversion,
        hasWarehouses: !!result.warehouses
      });
      
      // Загружаем конверсию и остатки параллельно
      loadConversionData();
      loadWarehousesData();
    } catch (err) {
      console.error('❌ Ошибка загрузки финансовой аналитики:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number | null | undefined) => {
    if (percent === null || percent === undefined || isNaN(percent)) {
      return '0.00 %';
    }
    return `${percent.toFixed(2)} %`;
  };

  const loadConversionData = async () => {
    try {
      setLoadingConversion(true);
      console.log('📊 Загрузка данных конверсии для товара:', nmId);
      
      const response = await fetch(`/api/analytics/conversion?nmIds=${nmId}&days=30`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки конверсии');
      }
      
      const result = await response.json();
      console.log('✅ Данные конверсии загружены:', result);
      
      if (result.success && result.data) {
        setData(prev => prev ? {
          ...prev,
          conversion: {
            views: result.data.totalViews || 0,
            addToCart: result.data.addToCart || 0,
            orders: result.data.totalOrders || 0,
            ctr: result.data.addToCartRate || 0,
            conversionRate: result.data.purchaseRate || 0
          }
        } : null);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки конверсии:', err);
    } finally {
      setLoadingConversion(false);
    }
  };

  const loadWarehousesData = async () => {
    try {
      setLoadingWarehouses(true);
      console.log('📦 Загрузка остатков по складам для товара:', nmId);
      
      const response = await fetch(`/api/products/${nmId}/stock`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки остатков');
      }
      
      const result = await response.json();
      console.log('✅ Остатки по складам загружены:', result);
      
      if (result.wbStocks) {
        setData(prev => prev ? {
          ...prev,
          warehouses: result.wbStocks
        } : null);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки остатков:', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const saveCostPrice = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/products/${nmId}/update-cost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPrice })
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения');
      }

      setEditingCost(false);
      // Перезагружаем данные
      await loadFinancialData();
    } catch (err) {
      console.error('❌ Ошибка сохранения себестоимости:', err);
      alert('Ошибка сохранения себестоимости');
    } finally {
      setSaving(false);
    }
  };

  const savePrice = async () => {
    try {
      setSaving(true);
      console.log(`💰 Сохранение цены: оригинальная ${originalPrice}₽, скидка ${discountPrice}₽`);
      
      const response = await fetch(`/api/products/${nmId}/update-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalPrice: originalPrice,
          discountPrice: discountPrice 
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка сохранения');
      }

      console.log('✅ Цена успешно сохранена:', result);
      
      // Показываем результат синхронизации с WB
      if (result.data?.wbSync) {
        if (result.data.wbSync.success) {
          alert('✅ Цена успешно обновлена и синхронизирована с Wildberries!');
        } else {
          alert(`⚠️ Цена обновлена в БД, но не удалось синхронизировать с WB: ${result.data.wbSync.error}`);
        }
      } else {
        alert('✅ Цена успешно обновлена!');
      }

      setEditingPrice(false);
      // Перезагружаем данные
      await loadFinancialData();
    } catch (err) {
      console.error('❌ Ошибка сохранения цены:', err);
      alert(`Ошибка сохранения цены: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePriceLock = async () => {
    try {
      setLockingPrice(true);
      const newLockState = !priceLocked;
      const currentPrice = data?.product.price || 0;
      
      console.log(`🔒 ${newLockState ? 'Закрепление' : 'Снятие закрепления'} цены: ${currentPrice}₽`);
      
      const response = await fetch(`/api/products/${nmId}/price-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          locked: newLockState,
          price: newLockState ? currentPrice : null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка изменения закрепления');
      }

      console.log('✅ Закрепление цены изменено:', result);
      setPriceLocked(newLockState);
      
      if (newLockState) {
        alert(`🔒 Цена закреплена на ${currentPrice}₽\n\nСистема будет автоматически восстанавливать эту цену, если Wildberries попытается её изменить.`);
      } else {
        alert('🔓 Закрепление цены снято');
      }
    } catch (err) {
      console.error('❌ Ошибка изменения закрепления цены:', err);
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setLockingPrice(false);
    }
  };

  const saveTaxRate = async () => {
    try {
      setSaving(true);
      // Получаем ID кабинета из данных
      const cabinetResponse = await fetch('/api/cabinets');
      const cabinets = await cabinetResponse.json();
      
      if (cabinets.length === 0) {
        throw new Error('Кабинет не найден');
      }

      const response = await fetch(`/api/cabinets/${cabinets[0].id}/update-tax`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxRate })
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения');
      }

      setEditingTax(false);
      // Перезагружаем данные
      await loadFinancialData();
    } catch (err) {
      console.error('❌ Ошибка сохранения налоговой ставки:', err);
      alert('Ошибка сохранения налоговой ставки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="liquid-glass p-8 max-w-md w-full">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
              <RefreshCw className="w-12 h-12 text-purple-600 animate-spin relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-text-main mb-2">Загрузка аналитики</h3>
              <p className="text-text-subtle text-sm">Анализируем финансовые данные...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto product-financial-modal">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 relative">
          {/* Фиксированная кнопка закрытия */}
          <button
            onClick={onClose}
            className="sticky top-4 right-4 float-right z-10 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg border border-gray-200 transition-all"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Ошибка
            </h2>
            <button onClick={onClose} className="text-text-subtle hover:text-text-main transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={loadFinancialData} className="glass-button-primary">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { product, financialAnalysis } = data;
  const isProfitable = financialAnalysis.profit.amount > 0;

  return (
    <div className="product-financial-modal fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-start justify-center overflow-y-auto">
      <div className="liquid-glass p-6 md:p-8 w-full max-w-[95vw] xl:max-w-7xl my-4 md:my-8 mx-auto relative">
        {/* Кнопка свернуть в верхнем правом углу */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 p-3 rounded-xl bg-white/80 hover:bg-white transition-all duration-300 backdrop-blur-sm border border-gray-200 hover:border-gray-300 hover:scale-110 group shadow-lg"
          title="Свернуть"
        >
          <X className="w-5 h-5 text-gray-600 group-hover:text-gray-900 group-hover:rotate-90 transition-all duration-300" />
        </button>

        {/* Заголовок */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold">Детальная финансовая аналитика</h2>
              <p className="text-blue-100 mt-1 text-sm md:text-base">Полный разбор экономики товара</p>
            </div>
          </div>
        </div>

        {/* Отладочная информация */}
        {product.price === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
            <div className="text-yellow-700 font-semibold mb-2">⚠️ Внимание: Цена товара = 0 ₽</div>
            <div className="text-sm text-yellow-600">
              Проверьте консоль браузера для деталей загрузки цены из WB API.
              Возможно, товар не найден или API вернул некорректные данные.
            </div>
          </div>
        )}

        {/* Настройки расчета - себестоимость и налогообложение рядом */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Себестоимость */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 border border-gray-200 hover:border-green-400 transition-all duration-300 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div className="text-lg font-bold text-text-main">Себестоимость товара</div>
            </div>
            {editingCost ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={costPrice === 0 ? '' : costPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setCostPrice(0);
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) {
                        setCostPrice(Math.round(num)); // Только целые числа
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    // Запрещаем ввод букв и спецсимволов
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 bg-white border-2 border-gray-300 focus:border-green-500 rounded-xl px-4 py-3 text-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  placeholder="Введите себестоимость"
                  min="0"
                  step="1"
                />
                <button
                  onClick={saveCostPrice}
                  disabled={saving}
                  className="p-3 glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                  title="Сохранить"
                >
                  {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    setEditingCost(false);
                    setCostPrice(data?.product.costPrice || 0);
                  }}
                  className="p-3 glass-button hover:scale-105 active:scale-95 transition-transform"
                  title="Отмена"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-4xl font-extrabold text-text-main">
                  {formatCurrency(costPrice)}
                </div>
                <button
                  onClick={() => setEditingCost(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-main font-semibold rounded-lg border border-gray-300 hover:border-gray-400 hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <Edit2 className="w-4 h-4" />
                  Изменить
                </button>
              </div>
            )}
          </div>

          {/* Налоговая ставка */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 border border-gray-200 hover:border-yellow-400 transition-all duration-300 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="w-6 h-6 text-yellow-600" />
              <div className="text-lg font-bold text-text-main">Система налогообложения</div>
            </div>
            {editingTax ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTaxRate(6)}
                    className={`flex-1 px-3 py-2 rounded transition-colors ${taxRate === 6 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-text-main hover:bg-gray-200'}`}
                  >
                    УСН 6%
                  </button>
                  <button
                    onClick={() => setTaxRate(15)}
                    className={`flex-1 px-3 py-2 rounded transition-colors ${taxRate === 15 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-text-main hover:bg-gray-200'}`}
                  >
                    УСН 15%
                  </button>
                  <button
                    onClick={() => setTaxRate(25)}
                    className={`flex-1 px-3 py-2 rounded transition-colors ${taxRate === 25 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-text-main hover:bg-gray-200'}`}
                  >
                    25%
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={taxRate === 0 ? '' : taxRate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setTaxRate(0);
                      } else {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num >= 0 && num <= 100) {
                          setTaxRate(Math.round(num)); // Только целые числа
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Запрещаем ввод букв и спецсимволов
                      if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    className="flex-1 bg-white border-2 border-gray-300 rounded px-3 py-2 text-text-main"
                    placeholder="Другая ставка"
                    min="0"
                    max="100"
                    step="1"
                  />
                  <button
                    onClick={saveTaxRate}
                    disabled={saving}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 shadow-md"
                  >
                    {saving ? '...' : '✓'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingTax(false);
                      setTaxRate(data?.taxRate || 6);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-text-main rounded transition-colors shadow-md"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-4xl font-extrabold text-text-main">
                  {taxRate}%
                </div>
                <button
                  onClick={() => setEditingTax(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-main font-semibold rounded-lg border border-gray-300 hover:border-gray-400 hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <Edit2 className="w-4 h-4" />
                  Изменить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Цены и скидки - оптимизировано для мобильных */}
        <div className="liquid-glass p-4 md:p-6 mb-4 md:mb-6 hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 md:p-3 bg-blue-50 rounded-xl border border-blue-200">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-text-main">Цены и скидки</h3>
              <p className="text-xs md:text-sm text-text-subtle">Управление ценообразованием</p>
            </div>
          </div>

          {editingPrice ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-subtle mb-1 block">Базовая цена (₽)</label>
                <input
                  type="number"
                  value={originalPrice === 0 ? '' : originalPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setOriginalPrice(0);
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) {
                        setOriginalPrice(Math.round(num));
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-text-main"
                  placeholder="8 000"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="text-xs text-text-subtle mb-1 block">Цена со скидкой (₽)</label>
                <input
                  type="number"
                  value={discountPrice === 0 ? '' : discountPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setDiscountPrice(0);
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num) && num >= 0) {
                        setDiscountPrice(Math.round(num));
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-text-main"
                  placeholder="720"
                  min="1"
                  step="1"
                />
              </div>
              {discountPrice > 0 && originalPrice > 0 && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-xs text-text-subtle mb-1">Скидка</div>
                  <div className="text-lg font-bold text-purple-600">
                    -{Math.round((1 - discountPrice / originalPrice) * 100)}%
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={savePrice}
                  disabled={saving || originalPrice <= 0 || discountPrice <= 0 || discountPrice >= originalPrice}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm font-semibold"
                >
                  {saving ? '...' : '✓ Сохранить'}
                </button>
                <button
                  onClick={() => {
                    setEditingPrice(false);
                    setOriginalPrice(data?.product.originalPrice || data?.product.price || 0);
                    setDiscountPrice(data?.product.price || 0);
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-text-main rounded-lg transition-colors shadow-md text-sm font-semibold"
                >
                  ✕
                </button>
              </div>
              {discountPrice >= originalPrice && discountPrice > 0 && (
                <div className="text-xs text-red-600">⚠️ Цена со скидкой должна быть меньше базовой</div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-text-subtle mb-1">Базовая цена</div>
                  <div className="text-lg md:text-xl font-bold text-text-main">
                    {formatCurrency(financialAnalysis.productPrice)}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-text-subtle mb-1">Цена со скидкой</div>
                  <div className="text-lg md:text-xl font-bold text-green-600">
                    {formatCurrency(data?.product.price || 0)}
                  </div>
                </div>
              </div>
              
              {/* Скидка и себестоимость в одну строку */}
              <div className="grid grid-cols-2 gap-3">
                {data?.product.originalPrice && data.product.price && data.product.originalPrice > data.product.price && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-text-subtle mb-1">Скидка</div>
                    <div className="text-lg font-bold text-purple-600">
                      -{Math.round((1 - data.product.price / data.product.originalPrice) * 100)}%
                    </div>
                  </div>
                )}
                
                {data?.product.costPrice && data.product.costPrice > 0 && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="text-xs text-text-subtle mb-1">Себестоимость</div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(data.product.costPrice)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPrice(true);
                    setOriginalPrice(data?.product.originalPrice || data?.product.price || 0);
                    setDiscountPrice(data?.product.price || 0);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-lg border border-blue-200 hover:border-blue-300 transition-all shadow-sm text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Редактировать
                </button>
                <button
                  onClick={togglePriceLock}
                  disabled={lockingPrice}
                  className={`flex items-center justify-center gap-2 px-3 py-2 font-semibold rounded-lg border transition-all shadow-sm text-sm ${
                    priceLocked
                      ? 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200 hover:border-green-300'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={priceLocked ? 'Цена закреплена' : 'Закрепить цену'}
                >
                  {priceLocked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Основные показатели */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">

          {/* К переводу (после вычетов WB) */}
          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-6 border border-gray-200 hover:border-green-400 transition-all duration-300 group shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-text-main">К переводу</div>
              <div className="p-2 bg-green-50 rounded-lg group-hover:scale-110 transition-transform">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-text-main mb-3">
              {formatCurrency(financialAnalysis.toTransfer.amount)}
            </div>
            <div className="text-xs text-text-subtle mt-2">
              После вычета комиссии и логистики WB
            </div>
          </div>

          {/* Чистая прибыль (если указана себестоимость) или К переводу */}
          <div className={`bg-white/90 backdrop-blur-xl rounded-xl p-6 border border-gray-200 ${isProfitable ? 'hover:border-emerald-400' : 'hover:border-red-400'} transition-all duration-300 group shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-extrabold text-text-main">
                {costPrice > 0 ? 'Чистая прибыль' : 'Итого'}
              </div>
              <div className={`p-2 ${isProfitable ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg group-hover:scale-110 transition-transform`}>
                {isProfitable ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
            </div>
            <div className={`text-4xl font-extrabold mb-3 ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(financialAnalysis.profit.amount)}
            </div>
            <div className="text-xs text-text-subtle mt-2">
              {costPrice > 0 ? 'С учетом себестоимости и налогов' : '💡 Укажите себестоимость для точного расчета'}
            </div>
          </div>
        </div>

        {/* Расходы на WB */}
        <div className="liquid-glass p-4 md:p-6 mb-4 md:mb-6 hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main">Расходы на WB</h3>
                <p className="text-sm text-text-subtle">Комиссии и логистика маркетплейса</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-main">{formatCurrency(financialAnalysis.wbExpenses.total)}</div>
              <div className="text-sm text-text-subtle">{formatPercent(financialAnalysis.wbExpenses.totalPercent)}</div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Комиссия */}
            <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-yellow-400 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-text-main font-semibold">Комиссия WB</div>
                    <div className="text-sm text-text-subtle">
                      Ставка: {formatPercent(financialAnalysis.wbExpenses.commission.rate)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-main">
                    {formatCurrency(financialAnalysis.wbExpenses.commission.amount)}
                  </div>
                  <div className="text-sm text-text-subtle">
                    {formatPercent(financialAnalysis.wbExpenses.commission.percent)}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full" style={{width: `${Math.min(financialAnalysis.wbExpenses.commission.percent, 100)}%`}}></div>
              </div>
            </div>

            {/* Логистика */}
            <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-purple-400 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-text-main font-semibold">Логистика</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-main">
                    {formatCurrency(financialAnalysis.wbExpenses.logistics.total)}
                  </div>
                  <div className="text-sm text-text-subtle">
                    {formatPercent(financialAnalysis.wbExpenses.logistics.totalPercent)}
                  </div>
                </div>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{width: `${Math.min(financialAnalysis.wbExpenses.logistics.totalPercent, 100)}%`}}></div>
              </div>
              
              <div className="space-y-2 mt-3 pl-2">
                <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg">
                  <span className="text-text-subtle">До клиента</span>
                  <div className="text-right">
                    <span className="text-text-main font-medium">{formatCurrency(financialAnalysis.wbExpenses.logistics.toClient.amount)}</span>
                    <span className="text-text-subtle ml-2">({formatPercent(financialAnalysis.wbExpenses.logistics.toClient.percent)})</span>
                  </div>
                </div>
                {financialAnalysis.wbExpenses.logistics.fromClient.amount > 0 && (
                  <div className="flex items-center justify-between text-sm bg-orange-50 p-2 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2">
                      <span className="text-text-subtle">От клиента (возврат)</span>
                      <span className="text-xs text-orange-600 font-semibold">50₽ фикс.</span>
                    </div>
                    <div className="text-right">
                      <span className="text-text-main font-medium">{formatCurrency(financialAnalysis.wbExpenses.logistics.fromClient.amount)}</span>
                      <span className="text-text-subtle ml-2">({formatPercent(financialAnalysis.wbExpenses.logistics.fromClient.percent)})</span>
                    </div>
                  </div>
                )}
                {financialAnalysis.wbExpenses.logistics.fromClient.amount === 0 && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                    ✓ Без возврата (экономия 50₽)
                  </div>
                )}
              </div>
            </div>

            {/* Хранение */}
            {financialAnalysis.wbExpenses.storage.amount > 0 && (
              <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-orange-400 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Warehouse className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-text-main font-semibold">Хранение</div>
                      <div className="text-sm text-text-subtle">
                        {financialAnalysis.wbExpenses.storage.days} дней
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-main">
                      {formatCurrency(financialAnalysis.wbExpenses.storage.amount)}
                    </div>
                    <div className="text-sm text-text-subtle">
                      {formatPercent(financialAnalysis.wbExpenses.storage.percent)}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{width: `${Math.min(financialAnalysis.wbExpenses.storage.percent, 100)}%`}}></div>
                </div>
              </div>
            )}

            {/* Приемка */}
            {financialAnalysis.wbExpenses.acceptance.amount > 0 && (
              <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-cyan-400 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-50 rounded-lg">
                      <FileText className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-text-main font-semibold">Приёмка</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-main">
                      {formatCurrency(financialAnalysis.wbExpenses.acceptance.amount)}
                    </div>
                    <div className="text-sm text-text-subtle">
                      {formatPercent(financialAnalysis.wbExpenses.acceptance.percent)}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{width: `${Math.min(financialAnalysis.wbExpenses.acceptance.percent, 100)}%`}}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Расходы продавца */}
        <div className="liquid-glass p-4 md:p-6 mb-4 md:mb-6 hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-main">Расходы продавца</h3>
                <p className="text-sm text-text-subtle">Налоги, себестоимость и реклама</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-main">{formatCurrency(financialAnalysis.sellerExpenses.total)}</div>
              <div className="text-sm text-text-subtle">{formatPercent(financialAnalysis.sellerExpenses.totalPercent)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-red-400 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-text-main font-semibold">Налоги (УСН)</div>
                  <div className="text-sm text-text-subtle">
                    Ставка: {formatPercent(financialAnalysis.sellerExpenses.taxes.rate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-main">
                    {formatCurrency(financialAnalysis.sellerExpenses.taxes.amount)}
                  </div>
                  <div className="text-sm text-text-subtle">
                    {formatPercent(financialAnalysis.sellerExpenses.taxes.percent)}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{width: `${Math.min(financialAnalysis.sellerExpenses.taxes.percent, 100)}%`}}></div>
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-orange-400 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="text-text-main font-semibold">Себестоимость</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-main">
                    {formatCurrency(financialAnalysis.sellerExpenses.costPrice.amount)}
                  </div>
                  <div className="text-sm text-text-subtle">
                    {formatPercent(financialAnalysis.sellerExpenses.costPrice.percent)}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{width: `${Math.min(financialAnalysis.sellerExpenses.costPrice.percent, 100)}%`}}></div>
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-pink-400 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="text-text-main font-semibold">Расходы на рекламу</div>
                <div className="text-right">
                  <div className="text-lg font-bold text-text-main">
                    {formatCurrency(financialAnalysis.sellerExpenses.advertising.amount)}
                  </div>
                  <div className="text-sm text-text-subtle">
                    {formatPercent(financialAnalysis.sellerExpenses.advertising.percent)}
                  </div>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full" style={{width: `${Math.min(financialAnalysis.sellerExpenses.advertising.percent, 100)}%`}}></div>
              </div>
            </div>

            {financialAnalysis.sellerExpenses.other.amount > 0 && (
              <div className="bg-white/60 p-4 rounded-xl border border-gray-200 hover:border-gray-400 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-text-main font-semibold">Прочие расходы за шт</div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text-main">
                      {formatCurrency(financialAnalysis.sellerExpenses.other.amount)}
                    </div>
                    <div className="text-sm text-text-subtle">
                      {formatPercent(financialAnalysis.sellerExpenses.other.percent)}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full" style={{width: `${Math.min(financialAnalysis.sellerExpenses.other.percent, 100)}%`}}></div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Остатки и товары в пути - grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Остатки по складам */}
          <div className="liquid-glass p-4 md:p-6 hover:border-gray-300 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-xl border border-green-200">
                <Warehouse className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-main">Остатки</h3>
                <p className="text-xs text-text-subtle">На складах WB</p>
              </div>
              {loadingWarehouses && (
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>

            {loadingWarehouses ? (
              <div className="space-y-2">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>
            ) : data?.warehouses && data.warehouses.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Всего */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-xs text-text-subtle mb-1">Всего</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {data.warehouses.reduce((sum, w) => sum + w.stock, 0)}
                  </div>
                </div>
                
                {/* Пополнить */}
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="text-xs text-text-subtle mb-1">Пополнить</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {data.product.reserved || 0}
                  </div>
                </div>
                
                {/* Детализация по складам */}
                {data.warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="col-span-2 bg-white/60 p-2.5 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-text-main truncate">{warehouse.name}</div>
                          <div className="text-xs text-text-subtle">{warehouse.type}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-base font-bold text-text-main">{warehouse.stock}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-subtle">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-xs">Нет данных об остатках</p>
              </div>
            )}
          </div>

          {/* Товары в пути */}
          <div className="liquid-glass p-4 md:p-6 hover:border-gray-300 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-main">В пути к клиенту</h3>
                <p className="text-xs text-text-subtle">Доставка заказов</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* В пути к клиенту */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-xs text-text-subtle mb-1">Доставка заказов</div>
                <div className="text-2xl font-bold text-green-600">
                  {data?.product.reserved || 0}
                </div>
              </div>
              
              {/* Возвраты в пути */}
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="text-xs text-text-subtle mb-1">Возвраты на склад</div>
                <div className="text-2xl font-bold text-red-600">
                  0
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-text-subtle bg-blue-50 p-2 rounded-lg border border-blue-200">
              💡 Данные обновляются автоматически при синхронизации с WB
            </div>
          </div>
        </div>

        {/* Итого */}
        <div className="liquid-glass p-6 border-2 border-blue-400">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="text-text-subtle">Всего расходов</span>
              <div className="text-right">
                <span className="text-text-main font-bold">
                  {formatCurrency(financialAnalysis.totalExpenses.amount)}
                </span>
                <span className="text-text-subtle ml-2">
                  ({formatPercent(financialAnalysis.totalExpenses.percent)})
                </span>
              </div>
            </div>

            <div className={`flex items-center justify-between text-xl pt-3 border-t border-gray-300`}>
              <span className={`font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                Прибыль
              </span>
              <div className="text-right">
                <span className={`font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(financialAnalysis.profit.amount)}
                </span>
                <span className="text-text-subtle ml-2">
                  ({formatPercent(financialAnalysis.profit.percent)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка закрытия */}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="glass-button-primary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
