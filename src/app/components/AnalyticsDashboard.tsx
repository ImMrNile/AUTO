'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw,
  AlertCircle,
  Package,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Search,
  Warehouse,
  Building2,
  Truck,
  RotateCcw,
  Info
} from 'lucide-react';
import { useAnalyticsCache } from '../hooks/useAnalyticsCache';
import AnalyticsLoadingSkeleton from './AnalyticsLoadingSkeleton';
import ProductFinancialDetails from './ProductFinancialDetails';
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
import { Line } from 'react-chartjs-2';

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

interface DashboardData {
  financial: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalForPay: number; // К переводу от WB (без себестоимости)
    totalProfit: number; // Чистая прибыль (с вычетом себестоимости)
    profitMargin: number;
    periodComparison: {
      revenueChange: number;
      ordersChange: number;
      profitChange: number;
    };
    expenses: {
      totalWbCommission: number;
      totalLogistics: number;
      logisticsToClient: number; // Логистика до клиента
      logisticsReturns: number; // Логистика возвратов (50₽ за единицу)
      returnsCount: number; // Количество возвратов
      totalStorage: number;
      totalAcceptance: number;
      totalOtherDeductions: number; // Штрафы, корректировки и прочие вычеты WB
      totalWbExpenses: number; // Всего расходов WB
      totalCost: number; // Себестоимость товаров
      totalTaxes: number; // Налоги
      totalAdvertising: number; // Реклама
    };
  };
  sales: {
    todaySales: number;
    weekSales: number;
    monthSales: number;
    topProducts: Array<{
      nmID: number;
      title: string;
      revenue: number;
      orders: number;
      image?: string;
    }>;
    allProducts: Array<{
      nmID: number;
      title: string;
      revenue: number;
      orders: number;
      image?: string;
    }>;
    salesByDay: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
  };
  inventory: {
    totalProducts: number;
    totalStock: number;
    lowStockProducts: number;
    inTransit: number;
    inReturn: number;
    reserved: number;
    stockValue: number;
    fbwStock: number;
    fbsStock: number;
    warehouseDetails: Array<{
      name: string;
      quantity: number;
      inWayToClient: number;
      inWayFromClient: number;
      isFBW: boolean;
    }>;
  };
  conversion: {
    totalViews: number;
    addToCartRate: number;
    purchaseRate: number;
    avgCTR: number;
    cartAbandonmentRate: number;
  };
  topSearchQueries: Array<{
    query: string;
    frequency: number;
    orders: number;
    revenue: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    orders: number;
    avgPrice: number;
  }>;
  reconciliation?: {
    available: boolean;
    matchQuality?: string;
    overallAccuracy?: number;
    discrepancies?: {
      revenue: number;
      commission: number;
      logistics: number;
      totalExpenses: number;
    };
  };
}

interface AnalyticsDashboardProps {
  cabinetId?: string | null;
}

export default function AnalyticsDashboard({ cabinetId }: AnalyticsDashboardProps) {
  const router = useRouter();
  const [period, setPeriod] = useState(30);
  const [periodLabel, setPeriodLabel] = useState('30 дней');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [conversionData, setConversionData] = useState<any>(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState(''); // Поиск товаров
  const forceRefreshRef = useRef(true); // Первая загрузка всегда с forceRefresh=true
  const conversionLoadedRef = useRef(false); // Флаг что конверсия уже загружена после обновления

  console.log('🎯 AnalyticsDashboard рендерится, period:', period);

  const handlePeriodChange = (days: number, label: string) => {
    setPeriod(days);
    setPeriodLabel(label);
  };

  const handleProductClick = (product: any) => {
    console.log('🔍 Клик на товар:', product);
    setSelectedProduct(product);
    // TODO: Открыть модальное окно или перейти на страницу товара
    // Можно использовать router.push или открыть ProductFinancialDetails
  };

  // Функция загрузки данных для хука
  const fetchAnalytics = useCallback(async (signal?: AbortSignal) => {
    const shouldForceRefresh = forceRefreshRef.current;
    console.log(`📊 Загрузка аналитики за ${period} дней... (forceRefresh: ${shouldForceRefresh})`, cabinetId ? `(кабинет: ${cabinetId})` : '');
    
    const url = new URL('/api/analytics/dashboard', window.location.origin);
    url.searchParams.set('days', period.toString());
    if (shouldForceRefresh) url.searchParams.set('forceRefresh', 'true');
    if (cabinetId) url.searchParams.set('cabinetId', cabinetId);
    console.log('🌐 URL запроса:', url.toString());
    
    const response = await fetch(url, {
      signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Если 401 - не авторизован, редиректим на логин
      if (response.status === 401) {
        console.error('❌ Не авторизован (401), редиректим на страницу входа...');
        router.push('/auth/login');
        throw new Error('Требуется авторизация');
      }
      
      // Если 400 - нет кабинетов, редиректим на страницу входа
      if (response.status === 400 && result.error?.includes('кабинет')) {
        console.error('❌ Нет активных кабинетов, требуется переавторизация...');
        router.push('/auth/login');
        throw new Error('Требуется переавторизация');
      }
      
      throw new Error(result.error || 'Ошибка загрузки аналитики');
    }
    
    console.log('✅ Аналитика загружена:', result.data);
    console.log('📊 Детализация логистики:', {
      totalLogistics: result.data?.financial?.expenses?.totalLogistics,
      logisticsToClient: result.data?.financial?.expenses?.logisticsToClient,
      logisticsReturns: result.data?.financial?.expenses?.logisticsReturns,
      returnsCount: result.data?.financial?.expenses?.returnsCount
    });
    console.log('📊 Данные для графика (salesByDay):', {
      length: result.data?.sales?.salesByDay?.length || 0,
      first: result.data?.sales?.salesByDay?.[0],
      last: result.data?.sales?.salesByDay?.[result.data?.sales?.salesByDay?.length - 1]
    });
    console.log('📦 Остатки FBS/FBW:', {
      fbsStock: result.data?.inventory?.fbsStock || 0,
      fbwStock: result.data?.inventory?.fbwStock || 0,
      totalStock: result.data?.inventory?.totalStock || 0
    });
    
    // Сбрасываем флаг после загрузки
    if (shouldForceRefresh) {
      forceRefreshRef.current = false;
      console.log('🔄 Флаг forceRefresh сброшен');
    }
    
    return result.data as DashboardData;
  }, [period, cabinetId]);

  // Используем хук для кеширования с фоновой загрузкой
  const {
    data,
    loading,
    backgroundLoading,
    error,
    lastUpdate,
    isFromCache,
    refresh
  } = useAnalyticsCache<DashboardData>(fetchAnalytics, {
    key: `analytics-dashboard-${period}`,
    ttl: 6 * 60 * 60 * 1000, // 6 часов
    backgroundRefresh: true // Включено - после оптимизации
  });

  const handleRefresh = async () => {
    console.log('🔄 Нажата кнопка "Обновить" - принудительная загрузка из WB API');
    forceRefreshRef.current = true; // Устанавливаем флаг через ref для мгновенного доступа
    conversionLoadedRef.current = true; // Помечаем что конверсия будет загружена
    console.log('✅ Флаг forceRefresh установлен в true');
    
    // Сначала обновляем конверсию с forceRefresh
    await fetchConversionData(true);
    
    // Затем обновляем основную аналитику
    refresh(true); // Принудительное обновление с очисткой кеша
  };

  // Функция загрузки реальных данных конверсии
  const fetchConversionData = useCallback(async (forceRefresh = false) => {
    setConversionLoading(true);
    try {
      console.log(`📊 Загрузка реальных данных конверсии (используем кеш)...`, cabinetId ? `(кабинет: ${cabinetId})` : '');
      const conversionUrl = new URL('/api/analytics/conversion', window.location.origin);
      conversionUrl.searchParams.set('days', period.toString());
      // ❌ НЕ передаем forceRefresh - конверсия обновляется отдельно, кеш 60 минут
      // if (forceRefresh) conversionUrl.searchParams.set('forceRefresh', 'true');
      if (cabinetId) conversionUrl.searchParams.set('cabinetId', cabinetId);
      
      console.log('🌐 URL запроса конверсии:', conversionUrl.toString());
      
      const response = await fetch(conversionUrl.toString(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`📥 Статус ответа: ${response.status}`);
      
      // Если 401 - не авторизован, редиректим на логин
      if (response.status === 401) {
        console.error('❌ Не авторизован (401), редиректим на страницу входа...');
        router.push('/auth/login');
        return;
      }
      
      // Если 400 - нет кабинетов, редиректим на страницу входа
      if (response.status === 400) {
        console.error('❌ Ошибка при загрузке конверсии (400), требуется переавторизация...');
        router.push('/auth/login');
        return;
      }
      
      const result = await response.json();
      console.log('📋 Результат конверсии:', result);
      
      if (result.success && result.data) {
        console.log('✅ Реальные данные конверсии загружены:', result.data);
        setConversionData(result.data);
      } else if (result.data) {
        // Даже если success = false, но есть данные - используем их
        console.warn('⚠️ Success = false, но есть данные:', result.data);
        setConversionData(result.data);
      } else {
        console.warn('⚠️ Не удалось загрузить данные конверсии:', result.error || result.details);
        // Показываем пустые данные вместо ошибки
        setConversionData({
          totalViews: 0,
          totalAddToCart: 0,
          totalOrders: 0,
          avgCTR: 0,
          addToCartRate: 0,
          purchaseRate: 0,
          cartAbandonmentRate: 0,
          hasAnalyticsAccess: false
        });
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных конверсии:', error);
      // Показываем пустые данные вместо ошибки
      setConversionData({
        totalViews: 0,
        totalAddToCart: 0,
        totalOrders: 0,
        avgCTR: 0,
        addToCartRate: 0,
        purchaseRate: 0,
        cartAbandonmentRate: 0,
        hasAnalyticsAccess: false
      });
    } finally {
      setConversionLoading(false);
    }
  }, [period, cabinetId]);

  // Автоматически обновляем данные при смене периода
  useEffect(() => {
    console.log('📅 Период изменен на:', period, '- автоматическое обновление данных');
    // refresh() вызовется автоматически через хук useAnalyticsCache
    // так как изменился ключ кеша
    
    // Загружаем реальные данные конверсии (если еще не загружены после обновления)
    if (!conversionLoadedRef.current) {
      fetchConversionData();
    } else {
      console.log('⏭️ Пропускаем загрузку конверсии - уже загружена после обновления');
      conversionLoadedRef.current = false; // Сбрасываем флаг
    }
  }, [period, fetchConversionData]);

  // Показываем скелетон если идет загрузка и нет данных
  // ИЛИ если идет загрузка при смене периода (даже если есть старые данные)
  if (loading && !data) {
    return <AnalyticsLoadingSkeleton />;
  }
  
  // Показываем скелетон при смене периода (когда идет загрузка новых данных)
  if (loading && data) {
    return <AnalyticsLoadingSkeleton />;
  }

  // Показываем ошибку
  if (error && !data) {
    return (
      <div className="liquid-glass rounded-2xl p-8 text-center fade-in">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-text-main mb-2">Ошибка загрузки</h3>
        <p className="text-text-subtle mb-4">{error}</p>
        <button 
          className="glass-button-primary"
          onClick={() => refresh(true)}
        >
          <RefreshCw className="w-4 h-4" />
          Повторить попытку
        </button>
      </div>
    );
  }

  // Если нет данных и не идет загрузка - показываем пустое состояние
  if (!data) {
    return (
      <div className="liquid-glass rounded-2xl p-8 text-center fade-in">
        <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-text-main mb-2">Нет данных</h3>
        <p className="text-text-subtle mb-4">Данные аналитики пока недоступны</p>
        <button 
          className="glass-button-primary"
          onClick={() => refresh(true)}
        >
          <RefreshCw className="w-4 h-4" />
          Загрузить данные
        </button>
      </div>
    );
  }

  // Подготовка данных для графика
  const salesByDay = data.sales?.salesByDay || [];
  console.log('📊 Данные для графика:', {
    salesByDayLength: salesByDay.length,
    firstDay: salesByDay[0],
    lastDay: salesByDay[salesByDay.length - 1]
  });
  
  // Определяем количество дней для отображения на графике
  const chartDays = period <= 7 ? period : period <= 30 ? 30 : period <= 90 ? 90 : 365;
  const chartData = {
    labels: salesByDay.slice(-chartDays).map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Выручка',
        data: salesByDay.slice(-chartDays).map(day => day.revenue / 1000),
        fill: true,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgba(139, 92, 246, 1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
      },
      {
        label: 'К переводу (примерно)',
        data: salesByDay.slice(-chartDays).map(day => {
          // Примерный расчет: выручка минус ~30% расходов WB
          const estimatedForPay = day.revenue * 0.7; // 70% от выручки идет к переводу
          return estimatedForPay / 1000;
        }),
        fill: true,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(34, 197, 94, 1)'
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
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#6B7280',
          callback: function(value: any) {
            return value + ' тыс. ₽';
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#1F2937',
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#6B7280',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const day = salesByDay[salesByDay.length - chartDays + index];
            if (day) {
              const date = new Date(day.date);
              return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long',
                weekday: 'long'
              });
            }
            return context[0].label;
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = (context.parsed.y * 1000).toLocaleString('ru-RU');
            label += value + ' ₽';
            return label;
          }
        }
      }
    }
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={`text-xs md:text-sm font-medium flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        <Icon className="w-3 h-3 md:w-4 md:h-4" />
        {isPositive ? '+' : ''}{Math.abs(value) > 100 ? Math.min(value, 99.9).toFixed(1) : value.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="fade-in space-y-4 md:space-y-6 relative w-full max-w-7xl mx-auto px-4 sm:px-6">
      <style jsx>{`
        .conversion-metric {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur-sm;
          -webkit-backdrop-filter: blur-sm;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(100, 116, 139, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        @media (min-width: 768px) {
          .conversion-metric {
            padding: 16px;
            align-items: flex-start;
            text-align: left;
          }
        }
        .metric-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur-sm;
          -webkit-backdrop-filter: blur-sm;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
        @media (min-width: 768px) {
          .metric-card {
            padding: 16px;
          }
        }
        .conversion-metric-title {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        @media (min-width: 768px) {
          .conversion-metric-title {
            font-size: 12px;
            margin-bottom: 8px;
          }
        }
        .conversion-metric-value {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.2;
        }
        @media (min-width: 768px) {
          .conversion-metric-value {
            font-size: 32px;
          }
        }
      `}</style>
      {/* Индикатор фонового обновления */}
      {backgroundLoading && (
        <div className="fixed top-4 right-4 z-50 liquid-glass rounded-xl p-4 flex items-center gap-3 shadow-xl">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          <div>
            <div className="text-sm font-semibold text-text-main">Обновление данных...</div>
            <div className="text-xs text-text-subtle">Загрузка в фоне, вы можете продолжать работу</div>
          </div>
        </div>
      )}

      {/* Заголовок */}
      <div className="col-span-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Аналитика и отчёты</h1>
          <p className="text-text-subtle mt-1">Данные по вашему бизнесу на Wildberries</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Кнопки выбора периода */}
          <div className="liquid-glass rounded-full p-1 flex items-center gap-1">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                period === 1 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-main hover:bg-white/20'
              } ${(loading || backgroundLoading) ? 'opacity-50 cursor-wait' : ''}`}
              onClick={() => handlePeriodChange(1, 'Сегодня')}
              disabled={loading || backgroundLoading}
            >
              {loading && period === 1 && <Loader2 className="w-4 h-4 animate-spin" />}
              Сегодня
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                period === 7 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-main hover:bg-white/20'
              } ${(loading || backgroundLoading) ? 'opacity-50 cursor-wait' : ''}`}
              onClick={() => handlePeriodChange(7, 'Неделя')}
              disabled={loading || backgroundLoading}
            >
              {loading && period === 7 && <Loader2 className="w-4 h-4 animate-spin" />}
              Неделя
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                period === 30 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-main hover:bg-white/20'
              } ${(loading || backgroundLoading) ? 'opacity-50 cursor-wait' : ''}`}
              onClick={() => handlePeriodChange(30, '30 дней')}
              disabled={loading || backgroundLoading}
            >
              {loading && period === 30 && <Loader2 className="w-4 h-4 animate-spin" />}
              30 дней
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                period === 90 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-main hover:bg-white/20'
              } ${(loading || backgroundLoading) ? 'opacity-50 cursor-wait' : ''}`}
              onClick={() => handlePeriodChange(90, '90 дней')}
              disabled={loading || backgroundLoading}
            >
              {loading && period === 90 && <Loader2 className="w-4 h-4 animate-spin" />}
              90 дней
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                period === 365 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'text-text-main hover:bg-white/20'
              } ${(loading || backgroundLoading) ? 'opacity-50 cursor-wait' : ''}`}
              onClick={() => handlePeriodChange(365, 'Год')}
              disabled={loading || backgroundLoading}
            >
              {loading && period === 365 && <Loader2 className="w-4 h-4 animate-spin" />}
              Год
            </button>
          </div>

          {/* Кнопка обновления */}
          <button 
            className="liquid-glass px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
            onClick={handleRefresh}
            disabled={backgroundLoading}
            title="Обновить данные из Wildberries API"
          >
            <RefreshCw className={`w-5 h-5 ${backgroundLoading ? 'animate-spin' : ''}`} />
            <span className="font-semibold text-text-main">
              {backgroundLoading ? 'Обновление...' : 'Обновить'}
            </span>
          </button>
        </div>
      </div>

      {/* Основные финансовые метрики */}
      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-2 md:gap-6 w-full max-w-6xl">
        {/* Продажи (как в WB приложении) */}
        <div className="liquid-glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col">
          <span className="text-xs text-text-subtle truncate">Продажи</span>
          <span className="text-sm md:text-3xl font-bold text-text-main mt-0.5 md:mt-1 truncate">
            {(data.financial.totalRevenue ?? 0).toLocaleString('ru-RU')} ₽
          </span>
          <ChangeIndicator value={data.financial.periodComparison?.revenueChange ?? 0} />
        </div>

        {/* К переводу от WB (без себестоимости) */}
        <div className="liquid-glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col">
          <span className="text-xs text-text-subtle truncate">Выкупы</span>
          <span className={`text-sm md:text-3xl font-bold mt-0.5 md:mt-1 truncate ${(data.financial.totalForPay ?? 0) < 0 ? 'text-red-600' : 'text-text-main'}`}>
            {(data.financial.totalForPay ?? 0).toLocaleString('ru-RU')} ₽
          </span>
          <ChangeIndicator value={data.financial.periodComparison?.profitChange ?? 0} />
          <span className="text-xs text-text-subtle mt-1 hidden md:block">После вычета расходов WB</span>
        </div>

        {/* Заказы */}
        <div className="liquid-glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col">
          <span className="text-xs text-text-subtle truncate">Заказов</span>
          <span className="text-sm md:text-3xl font-bold text-text-main mt-0.5 md:mt-1 truncate">
            {(data.financial.totalOrders ?? 0).toLocaleString('ru-RU')}
          </span>
          <ChangeIndicator value={data.financial.periodComparison?.ordersChange ?? 0} />
        </div>

        {/* Средний чек */}
        <div className="liquid-glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col">
          <span className="text-xs text-text-subtle truncate">Ср. чек</span>
          <span className="text-sm md:text-3xl font-bold text-text-main mt-0.5 md:mt-1 truncate">
            {(data.financial.avgOrderValue ?? 0).toLocaleString('ru-RU')} ₽
          </span>
          <ChangeIndicator value={data.financial.periodComparison?.revenueChange ?? 0} />
        </div>
        </div>
      </div>

      {/* График и Расходы */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* График продаж - 2/3 ширины */}
        <div className="lg:col-span-2 liquid-glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-text-main mb-4">Динамика продаж</h2>
          {salesByDay.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-text-main mb-2">Нет данных для графика</p>
                <p className="text-sm text-text-subtle">
                  За выбранный период ({periodLabel}) не найдено продаж.
                </p>
                <p className="text-xs text-text-subtle mt-2">
                  Попробуйте выбрать другой период или нажмите "Обновить"
                </p>
              </div>
            </div>
          ) : (
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Детализация расходов - 1/3 ширины */}
        <div className="liquid-glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-text-main mb-4">Детализация расходов WB</h2>
          <div className="space-y-3">
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-purple-700 mb-2">Вычеты из базы продавца</div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-subtle">Комиссия WB</span>
                <span className="font-medium text-text-main">
                  {(data.financial.expenses?.totalWbCommission ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-subtle">Логистика</span>
                  <span className="font-medium text-text-main">
                    {(data.financial.expenses?.totalLogistics ?? 0).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex justify-between items-center text-xs text-text-subtle">
                    <span>• До клиента</span>
                    <span>{(data.financial.expenses?.logisticsToClient ?? 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                  {(data.financial.expenses?.returnsCount ?? 0) > 0 ? (
                    <div className="flex justify-between items-center text-xs text-red-600">
                      <span>• Возвраты ({data.financial.expenses?.returnsCount ?? 0} шт × 50₽)</span>
                      <span>{(data.financial.expenses?.logisticsReturns ?? 0).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs text-green-600">
                      <span>✓ Без возвратов (экономия 50₽/шт)</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-subtle">Хранение</span>
                <span className="font-medium text-text-main">
                  {(data.financial.expenses?.totalStorage ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-subtle">Приёмка</span>
                <span className="font-medium text-text-main">
                  {(data.financial.expenses?.totalAcceptance ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-subtle">Прочие удержания</span>
                <span className={`font-medium ${(data.financial.expenses?.totalOtherDeductions ?? 0) > 0 ? 'text-text-main' : 'text-gray-400'}`}>
                  {(data.financial.expenses?.totalOtherDeductions ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div className="border-t border-purple-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-purple-700">Всего вычетов WB</span>
                  <span className="font-bold text-purple-700">
                    {(data.financial.expenses?.totalWbExpenses ?? 0).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>


            {/* Общий итог расходов WB */}
            <div className="border-t-2 border-gray-300 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-text-main font-bold text-lg">Всего расходов WB</span>
                <span className="font-bold text-red-600 text-xl">
                  {(data.financial.expenses?.totalWbExpenses ?? 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Reconciliation с WB отчетом */}
      {data.reconciliation?.available && (
        <div className="liquid-glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-main">Сверка с официальным отчетом WB</h2>
            <button
              onClick={() => setShowReconciliation(!showReconciliation)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              {showReconciliation ? 'Скрыть' : 'Показать детали'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showReconciliation ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
            {/* Качество сверки */}
            <div className={`rounded-lg p-4 ${
              data.reconciliation.matchQuality === 'excellent' ? 'bg-green-50 border border-green-200' :
              data.reconciliation.matchQuality === 'good' ? 'bg-blue-50 border border-blue-200' :
              data.reconciliation.matchQuality === 'fair' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="text-xs font-medium text-gray-600 mb-1">Качество сверки</div>
              <div className={`text-2xl font-bold ${
                data.reconciliation.matchQuality === 'excellent' ? 'text-green-600' :
                data.reconciliation.matchQuality === 'good' ? 'text-blue-600' :
                data.reconciliation.matchQuality === 'fair' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {data.reconciliation.matchQuality === 'excellent' ? 'Отлично' :
                 data.reconciliation.matchQuality === 'good' ? 'Хорошо' :
                 data.reconciliation.matchQuality === 'fair' ? 'Удовлетворительно' :
                 'Требует проверки'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.reconciliation.matchQuality === 'excellent' ? '≥95% точность' :
                 data.reconciliation.matchQuality === 'good' ? '85-94% точность' :
                 data.reconciliation.matchQuality === 'fair' ? '70-84% точность' :
                 '<70% точность'}
              </div>
            </div>

            {/* Общая точность */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 mb-1">Общая точность</div>
              <div className="text-2xl font-bold text-purple-600">
                {data.reconciliation.overallAccuracy?.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Совпадение с WB отчетом
              </div>
            </div>

            {/* Статус */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 mb-1">Статус расчетов</div>
              <div className="text-lg font-bold text-gray-700">
                {period >= 7 ? 'С KTR коэффициентами' : 'Стандартный'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {period >= 7 ? 'Точный расчет логистики' : 'Приблизительный расчет'}
              </div>
            </div>
          </div>

          {/* Детали расхождений */}
          {showReconciliation && data.reconciliation.discrepancies && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Расхождения с WB отчетом:</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {/* Выручка */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Выручка</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(data.reconciliation.discrepancies.revenue) < 1 ? 'text-green-600' :
                    Math.abs(data.reconciliation.discrepancies.revenue) < 5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.reconciliation.discrepancies.revenue > 0 ? '+' : ''}
                    {data.reconciliation.discrepancies.revenue.toFixed(2)}%
                  </div>
                </div>

                {/* Комиссия */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Комиссия</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(data.reconciliation.discrepancies.commission) < 1 ? 'text-green-600' :
                    Math.abs(data.reconciliation.discrepancies.commission) < 5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.reconciliation.discrepancies.commission > 0 ? '+' : ''}
                    {data.reconciliation.discrepancies.commission.toFixed(2)}%
                  </div>
                </div>

                {/* Логистика */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Логистика</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(data.reconciliation.discrepancies.logistics) < 1 ? 'text-green-600' :
                    Math.abs(data.reconciliation.discrepancies.logistics) < 5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.reconciliation.discrepancies.logistics > 0 ? '+' : ''}
                    {data.reconciliation.discrepancies.logistics.toFixed(2)}%
                  </div>
                </div>

                {/* Всего расходов */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Всего расходов</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(data.reconciliation.discrepancies.totalExpenses) < 1 ? 'text-green-600' :
                    Math.abs(data.reconciliation.discrepancies.totalExpenses) < 5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.reconciliation.discrepancies.totalExpenses > 0 ? '+' : ''}
                    {data.reconciliation.discrepancies.totalExpenses.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <strong>Примечание:</strong> Расхождения менее 5% считаются нормальными и могут быть связаны с округлением, 
                    различиями в датах обработки заказов или методах расчета. Расхождения более 5% требуют проверки данных.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Продажи товаров и Конверсия с Остатками */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Продажи товаров - левая колонка */}
        <div className="liquid-glass rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-base md:text-xl font-semibold text-text-main">Продажи товаров</h2>
            {productSearchQuery && (
              <div className="text-xs text-text-subtle">Результаты поиска</div>
            )}
          </div>
          
          {/* Поиск товаров */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или артикулу..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
            {productSearchQuery && (
              <button
                onClick={() => setProductSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {(() => {
              // Используем allProducts для поиска, если есть запрос, иначе topProducts
              const productsForDisplay = productSearchQuery 
                ? (data.sales?.allProducts || [])
                : (data.sales?.topProducts || []);
              
              const filteredProducts = productSearchQuery
                ? productsForDisplay.filter((p: any) => 
                    p.title?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                    p.nmID?.toString().includes(productSearchQuery)
                  )
                : productsForDisplay;

              console.log('📊 topProducts:', data.sales?.topProducts?.length || 0);
              console.log('📊 allProducts:', data.sales?.allProducts?.length || 0);
              console.log('🖼️ Товары для отображения:', filteredProducts.slice(0, 2).map(p => ({ nmID: p.nmID, title: p.title, image: p.image })));
              console.log('📦 Полные данные первого товара:', filteredProducts[0]);
              console.log('🔍 productsForDisplay:', productsForDisplay.length, 'filteredProducts:', filteredProducts.length);
              return filteredProducts.length > 0 ? (
                filteredProducts.map((product: any, index: number) => {
                  const imageUrl = product.image || `https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=Товар`;
                  return (
                  <div 
                    key={product.nmID} 
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-white/50 cursor-pointer transition-all hover:shadow-lg border border-gray-200 bg-white/20"
                    onClick={() => handleProductClick(product)}
                    title="Нажмите для просмотра подробной аналитики"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden shadow-sm">
                      <img 
                        alt={product.title || `Товар ${product.nmID}`} 
                        className="w-full h-full object-cover" 
                        src={imageUrl}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          // Пробуем альтернативные CDN WB
                          if (!img.src.includes('basket')) {
                            // Если уже пробовали wbstatic, пробуем basket
                            const vol = Math.floor(product.nmID / 100000);
                            const part = Math.floor(product.nmID / 1000);
                            const basketNum = String((vol % 10) + 1).padStart(2, '0');
                            img.src = `https://basket-${basketNum}.wbbasket.ru/vol${vol}/part${part}/${product.nmID}/images/big/1.jpg`;
                          } else {
                            // Если все CDN не работают, показываем placeholder
                            img.src = '/placeholder.svg';
                            img.onerror = null; // Предотвращаем бесконечный цикл
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text-main font-semibold text-base leading-tight mb-1 overflow-hidden" 
                          style={{ 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical' 
                          }}>
                        {product.title || `Товар ${product.nmID}`}
                      </h3>
                      <p className="text-xs text-text-subtle bg-gray-100 px-2 py-1 rounded-md inline-block">
                        Артикул: {product.nmID}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-text-main text-lg whitespace-nowrap">
                        {product.revenue.toLocaleString('ru-RU')} ₽
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {product.orders} заказов
                      </p>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-text-subtle">
                  <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>{productSearchQuery ? 'Товары не найдены' : 'Нет данных о товарах'}</p>
                  {productSearchQuery && (
                    <button
                      onClick={() => setProductSearchQuery('')}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      Очистить поиск
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Правая колонка: Конверсия и Остатки - на мобильных в 2 колонки рядом */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:space-y-6 lg:block">
          {/* Конверсия и эффективность */}
          <div className="liquid-glass rounded-xl p-3 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-base md:text-xl font-semibold text-text-main">Конверсия</h2>
              {conversionLoading && (
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              )}
            </div>
            {conversionData ? (
              <div className="space-y-2 md:space-y-3">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="conversion-metric" title="Количество просмотров карточек товаров за период">
                    <div className="conversion-metric-title flex items-center gap-1 text-xs">
                      Просмотры
                      <Info className="w-3 h-3 text-gray-400 hidden md:inline" />
                    </div>
                    <div className="conversion-metric-value text-sm md:text-2xl">
                      {conversionData.totalViews > 1000 
                        ? `${(conversionData.totalViews / 1000).toFixed(1)}k` 
                        : conversionData.totalViews.toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="conversion-metric" title="Click-Through Rate - процент пользователей, добавивших товар в корзину от общего числа просмотров">
                    <div className="conversion-metric-title flex items-center gap-1 text-xs">
                      CTR
                      <Info className="w-3 h-3 text-gray-400 hidden md:inline" />
                    </div>
                    <div className="conversion-metric-value text-sm md:text-2xl">{conversionData.avgCTR.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                  <div className="conversion-metric" title="Количество добавлений товаров в корзину">
                    <div className="conversion-metric-title flex items-center gap-1 text-xs">
                      Корзина
                      <Info className="w-3 h-3 text-gray-400 hidden md:inline" />
                    </div>
                    <div className="conversion-metric-value text-xs md:text-xl">{conversionData.totalAddToCart.toLocaleString('ru-RU')}</div>
                  </div>
                  <div className="conversion-metric" title="Процент заказов от добавлений в корзину (Заказы / В корзину × 100%)">
                    <div className="conversion-metric-title flex items-center gap-1 text-xs">
                      %
                      <Info className="w-3 h-3 text-gray-400 hidden md:inline" />
                    </div>
                    <div className="conversion-metric-value text-xs md:text-xl">{conversionData.purchaseRate.toFixed(1)}%</div>
                  </div>
                  <div className="conversion-metric hidden md:block" title="Количество оформленных заказов за период">
                    <div className="conversion-metric-title flex items-center gap-1 text-xs">
                      Заказано
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="conversion-metric-value text-sm md:text-xl">{conversionData.totalOrders.toLocaleString('ru-RU')}</div>
                  </div>
                </div>
                {!conversionData.hasAnalyticsAccess && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-800">
                        <div className="font-semibold mb-1">⚠️ Нет доступа к Analytics API</div>
                        <div>Проверьте права токена для получения реальных данных о конверсии.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="conversion-metric animate-pulse">
                    <div className="conversion-metric-title">Просмотры</div>
                    <div className="h-8 bg-gray-300 rounded mt-1"></div>
                  </div>
                  <div className="conversion-metric animate-pulse">
                    <div className="conversion-metric-title">CTR</div>
                    <div className="h-8 bg-gray-300 rounded mt-1"></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="conversion-metric animate-pulse">
                    <div className="conversion-metric-title">В корзину</div>
                    <div className="h-8 bg-gray-300 rounded mt-1"></div>
                  </div>
                  <div className="conversion-metric animate-pulse">
                    <div className="conversion-metric-title">Конверсия</div>
                    <div className="h-8 bg-gray-300 rounded mt-1"></div>
                  </div>
                  <div className="conversion-metric animate-pulse">
                    <div className="conversion-metric-title">Заказано</div>
                    <div className="h-8 bg-gray-300 rounded mt-1"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Остатки и логистика */}
          <div className="liquid-glass rounded-xl p-3 md:p-6 lg:mt-0">
            <h2 className="text-base md:text-xl font-semibold text-text-main mb-3 md:mb-4">Остатки</h2>
            <div className="space-y-2 md:space-y-3">
              {/* Общая информация */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="metric-card">
                  <div className="text-xs text-text-subtle mb-1">Всего</div>
                  <div className="text-sm md:text-2xl font-bold text-text-main">{(data.inventory?.totalStock || 0).toLocaleString('ru-RU')}</div>
                  <div className="text-xs text-text-subtle mt-1 hidden md:block">Стоимость: {(data.inventory?.stockValue || 0).toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className="metric-card">
                  <div className="text-xs text-text-subtle mb-1">Пополнить</div>
                  <div className="text-sm md:text-2xl font-bold text-orange-600">{(data.inventory?.lowStockProducts || 0)}</div>
                  <div className="text-xs text-text-subtle mt-1 hidden md:block">Товаров менее 5 шт.</div>
                </div>
              </div>
              
              {/* Распределение по складам */}
              <div className="metric-card hidden md:block">
                <div className="text-sm font-semibold text-text-main mb-3">Распределение по складам</div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Warehouse className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-text-subtle">FBW - склады Wildberries</span>
                    </div>
                    <div className="text-xl font-bold text-text-main">{(data.inventory?.fbwStock || 0).toLocaleString('ru-RU')} шт.</div>
                    <div className="text-xs text-text-subtle mt-1">Коледино, Подольск, и др.</div>
                  </div>
                  <div className="metric-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-text-subtle">FBS - ваши склады</span>
                    </div>
                    <div className="text-xl font-bold text-text-main">{(data.inventory?.fbsStock || 0).toLocaleString('ru-RU')} шт.</div>
                    <div className="text-xs text-text-subtle mt-1">Хранение у продавца</div>
                  </div>
                </div>
                
                {/* Детализация по складам */}
                {data.inventory?.warehouseDetails && data.inventory.warehouseDetails.filter(w => w.quantity > 0 || w.inWayToClient > 0 || w.inWayFromClient > 0).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-text-main cursor-pointer hover:text-purple-600 font-medium flex items-center gap-1 py-2">
                      <ChevronDown className="w-3 h-3" />
                      Подробнее по каждому складу ({data.inventory.warehouseDetails.filter(w => w.quantity > 0 || w.inWayToClient > 0 || w.inWayFromClient > 0).length})
                    </summary>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                      {data.inventory.warehouseDetails.filter(w => w.quantity > 0 || w.inWayToClient > 0 || w.inWayFromClient > 0).map((warehouse, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white/40 p-3 rounded-lg border border-white/30"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              {warehouse.isFBW ? (
                                <Warehouse className="w-4 h-4 text-slate-600" />
                              ) : (
                                <Building2 className="w-4 h-4 text-slate-600" />
                              )}
                              <span className="font-semibold text-text-main text-sm">
                                {warehouse.name}
                              </span>
                            </div>
                            <span className="font-bold text-text-main text-lg">
                              {warehouse.quantity.toLocaleString('ru-RU')} шт.
                            </span>
                          </div>
                          {(warehouse.inWayToClient > 0 || warehouse.inWayFromClient > 0) && (
                            <div className="text-xs text-text-subtle flex gap-3 mt-2 pt-2 border-t border-white/20">
                              {warehouse.inWayToClient > 0 && (
                                <span>→ {warehouse.inWayToClient} к клиенту</span>
                              )}
                              {warehouse.inWayFromClient > 0 && (
                                <span>← {warehouse.inWayFromClient} возвратов</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              
              {/* Товары в пути */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="metric-card">
                  <div className="flex items-center gap-1 mb-1">
                    <Truck className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                    <span className="text-xs text-text-subtle truncate">В пути к клиенту</span>
                  </div>
                  <div className="text-sm md:text-2xl font-bold text-green-600">{(data.inventory?.inTransit || 0).toLocaleString('ru-RU')}</div>
                  <div className="text-xs text-text-subtle mt-1 hidden md:block">Доставка заказов</div>
                </div>
                <div className="metric-card">
                  <div className="flex items-center gap-1 mb-1">
                    <RotateCcw className="w-3 h-3 md:w-4 md:h-4 text-orange-600" />
                    <span className="text-xs text-text-subtle truncate">Возвраты в пути</span>
                  </div>
                  <div className="text-sm md:text-2xl font-bold text-orange-600">{(data.inventory?.inReturn || 0).toLocaleString('ru-RU')}</div>
                  <div className="text-xs text-text-subtle mt-1 hidden md:block">От клиентов на склад</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Поисковые запросы и Категории */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="liquid-glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-text-main mb-4">Топ поисковых запросов</h2>
          <div className="space-y-2">
            {(data.topSearchQueries || []).slice(0, 4).map((query: any, index: number) => (
              <div key={index} className="metric-card flex justify-between items-center">
                <span className="text-sm text-text-subtle">"{query.query}"</span>
                <span className="text-sm font-semibold text-text-main">{query.frequency.toLocaleString('ru-RU')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="liquid-glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-text-main mb-4">Производительность категорий</h2>
          <div className="space-y-2">
            {(data.categoryPerformance || []).slice(0, 4).map((category: any, index: number) => (
              <div key={index} className="metric-card flex justify-between items-center">
                <span className="text-sm text-text-subtle">{category.category}</span>
                <span className="text-sm font-semibold text-text-main">{category.revenue.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модальное окно с подробной аналитикой товара */}
      {selectedProduct && (
        <ProductFinancialDetails 
          nmId={selectedProduct.nmID}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
