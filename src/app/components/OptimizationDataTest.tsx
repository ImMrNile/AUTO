'use client';

import { useState } from 'react';
import { Search, TrendingUp, Target, DollarSign, BarChart3, Loader2 } from 'lucide-react';

interface OptimizationData {
  productId: string;
  nmId: number;
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

export default function OptimizationDataTest() {
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptimizationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimizationData = async () => {
    if (!productId.trim()) {
      setError('Введите ID товара');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/products/${productId}/optimization-data`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔍 Тестирование данных оптимизации
          </h1>
          <p className="text-gray-600">
            Получите все данные для оптимизации товара с WB API
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-300 p-6 shadow-lg mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Введите ID товара"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && fetchOptimizationData()}
            />
            <button
              onClick={fetchOptimizationData}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Получить данные
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">📦 Информация о товаре</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Product ID:</span>
                  <span className="ml-2 font-mono text-gray-900">{data.productId}</span>
                </div>
                <div>
                  <span className="text-gray-600">NM ID:</span>
                  <span className="ml-2 font-mono text-gray-900">{data.nmId}</span>
                </div>
              </div>
            </div>

            {/* Search Queries */}
            <DataSection
              title="Поисковые запросы"
              icon={<Search className="w-6 h-6" />}
              data={data.searchQueries}
              error={data.errors.searchQueries}
              color="blue"
            />

            {/* Conversion */}
            <DataSection
              title="Конверсия"
              icon={<TrendingUp className="w-6 h-6" />}
              data={data.conversion}
              error={data.errors.conversion}
              color="green"
            />

            {/* Campaigns */}
            <DataSection
              title="Рекламные кампании"
              icon={<Target className="w-6 h-6" />}
              data={data.campaigns}
              error={data.errors.campaigns}
              color="purple"
            />

            {/* Sales Funnel */}
            <DataSection
              title="Воронка продаж"
              icon={<BarChart3 className="w-6 h-6" />}
              data={data.salesFunnel}
              error={data.errors.salesFunnel}
              color="orange"
            />

            {/* Keywords */}
            <DataSection
              title="Ключевые слова"
              icon={<DollarSign className="w-6 h-6" />}
              data={data.keywords}
              error={data.errors.keywords}
              color="pink"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DataSection({ 
  title, 
  icon, 
  data, 
  error, 
  color 
}: { 
  title: string; 
  icon: React.ReactNode; 
  data: any; 
  error: string | null; 
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-300 text-blue-900',
    green: 'from-green-50 to-green-100 border-green-300 text-green-900',
    purple: 'from-purple-50 to-purple-100 border-purple-300 text-purple-900',
    orange: 'from-orange-50 to-orange-100 border-orange-300 text-orange-900',
    pink: 'from-pink-50 to-pink-100 border-pink-300 text-pink-900'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} border-2 rounded-lg p-6`}>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-300 rounded p-3">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      ) : data ? (
        <pre className="bg-white rounded p-4 overflow-auto max-h-96 text-xs border border-gray-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-gray-500 italic">Нет данных</p>
      )}
    </div>
  );
}
