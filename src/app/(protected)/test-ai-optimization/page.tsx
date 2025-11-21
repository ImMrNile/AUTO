'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Search, ShoppingCart, Target, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  wbNmId: string | null;
  price: number;
}

interface OptimizationData {
  productId: string;
  nmId: string;
  searchQueries: any;
  conversion: any;
  campaigns: any;
  salesFunnel: any;
  keywords: any;
  errors: {
    searchQueries: string | null;
    conversion: string | null;
    campaigns: string | null;
    salesFunnel: string | null;
    keywords: string | null;
  };
}

export default function TestAIOptimizationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [smartOptimizationData, setSmartOptimizationData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [useSmartSearch, setUseSmartSearch] = useState(false);

  // Загрузка списка товаров
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Ошибка загрузки товаров');
      
      const data = await response.json();
      // Фильтруем только опубликованные товары
      const publishedProducts = data.filter((p: Product) => p.wbNmId);
      setProducts(publishedProducts);
      
      if (publishedProducts.length > 0) {
        setSelectedProduct(publishedProducts[0].id);
      }
    } catch (err) {
      setError('Не удалось загрузить товары');
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOptimizationData = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    setUseSmartSearch(false);
    setError('');
    setOptimizationData(null);
    setSmartOptimizationData(null);

    try {
      const response = await fetch(`/api/products/${selectedProduct}/optimization-data`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения данных');
      }

      const result = await response.json();
      setOptimizationData(result.data);
    } catch (err: any) {
      setError(err.message);
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmartOptimizationData = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    setUseSmartSearch(true);
    setError('');
    setSmartOptimizationData(null);
    setOptimizationData(null);

    try {
      console.log('🧠 Запуск умного поиска данных...');
      const response = await fetch(`/api/products/${selectedProduct}/smart-optimization-data`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка получения данных');
      }

      const result = await response.json();
      console.log('✅ Умный поиск завершен:', result);
      setSmartOptimizationData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка товаров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤖 Тест AI Оптимизации
          </h1>
          <p className="text-gray-600">
            Проверка получения данных для AI анализа товаров
          </p>
        </div>

        {/* Выбор товара */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Выберите товар</h2>
          
          {products.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">Нет опубликованных товаров на WB</p>
              <p className="text-sm text-gray-500 mt-2">
                Опубликуйте товар на Wildberries для тестирования
              </p>
            </div>
          ) : (
            <>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (nmID: {product.wbNmId})
                  </option>
                ))}
              </select>

              <div className="space-y-3">
                <button
                  onClick={fetchOptimizationData}
                  disabled={loading || !selectedProduct}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && !useSmartSearch ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Загрузка данных...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      Обычный поиск (текущая неделя)
                    </>
                  )}
                </button>

                <button
                  onClick={fetchSmartOptimizationData}
                  disabled={loading || !selectedProduct}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && useSmartSearch ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Умный поиск данных...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      🧠 Умный поиск (до 12 недель назад)
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-500 text-center mt-2">
                  <p><strong>Обычный:</strong> данные за последнюю неделю</p>
                  <p><strong>Умный:</strong> ищет данные в прошлом + кампании категории</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Ошибка</h3>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                
                {error.includes('Токен WB API не найден') && (
                  <div className="bg-white border border-red-300 rounded-lg p-4 mt-3">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Как исправить:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Откройте раздел <a href="/cabinets" className="text-blue-600 hover:underline font-semibold">Кабинеты WB</a></li>
                      <li>Добавьте или обновите токен WB API</li>
                      <li>Привяжите товар к кабинету с токеном</li>
                      <li>Вернитесь на эту страницу и попробуйте снова</li>
                    </ol>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-blue-800">
                        <strong>Где получить токен WB API:</strong><br/>
                        Личный кабинет WB Seller → Настройки → Доступ к API → Создать токен
                      </p>
                    </div>
                  </div>
                )}
                
                {error.includes('Товар не опубликован') && (
                  <div className="bg-white border border-red-300 rounded-lg p-4 mt-3">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Как исправить:</h4>
                    <p className="text-sm text-gray-700">
                      Этот товар еще не опубликован на Wildberries. Опубликуйте товар, чтобы получить nmID и данные для анализа.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Результаты умного поиска */}
        {smartOptimizationData && (
          <div className="space-y-6">
            {/* Информация о стратегии */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-green-900 mb-4">
                🧠 Результаты умного поиска
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Стратегия</p>
                  <p className="font-bold text-lg text-green-700">
                    {smartOptimizationData.strategy === 'historical' ? '📊 Исторические данные' : '📂 Данные категории'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Недель проверено</p>
                  <p className="font-bold text-lg text-green-700">{smartOptimizationData.weeksSearched}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Дней данных</p>
                  <p className="font-bold text-lg text-green-700">{smartOptimizationData.dataPoints}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-600">Категория</p>
                  <p className="font-semibold text-sm text-gray-900">{smartOptimizationData.category?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-800">{smartOptimizationData.message}</p>
              </div>
            </div>

            {/* Кампании товара */}
            {smartOptimizationData.productCampaigns && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">
                  🎯 Кампании товара
                </h2>
                
                {/* Сводка */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Всего</p>
                    <p className="text-2xl font-bold text-blue-600">{smartOptimizationData.productCampaigns.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Активных</p>
                    <p className="text-2xl font-bold text-green-600">{smartOptimizationData.productCampaigns.summary.active}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">На паузе</p>
                    <p className="text-2xl font-bold text-yellow-600">{smartOptimizationData.productCampaigns.summary.paused}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Завершенных</p>
                    <p className="text-2xl font-bold text-gray-600">{smartOptimizationData.productCampaigns.summary.completed}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Готовых</p>
                    <p className="text-2xl font-bold text-purple-600">{smartOptimizationData.productCampaigns.summary.ready}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Ключевых слов</p>
                    <p className="text-2xl font-bold text-indigo-600">{smartOptimizationData.productCampaigns.totalKeywords || 0}</p>
                  </div>
                </div>

                {/* Список кампаний по статусам */}
                {Object.entries(smartOptimizationData.productCampaigns.groupedByStatus).map(([status, campaigns]: [string, any]) => {
                  if (!campaigns || campaigns.length === 0) return null;
                  
                  const statusColors: any = {
                    active: 'bg-green-100 text-green-800 border-green-300',
                    paused: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    completed: 'bg-gray-100 text-gray-800 border-gray-300',
                    ready: 'bg-purple-100 text-purple-800 border-purple-300',
                    other: 'bg-blue-100 text-blue-800 border-blue-300'
                  };

                  const statusNames: any = {
                    active: '🟢 Активные',
                    paused: '🟡 На паузе',
                    completed: '⚫ Завершенные',
                    ready: '🟣 Готовые',
                    other: '🔵 Другие'
                  };

                  return (
                    <div key={status} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">{statusNames[status]} ({campaigns.length})</h3>
                      <div className="space-y-3">
                        {campaigns.map((campaign: any) => (
                          <div key={campaign.advertId} className={`border-2 rounded-lg p-4 ${statusColors[status]}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-lg">{campaign.name || 'Без названия'}</p>
                                <p className="text-sm text-gray-600">ID: {campaign.advertId} | Тип: {campaign.type}</p>
                              </div>
                              {campaign.dailyBudget && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-700">{campaign.dailyBudget}₽/день</p>
                                </div>
                              )}
                            </div>
                            {campaign.autoParams?.nms && campaign.autoParams.nms.length > 0 && (
                              <div className="mt-2 text-sm">
                                <p className="text-gray-700">📦 Товары: <span className="font-mono">{campaign.autoParams.nms.join(', ')}</span></p>
                              </div>
                            )}
                            {campaign.autoParams?.subject && (
                              <div className="mt-1 text-sm">
                                <p className="text-gray-700">📂 Категория: {campaign.autoParams.subject.name} (ID: {campaign.autoParams.subject.id})</p>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-600">
                              <p>Создана: {new Date(campaign.createTime).toLocaleDateString('ru-RU')}</p>
                              {campaign.startTime && <p>Запущена: {new Date(campaign.startTime).toLocaleDateString('ru-RU')}</p>}
                            </div>
                            
                            {/* Ключевые слова кампании */}
                            {campaign.keywords && campaign.keywords.length > 0 && (
                              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                <p className="text-sm font-semibold text-gray-900 mb-2">
                                  🔑 Ключевые слова ({campaign.keywords.length})
                                </p>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {campaign.keywords
                                    .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                                    .slice(0, 30)
                                    .map((keyword: any, idx: number) => {
                                      // Расчет затрат: cpc * clicks или cpm * views / 1000
                                      const totalSpent = keyword.cpc && keyword.clicks ? 
                                        keyword.cpc * keyword.clicks : 
                                        (keyword.cpm && keyword.views ? keyword.cpm * keyword.views / 1000 : 0);
                                      
                                      // ROI можно рассчитать только если знаем доход (пока нет в API)
                                      const roi = null;
                                      
                                      const conversionRate = keyword.clicks && keyword.orders ?
                                        (keyword.orders / keyword.clicks * 100).toFixed(1) : null;
                                      
                                      return (
                                        <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-100">
                                          <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-gray-900">
                                              {keyword.norm_query || keyword.keyword || keyword.name}
                                            </span>
                                            {roi && (
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                parseFloat(roi) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                              }`}>
                                                ROI: {roi}%
                                              </span>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                                            <div>
                                              <span className="text-gray-500">👁️</span> {keyword.views || 0}
                                            </div>
                                            <div>
                                              <span className="text-gray-500">👆</span> {keyword.clicks || 0}
                                            </div>
                                            <div>
                                              <span className="text-gray-500">🛒</span> {keyword.atbs || keyword.shks || 0}
                                            </div>
                                            <div>
                                              <span className="text-gray-500">📦</span> {keyword.orders || 0}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 mt-1">
                                            <div title="CTR">
                                              📈 {keyword.ctr ? `${keyword.ctr.toFixed(1)}%` : '0%'}
                                            </div>
                                            <div title="CPC">
                                              💰 {keyword.cpc ? `${keyword.cpc}₽` : (keyword.cpm ? `CPM ${keyword.cpm}₽` : '0₽')}
                                            </div>
                                            <div title="Расходы">
                                              💸 {totalSpent > 0 ? `${Math.round(totalSpent)}₽` : '0₽'}
                                            </div>
                                            <div title="Конверсия">
                                              {conversionRate ? `✅ ${conversionRate}%` : '—'}
                                            </div>
                                          </div>
                                          {keyword.avg_pos && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              📍 Позиция: {keyword.avg_pos}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                                {campaign.keywords.length > 30 && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    + еще {campaign.keywords.length - 30} ключевых слов
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Агрегированные данные */}
            {smartOptimizationData.data && (
              <div className="space-y-4">
                <SmartDataCard
                  title="🔍 Поисковые запросы"
                  data={smartOptimizationData.data.searchQueries || smartOptimizationData.data}
                />
                <SmartDataCard
                  title="📊 Конверсия"
                  data={smartOptimizationData.data.conversion}
                />
                <SmartDataCard
                  title="📢 Кампании (статистика)"
                  data={smartOptimizationData.data.campaigns}
                />
                <SmartDataCard
                  title="🔑 Ключевые слова"
                  data={smartOptimizationData.data.keywords}
                />
                <SmartDataCard
                  title="🛒 Воронка продаж"
                  data={smartOptimizationData.data.salesFunnel}
                />
              </div>
            )}
          </div>
        )}

        {/* Результаты обычного поиска */}
        {optimizationData && (
          <div className="space-y-6">
            {/* Информация о товаре */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">📦 Информация о товаре</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Product ID</p>
                  <p className="font-mono text-sm">{optimizationData.productId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">WB nmID</p>
                  <p className="font-mono text-sm">{optimizationData.nmId}</p>
                </div>
              </div>
            </div>

            {/* Поисковые запросы */}
            <DataCard
              title="🔍 Поисковые запросы"
              icon={<Search className="w-6 h-6" />}
              data={optimizationData.searchQueries}
              error={optimizationData.errors.searchQueries}
            />

            {/* Конверсия */}
            <DataCard
              title="📊 Данные конверсии"
              icon={<TrendingUp className="w-6 h-6" />}
              data={optimizationData.conversion}
              error={optimizationData.errors.conversion}
            />

            {/* Рекламные кампании */}
            <DataCard
              title="📢 Рекламные кампании"
              icon={<Target className="w-6 h-6" />}
              data={optimizationData.campaigns}
              error={optimizationData.errors.campaigns}
            />

            {/* Воронка продаж */}
            <DataCard
              title="🛒 Воронка продаж"
              icon={<ShoppingCart className="w-6 h-6" />}
              data={optimizationData.salesFunnel}
              error={optimizationData.errors.salesFunnel}
            />

            {/* Ключевые слова */}
            <DataCard
              title="🔑 Статистика ключевых слов"
              icon={<Target className="w-6 h-6" />}
              data={optimizationData.keywords}
              error={optimizationData.errors.keywords}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DataCard({ 
  title, 
  icon, 
  data, 
  error 
}: { 
  title: string; 
  icon: React.ReactNode; 
  data: any; 
  error: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">{icon}</div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {error ? (
              <span className="text-red-600 text-sm">❌ Ошибка</span>
            ) : data ? (
              <span className="text-green-600 text-sm">✅ Получено</span>
            ) : (
              <span className="text-gray-400 text-sm">⚪ Нет данных</span>
            )}
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {error ? (
            <div className="text-red-600 text-sm">
              <p className="font-semibold mb-2">Ошибка получения данных:</p>
              <p>{error}</p>
            </div>
          ) : data ? (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">Данные отсутствуют</p>
          )}
        </div>
      )}
    </div>
  );
}

function SmartDataCard({ 
  title, 
  data 
}: { 
  title: string; 
  data: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-green-200">
      <div 
        className="p-6 cursor-pointer hover:bg-green-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-3">
            {data ? (
              <span className="text-green-600 text-sm font-semibold">✅ Получено</span>
            ) : (
              <span className="text-gray-400 text-sm">⚪ Нет данных</span>
            )}
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-green-200 p-6 bg-green-50">
          {data ? (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">Данные отсутствуют</p>
          )}
        </div>
      )}
    </div>
  );
}
