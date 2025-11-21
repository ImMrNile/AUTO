'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TestAIPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Загрузка списка товаров
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products/user');
        if (!response.ok) throw new Error('Ошибка загрузки товаров');
        
        const data = await response.json();
        setProducts(data.products || []);
        
        // Проверяем URL параметр nmId
        const nmIdFromUrl = searchParams.get('nmId');
        if (nmIdFromUrl && data.products) {
          // Находим товар по nmId
          const productByNmId = data.products.find((p: any) => p.wbNmId === nmIdFromUrl);
          if (productByNmId) {
            setSelectedProductId(productByNmId.id);
          }
        } else if (data.products && data.products.length > 0) {
          // Автоматически выбираем первый товар
          setSelectedProductId(data.products[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [searchParams]);

  const handleTest = async () => {
    if (!selectedProductId) {
      setError('Выберите товар');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/optimize-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          minProfitPercent: 30,
          autoApply: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка запроса');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🤖 Тест AI оптимизации</h1>

      <div className="max-w-4xl">
        {loadingProducts ? (
          <div className="text-center py-8">
            <p>Загрузка товаров...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 p-6 bg-white border rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Выберите товар</h2>
              
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-4 py-2 border rounded mb-4"
              >
                <option value="">-- Выберите товар --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.price}₽ (ID: {product.id.substring(0, 8)}...)
                  </option>
                ))}
              </select>

              <p className="text-sm text-gray-500 mb-4">
                Найдено товаров: {products.length}
              </p>

              <button
                onClick={handleTest}
                disabled={loading || !selectedProductId}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {loading ? '⏳ Анализирую...' : '🚀 Запустить оптимизацию'}
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-semibold">❌ Ошибка:</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Товар */}
                <div className="p-6 bg-white border rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">🏷️ Товар</h2>
                  <div className="space-y-2">
                    <p><span className="font-semibold">Название:</span> {result.product.name}</p>
                    <p><span className="font-semibold">Артикул WB:</span> {result.product.wbNmId || 'не указан'}</p>
                    <p><span className="font-semibold">ID:</span> {result.product.id}</p>
                  </div>
                </div>

                {/* Цены */}
                <div className="p-6 bg-white border rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">💰 Цены</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Текущая цена</p>
                      <p className="text-2xl font-bold">{result.currentPrice}₽</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Оптимальная цена</p>
                      <p className={`text-2xl font-bold ${result.optimalPrice > result.currentPrice ? 'text-green-600' : 'text-yellow-600'}`}>
                        {result.optimalPrice}₽
                      </p>
                    </div>
                  </div>
                </div>

                {/* Детализация расходов */}
                <div className="p-6 bg-white border rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">📊 Детализация расходов</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Себестоимость:</span>
                      <span className="font-semibold">{result.breakdown.costPrice}₽</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Комиссия WB:</span>
                      <span className="font-semibold">-{result.breakdown.wbCommission}₽</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Логистика:</span>
                      <span className="font-semibold">-{result.breakdown.logistics}₽</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Хранение:</span>
                      <span className="font-semibold">-{result.breakdown.storage}₽</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Приемка:</span>
                      <span className="font-semibold">-{result.breakdown.acceptance}₽</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Налог (УСН):</span>
                      <span className="font-semibold">-{result.breakdown.tax}₽</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">К переводу:</span>
                      <span className="font-bold text-blue-600">{result.breakdown.forPay}₽</span>
                    </div>
                    <div className="flex justify-between text-xl">
                      <span className="font-semibold">Чистая прибыль:</span>
                      <span className={`font-bold ${result.breakdown.profitPercent >= 30 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.breakdown.netProfit}₽ ({result.breakdown.profitPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Рекомендация */}
                <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">💡 Рекомендация</h2>
                  <p className="text-lg">{result.recommendation}</p>
                </div>

                {/* GPT-5 анализ */}
                {result.aiAnalysis && (
                  <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">🤖 Анализ GPT-5</h2>
                    <pre className="whitespace-pre-wrap text-sm">{result.aiAnalysis}</pre>
                  </div>
                )}

                {result.warning && (
                  <div className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <h2 className="text-xl font-bold mb-4">⚠️ Предупреждение</h2>
                    <p>{result.warning}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
