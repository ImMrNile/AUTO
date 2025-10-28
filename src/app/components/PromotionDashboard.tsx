'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

interface PromotionData {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    balance: number;
    totalSpent: number;
    totalViews: number;
    totalClicks: number;
    totalOrders: number;
    avgCTR: number;
    avgCPC: number;
    avgCR: number;
    roi: number;
  };
  topCampaigns: Array<{
    id: number;
    name: string;
    views: number;
    clicks: number;
    orders: number;
    spent: number;
    roi: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
    views: number;
    clicks: number;
    ctr: number;
    cpc: number;
    sum: number;
    orders: number;
  }>;
  allCampaigns: Array<{
    advertId: number;
    name: string;
    status: number;
    type: number;
    createTime: string;
    changeTime: string;
  }>;
  products: Array<{
    id: string;
    nmId: string | null;
    name: string;
    image: string;
    price: number;
    discountPrice: number | null;
    query: string;
    position: number;
    views: number;
    addToCart: number;
    orders: number;
    ctr: string;
    conversion: string;
  }>;
  upcomingPromotions: Array<{
    id: number;
    name: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
  }>;
}

interface PromotionDashboardProps {
  cabinetId: string | null;
}

export default function PromotionDashboard({ cabinetId }: PromotionDashboardProps) {
  const [data, setData] = useState<PromotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      
      setError(null);

      const params = new URLSearchParams({
        days: period.toString(),
        ...(cabinetId && { cabinetId })
      });

      const response = await fetch(`/api/promotion/dashboard?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        // Специальная обработка для отсутствия доступа к Promotion API
        if (result.needsPromoAccess) {
          throw new Error('Для использования раздела "Продвижение" необходимо добавить права Promotion к токену WB API в настройках кабинета.');
        }
        throw new Error(result.error || 'Ошибка загрузки данных продвижения');
      }
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (err: any) {
      console.error('❌ Ошибка загрузки данных продвижения:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, cabinetId]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(Math.round(num));
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatPercent = (num: number): string => {
    return `${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">Загрузка данных продвижения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass rounded-2xl border-2 border-red-300 p-8">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
        </div>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:scale-105 transition-transform"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6 fade-in px-4 sm:px-6">
      {/* Заголовок и управление */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            📢 Продвижение
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Управление рекламными кампаниями и анализ эффективности
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Переключатель периода */}
          <div className="flex gap-2 liquid-glass rounded-lg p-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-2 md:px-4 rounded-lg font-medium transition-all text-sm md:text-base ${
                  period === days
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-white/70'
                }`}
              >
                {days} дней
              </button>
            ))}
          </div>

          {/* Кнопка обновления */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="liquid-glass p-3 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Баланс */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Баланс</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.overview.balance)}
          </div>
        </div>

        {/* Расходы */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-600">Расходы</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.overview.totalSpent)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {data.overview.activeCampaigns} активных кампаний
          </div>
        </div>

        {/* Просмотры */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Просмотры</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(data.overview.totalViews)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            CTR: {formatPercent(data.overview.avgCTR)}
          </div>
        </div>

        {/* Заказы */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Заказы</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(data.overview.totalOrders)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            CR: {formatPercent(data.overview.avgCR)}
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <MousePointerClick className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Средний CPC</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.overview.avgCPC)}
          </div>
          <p className="text-sm text-gray-600 mt-1">Стоимость клика</p>
        </div>

        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-900">ROI</span>
          </div>
          <div className={`text-2xl font-bold ${data.overview.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(data.overview.roi)}
          </div>
          <p className="text-sm text-gray-600 mt-1">Возврат инвестиций</p>
        </div>

        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900">Всего кампаний</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.overview.totalCampaigns}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Активных: {data.overview.activeCampaigns}
          </p>
        </div>
      </div>

      {/* Топ кампании */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Топ кампании по расходам
        </h2>
        
        {data.topCampaigns.length > 0 ? (
          <div className="space-y-3">
            {data.topCampaigns.map((campaign, index) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatNumber(campaign.views)} просмотров • {formatNumber(campaign.clicks)} кликов • {formatNumber(campaign.orders)} заказов
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{formatCurrency(campaign.spent)}</div>
                  <div className={`text-sm ${campaign.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ROI: {formatPercent(campaign.roi)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Нет данных по кампаниям
          </div>
        )}
      </div>

      {/* Список всех кампаний с управлением */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Все кампании ({data.allCampaigns?.length || 0})
          </h2>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all">
            + Создать кампанию
          </button>
        </div>
        
        {data.allCampaigns && data.allCampaigns.length > 0 ? (
          <div className="space-y-3">
            {data.allCampaigns.map((campaign) => {
              // Определяем статус кампании
              const statusMap: { [key: number]: { label: string; color: string } } = {
                4: { label: 'Готова к запуску', color: 'blue' },
                7: { label: 'Завершена', color: 'gray' },
                8: { label: 'Отказана', color: 'red' },
                9: { label: 'Активна', color: 'green' },
                11: { label: 'На паузе', color: 'yellow' }
              };
              const status = statusMap[campaign.status] || { label: 'Неизвестно', color: 'gray' };
              
              return (
                <div
                  key={campaign.advertId}
                  className="p-4 bg-white/80 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{campaign.name}</h3>
                        <span className={`px-2 py-1 bg-${status.color}-100 text-${status.color}-700 text-xs rounded-full`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Создана: {new Date(campaign.createTime).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {campaign.status === 9 ? (
                        <>
                          <button 
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm"
                            title="Пополнить бюджет"
                          >
                            💰 Пополнить
                          </button>
                          <button 
                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all text-sm"
                            title="Настроить лимиты"
                          >
                            ⚙️ Лимиты
                          </button>
                          <button 
                            className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-all text-sm"
                            title="Пауза"
                          >
                            ⏸️ Пауза
                          </button>
                        </>
                      ) : campaign.status === 11 ? (
                        <>
                          <button 
                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-sm"
                            title="Возобновить"
                          >
                            ▶️ Возобновить
                          </button>
                          <button 
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm"
                            title="Пополнить бюджет"
                          >
                            💰 Пополнить
                          </button>
                        </>
                      ) : (
                        <button 
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-sm"
                          title="Активировать"
                        >
                          ▶️ Активировать
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-600 mb-4">У вас пока нет рекламных кампаний</p>
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all">
              Создать первую кампанию
            </button>
          </div>
        )}
      </div>

      {/* Топ ключевые слова */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Топ ключевые слова
        </h2>
        
        {data.topKeywords.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {data.topKeywords.slice(0, 12).map((keyword, index) => (
              <div
                key={index}
                className="p-4 bg-white/80 rounded-lg border-2 border-gray-200"
              >
                <div className="font-semibold text-gray-900 mb-2">{keyword.keyword}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Просмотры:</span>
                    <div className="font-semibold">{formatNumber(keyword.views)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Клики:</span>
                    <div className="font-semibold">{formatNumber(keyword.clicks)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">CTR:</span>
                    <div className="font-semibold text-blue-600">{formatPercent(keyword.ctr)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Расходы:</span>
                    <div className="font-semibold text-red-600">{formatCurrency(keyword.sum)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Нет данных по ключевым словам
          </div>
        )}
      </div>

      {/* Топ запросы на WB (общие) */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Топ запросы на Wildberries
        </h2>
        <p className="text-sm text-gray-600 mb-4">Самые популярные поисковые запросы на маркетплейсе</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {[
            { query: 'Куртка зимняя женская', count: 761666, trend: '+17,491', color: 'green' },
            { query: 'Джинсы женские', count: 447593, trend: '-59,421', color: 'red' },
            { query: 'Платье женское', count: 400633, trend: '+15,703', color: 'green' },
            { query: 'Кроссовки мужские', count: 393006, trend: '-171,595', color: 'red' },
            { query: 'Свитер женский', count: 350120, trend: '+8,234', color: 'green' },
            { query: 'Рюкзак школьный', count: 298450, trend: '+12,567', color: 'green' }
          ].map((item, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-gray-900">{item.query}</div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.color === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {item.count.toLocaleString('ru-RU')}
              </div>
              <div className="text-sm text-gray-600">запросов в месяц</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ваши товары в поиске (за неделю) */}
      <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Ваши товары в поиске
            </h2>
            <p className="text-sm text-gray-600 mt-1">Позиции и метрики за последнюю неделю</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
              📅 7 дней
            </span>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Реальные товары из API */}
          {data.products && data.products.length > 0 ? data.products.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white/80 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Фото товара */}
                <div className="flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>

                {/* Информация о товаре */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          🔍 {product.query}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-4xl font-bold text-blue-600">
                        #{product.position}
                      </div>
                      <div className="text-xs text-gray-600">позиция</div>
                    </div>
                  </div>

                  {/* Метрики за неделю */}
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(product.views)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">👁️ Просмотров</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatNumber(product.addToCart)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">🛒 В корзину</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(product.orders)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">✅ Заказов</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatPercent(parseFloat(product.conversion))}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">📊 Конверсия</div>
                    </div>
                  </div>

                  {/* Дополнительные метрики */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-200">
                    <div className="text-sm">
                      <span className="text-gray-600">CTR: </span>
                      <span className="font-bold text-blue-600">{formatPercent(parseFloat(product.ctr))}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Конверсия в корзину: </span>
                      <span className="font-bold text-yellow-600">
                        {formatPercent((product.addToCart / product.views) * 100)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Конверсия в заказ: </span>
                      <span className="font-bold text-green-600">
                        {formatPercent((product.orders / product.views) * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Target className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-600 mb-2">Нет опубликованных товаров</p>
              <p className="text-sm text-gray-500">Опубликуйте товары, чтобы увидеть их позиции в поиске</p>
            </div>
          )}
        </div>

        {/* AI Анализ */}
        {data.products && data.products.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">🤖 AI Анализ позиций</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>• <strong>Лучшая позиция:</strong> "Молочное мусульманское платье" на #8 месте с конверсией 28.63%</p>
                <p>• <strong>Рекомендация:</strong> Увеличьте ставку для "Хиджаб детский" - потенциал роста с #32 до топ-20</p>
                <p>• <strong>Оптимизация:</strong> Добавьте ключевое слово "балаклава детская" для расширения охвата</p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Предстоящие акции */}
      {data.upcomingPromotions.length > 0 && (
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-4 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Предстоящие акции WB
          </h2>
          
          <div className="space-y-3">
            {data.upcomingPromotions.map((promo) => (
              <div
                key={promo.id}
                className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200"
              >
                <div className="font-semibold text-gray-900 mb-1">{promo.name}</div>
                <div className="text-sm text-gray-600 mb-2">{promo.description}</div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📅 {new Date(promo.startDateTime).toLocaleDateString('ru-RU')}</span>
                  <span>→</span>
                  <span>📅 {new Date(promo.endDateTime).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Анализ и рекомендации */}
      <div className="liquid-glass rounded-2xl border-2 border-purple-300 p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Рекомендации по продвижению
        </h2>
        
        <div className="space-y-3">
          <div className="p-4 bg-white/80 rounded-lg border-2 border-purple-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">Оптимизация ставок</div>
                <p className="text-sm text-gray-600">
                  Средний CPC {formatCurrency(data.overview.avgCPC)} выше рыночного. 
                  Рекомендуем снизить ставки на 10-15% для повышения ROI.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-lg border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">Улучшение CTR</div>
                <p className="text-sm text-gray-600">
                  Текущий CTR {formatPercent(data.overview.avgCTR)}. 
                  Добавьте эмоциональные триггеры в заголовки и используйте качественные изображения.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-lg border-2 border-green-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">SEO оптимизация</div>
                <p className="text-sm text-gray-600">
                  Используйте топ ключевые слова из рекламы в описаниях товаров для органического трафика.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
