'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  BarChart3,
  Clock
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  wbNmId: string;
  price: number;
  discountPrice: number;
  generatedName: string;
  seoDescription: string;
}

interface AIAnalysis {
  diagnosis: string;
  problems: Array<{
    category: 'photos' | 'description' | 'seo' | 'price';
    severity: 'critical' | 'important' | 'minor';
    description: string;
    impact: string;
  }>;
  recommendations: {
    critical: Array<{
      action: string;
      reason: string;
      effect: string;
    }>;
    important: Array<{
      action: string;
      reason: string;
      effect: string;
    }>;
    improvements: Array<{
      action: string;
      reason: string;
      effect: string;
    }>;
  };
  forecast: {
    conversionChange: string;
    salesChange: string;
    timeline: string;
  };
}

interface Promotion {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string;
  endDate: string;
  currentSales: number;
  currentConversion: number;
  currentCTR: number;
  initialSales: number;
  initialConversion: number;
  initialCTR: number;
  checksPerformed: number;
  actionsApplied: number;
  lastReport?: {
    diagnosis: string;
    createdAt: string;
  };
}

export default function AIImprovePage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Загрузить товар
      const productRes = await fetch(`/api/products/${productId}`);
      if (!productRes.ok) throw new Error('Товар не найден');
      const productData = await productRes.json();
      setProduct(productData);

      // Проверить есть ли активное продвижение
      const promotionRes = await fetch(`/api/promotions?productId=${productId}`);
      if (promotionRes.ok) {
        const promotionData = await promotionRes.json();
        if (promotionData.length > 0) {
          setPromotion(promotionData[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    try {
      setAnalyzing(true);
      setError(null);

      const res = await fetch(`/api/ai/analyze-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      if (!res.ok) throw new Error('Ошибка анализа');

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function startPromotion() {
    try {
      setStarting(true);
      setError(null);

      const res = await fetch(`/api/promotions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          duration: 7,
          checkInterval: 4
        })
      });

      if (!res.ok) throw new Error('Ошибка запуска продвижения');

      const data = await res.json();
      setPromotion(data.promotion);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function togglePromotion() {
    if (!promotion) return;

    try {
      const newStatus = promotion.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      
      const res = await fetch(`/api/promotions/${promotion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Ошибка изменения статуса');

      const data = await res.json();
      setPromotion(data.promotion);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8">
        <div className="liquid-glass rounded-2xl border-2 border-red-300 p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Товар не найден</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const progress = promotion ? (promotion.checksPerformed / 42) * 100 : 0;
  const improvement = promotion 
    ? ((promotion.currentSales - promotion.initialSales) / promotion.initialSales * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 liquid-glass rounded-lg hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              🤖 AI Улучшение товара
            </h1>
            <p className="text-gray-600 mt-1">{product.name}</p>
          </div>
        </div>

        {/* Статус продвижения */}
        {promotion ? (
          <div className="liquid-glass rounded-2xl border-2 border-purple-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {promotion.status === 'ACTIVE' ? '🟢' : '⏸️'} AI Агент {promotion.status === 'ACTIVE' ? 'работает' : 'на паузе'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Запущен: {new Date(promotion.startDate).toLocaleDateString('ru')} • 
                  Завершится: {new Date(promotion.endDate).toLocaleDateString('ru')}
                </p>
              </div>
              <button
                onClick={togglePromotion}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  promotion.status === 'ACTIVE'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {promotion.status === 'ACTIVE' ? (
                  <><Pause className="w-4 h-4" /> Приостановить</>
                ) : (
                  <><Play className="w-4 h-4" /> Возобновить</>
                )}
              </button>
            </div>

            {/* Прогресс */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Прогресс кампании</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-white/80 rounded-lg border-2 border-gray-200">
                <div className="text-3xl font-bold text-green-600">
                  {improvement > '0' ? '+' : ''}{improvement}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Рост продаж</div>
                <div className="text-xs text-gray-500 mt-1">
                  {promotion.initialSales} → {promotion.currentSales}/день
                </div>
              </div>
              <div className="text-center p-4 bg-white/80 rounded-lg border-2 border-gray-200">
                <div className="text-3xl font-bold text-blue-600">
                  {promotion.currentConversion.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Конверсия</div>
                <div className="text-xs text-gray-500 mt-1">
                  Было: {promotion.initialConversion.toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-white/80 rounded-lg border-2 border-gray-200">
                <div className="text-3xl font-bold text-purple-600">
                  {promotion.actionsApplied}
                </div>
                <div className="text-sm text-gray-600 mt-1">Улучшений</div>
                <div className="text-xs text-gray-500 mt-1">
                  Проверок: {promotion.checksPerformed}
                </div>
              </div>
            </div>

            {/* Последний отчет */}
            {promotion.lastReport && (
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Последний анализ:</div>
                    <p className="text-sm text-gray-700">{promotion.lastReport.diagnosis}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(promotion.lastReport.createdAt).toLocaleString('ru')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Запуск AI агента */
          <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Запустить AI агента на 7 дней
              </h2>
              <p className="text-gray-600 mb-6">
                AI агент будет автоматически анализировать товар каждые 4-5 часов и применять улучшения:
                оптимизация рекламы, SEO, контента. Вы сможете отслеживать прогресс в реальном времени.
              </p>
              <button
                onClick={startPromotion}
                disabled={starting}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all font-semibold text-lg flex items-center gap-3 mx-auto disabled:opacity-50"
              >
                {starting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Запуск...</>
                ) : (
                  <><Play className="w-5 h-5" /> Запустить AI агента</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Анализ товара */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Анализ товара
            </h2>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Анализ...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Запустить анализ</>
              )}
            </button>
          </div>

          {analysis ? (
            <div className="space-y-6">
              {/* Диагноз */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-300">
                <h3 className="font-bold text-gray-900 mb-2">📊 Диагноз:</h3>
                <p className="text-gray-700">{analysis.diagnosis}</p>
              </div>

              {/* Проблемы */}
              {analysis.problems.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">🔴 Критичные проблемы:</h3>
                  <div className="space-y-3">
                    {analysis.problems.map((problem, idx) => (
                      <div key={idx} className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            {problem.category === 'photos' && <ImageIcon className="w-5 h-5 text-red-600" />}
                            {problem.category === 'description' && <FileText className="w-5 h-5 text-red-600" />}
                            {problem.category === 'seo' && <Search className="w-5 h-5 text-red-600" />}
                            {problem.category === 'price' && <TrendingUp className="w-5 h-5 text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">{problem.description}</div>
                            <div className="text-sm text-gray-600">Влияние: {problem.impact}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Рекомендации */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">💡 Рекомендации:</h3>
                
                {analysis.recommendations.critical.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-600 mb-2">🔴 Сделать сегодня:</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.critical.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                          <div className="font-semibold text-gray-900">{rec.action}</div>
                          <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
                          <div className="text-sm text-green-600 mt-1">✅ {rec.effect}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.recommendations.important.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-yellow-600 mb-2">🟡 Сделать на неделе:</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.important.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                          <div className="font-semibold text-gray-900">{rec.action}</div>
                          <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
                          <div className="text-sm text-green-600 mt-1">✅ {rec.effect}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.recommendations.improvements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">🟢 Улучшения:</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.improvements.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                          <div className="font-semibold text-gray-900">{rec.action}</div>
                          <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
                          <div className="text-sm text-green-600 mt-1">✅ {rec.effect}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Прогноз */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-300">
                <h3 className="font-bold text-gray-900 mb-3">📈 Прогноз:</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Конверсия:</span> <span className="font-bold text-green-600">{analysis.forecast.conversionChange}</span></div>
                  <div><span className="text-gray-600">Продажи:</span> <span className="font-bold text-green-600">{analysis.forecast.salesChange}</span></div>
                  <div><span className="text-gray-600">Срок:</span> <span className="font-bold">{analysis.forecast.timeline}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Нажмите "Запустить анализ" чтобы получить рекомендации от AI</p>
            </div>
          )}
        </div>

        {/* Ошибки */}
        {error && (
          <div className="liquid-glass rounded-2xl border-2 border-red-300 p-6">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Ошибка</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
