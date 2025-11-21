// src/app/components/ProductDetailedAnalytics.tsx - Подробная аналитика товара

'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Package, Eye, ShoppingCart } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProductDetailedAnalyticsProps {
  nmId: number;
  onClose: () => void;
}

interface ProductAnalyticsData {
  product: {
    id: string;
    nmId: number | null;
    name: string;
    vendorCode: string;
    category: string;
    subcategory: string;
    status: string;
  };
  financial: {
    currentPrice: number;
    originalPrice: number;
    costPrice: number | null;
    discount: number;
    profitCalculation: any;
    commissions: {
      fbw: number;
      fbs: number;
      dbs: number;
      cc: number;
      edbs: number;
    };
  };
  inventory: {
    total: number;
    available: number;
    inWarehouse: number;
    inTransit: number;
    reserved: number;
  };
  sales: {
    total: number;
    last7Days: number;
    last30Days: number;
    averagePerDay: number;
    trend: 'up' | 'down' | 'stable';
    chart: {
      date: string;
      sales: number;
      revenue: number;
    }[];
  };
  orders: {
    total: number;
    last7Days: number;
    last30Days: number;
    conversionRate: number;
  };
  reviews: {
    averageRating: number;
    totalCount: number;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  promotion: {
    searchQueries: {
      query: string;
      position: number;
      frequency: number;
      cluster: string;
    }[];
    categoryKeywords: {
      keyword: string;
      relevance: number;
    }[];
    competitors: {
      nmId: number;
      name: string;
      price: number;
      position: number;
    }[];
  };
  performance: {
    views: number;
    ctr: number;
    addToCartRate: number;
    purchaseRate: number;
    returnRate: number;
    averageCheck: number;
  };
}

export default function ProductDetailedAnalytics({ nmId, onClose }: ProductDetailedAnalyticsProps) {
  const [data, setData] = useState<ProductAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [nmId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Используем новый API endpoint с реальными данными
      const response = await fetch(`/api/products/${nmId}/analytics`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки данных');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('❌ Ошибка загрузки аналитики товара:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="glass-container p-8 max-w-md w-full">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
              <RefreshCw className="w-12 h-12 text-blue-400 animate-spin relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Загрузка аналитики</h3>
              <p className="text-gray-400 text-sm">Анализируем данные товара...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="glass-container p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-400" />
              Ошибка
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-red-400">{error || 'Нет данных'}</p>
          <button onClick={loadAnalytics} className="mt-4 glass-button-primary w-full">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  // Подготовка данных для графика
  const chartData = {
    labels: data.sales.chart.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Продажи, шт',
        data: data.sales.chart.map(day => day.sales),
        fill: true,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgba(139, 92, 246, 1)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Выручка, ₽',
        data: data.sales.chart.map(day => day.revenue),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Продажи, шт',
          color: '#9CA3AF'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#9CA3AF'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Выручка, ₽',
          color: '#9CA3AF'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#9CA3AF'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9CA3AF'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#E5E7EB',
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
      }
    }
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={`text-sm font-medium flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        <Icon className="w-4 h-4" />
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center overflow-y-auto">
      <div className="glass-container p-6 md:p-8 w-full max-w-[95vw] xl:max-w-7xl my-4 md:my-8 mx-auto relative">
        {/* Кнопка закрытия */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:scale-110 group"
          title="Закрыть"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Заголовок */}
        <div className="mb-6 pr-12">
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-white">Создание товара</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{data.product.name}</h3>
              <p className="text-sm text-gray-400">Артикул: {data.product.vendorCode || data.product.nmId}</p>
              <p className="text-xs text-gray-500">{data.product.category} / {data.product.subcategory}</p>
            </div>
          </div>
        </div>

        {/* Основные метрики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-container p-4">
            <div className="text-sm text-gray-400 mb-1">Цена товара</div>
            <div className="text-2xl font-bold text-white mb-1">
              {data.financial.currentPrice.toLocaleString('ru-RU')} ₽
            </div>
            {data.financial.discount > 0 && (
              <div className="text-xs text-gray-500 line-through">
                {data.financial.originalPrice.toLocaleString('ru-RU')} ₽
              </div>
            )}
          </div>

          <div className="glass-container p-4">
            <div className="text-sm text-gray-400 mb-1">Себестоимость</div>
            <div className="text-2xl font-bold text-white mb-1">
              {data.financial.costPrice ? 
                data.financial.costPrice.toLocaleString('ru-RU') : '—'} ₽
            </div>
            {data.financial.costPrice && data.financial.currentPrice ? (
              <div className="text-xs text-blue-400">
                {((data.financial.costPrice / data.financial.currentPrice) * 100).toFixed(1)}% от цены
              </div>
            ) : (
              <div className="text-xs text-gray-500">Не указана</div>
            )}
          </div>

          <div className="glass-container p-4">
            <div className="text-sm text-gray-400 mb-1">Прибыль с продажи</div>
            <div className="text-2xl font-bold text-white mb-1">
              {data.financial.profitCalculation?.profit?.amount ? 
                data.financial.profitCalculation.profit.amount.toLocaleString('ru-RU') : '0'} ₽
            </div>
            <div className="text-xs text-emerald-400">
              {data.financial.profitCalculation?.profit?.percent ? 
                `${data.financial.profitCalculation.profit.percent.toFixed(1)}%` : '0%'}
            </div>
          </div>

          <div className="glass-container p-4">
            <div className="text-sm text-gray-400 mb-1">Продажи</div>
            <div className="flex items-baseline gap-3">
              <div>
                <div className="text-xs text-gray-500">7 дней</div>
                <div className="text-xl font-bold text-white">{data.sales.last7Days}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">30 дней</div>
                <div className="text-xl font-bold text-white">{data.sales.last30Days}</div>
              </div>
            </div>
          </div>
        </div>

        {/* График и Расходы */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* График продаж */}
          <div className="lg:col-span-2 glass-container p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Динамика продаж</h3>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Расходы на Wildberries */}
          <div className="glass-container p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Комиссии WB</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">FBW</span>
                <span className="font-semibold text-white">
                  {data.financial.commissions.fbw}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">FBS</span>
                <span className="font-semibold text-white">
                  {data.financial.commissions.fbs}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">DBS</span>
                <span className="font-semibold text-white">
                  {data.financial.commissions.dbs}%
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="text-xs text-gray-400 mb-2">Расходы WB</div>
                <div className="text-lg font-bold text-blue-400">
                  {data.financial.profitCalculation?.wbExpenses?.total ? 
                    data.financial.profitCalculation.wbExpenses.total.amount.toLocaleString('ru-RU') : '0'} ₽
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Поисковые запросы */}
        <div className="glass-container p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Основные поисковые запросы</h3>
          <div className="space-y-2">
            {data.promotion.searchQueries.map((query: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">"{query.query}"</span>
                <span className="font-semibold text-white">{query.frequency} поисков</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
