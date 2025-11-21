'use client';

export default function AnalyticsLoadingSkeleton() {
  return (
    <div className="fade-in space-y-6 relative w-full max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="col-span-12 animate-pulse">
        <div className="h-9 bg-white/40 rounded-lg w-80 mb-2"></div>
        <div className="h-5 bg-white/30 rounded-lg w-96"></div>
      </div>

      {/* Основные метрики - 4 карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="liquid-glass rounded-xl p-4 flex flex-col animate-pulse">
            <div className="h-4 bg-white/40 rounded w-24 mb-3"></div>
            <div className="h-8 bg-white/50 rounded w-32 mb-2"></div>
            <div className="h-4 bg-white/30 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* График и Расходы */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* График продаж */}
        <div className="md:col-span-8 liquid-glass rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-white/40 rounded w-48 mb-4"></div>
          <div className="h-64 bg-white/30 rounded-lg flex items-end justify-between gap-2 p-4">
            {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-t from-purple-300/50 to-purple-200/50 rounded-t shimmer"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Расходы на Wildberries */}
        <div className="md:col-span-4 liquid-glass rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-white/40 rounded w-56 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-white/40 rounded w-24"></div>
                <div className="h-5 bg-white/50 rounded w-28"></div>
              </div>
            ))}
            <div className="border-t border-gray-200 my-2"></div>
            <div className="flex justify-between items-center">
              <div className="h-5 bg-white/50 rounded w-16"></div>
              <div className="h-6 bg-white/60 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Топ товары и Конверсия */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ-10 товаров */}
        <div className="liquid-glass rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-white/40 rounded w-56 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-2 rounded-lg bg-white/20">
                <div className="w-10 h-10 bg-white/40 rounded-md shimmer"></div>
                <div className="flex-1">
                  <div className="h-4 bg-white/40 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-white/30 rounded w-1/2"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-white/50 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-white/30 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Конверсия и эффективность */}
        <div className="liquid-glass rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-white/40 rounded w-64 mb-4"></div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/30 p-3 rounded-lg border border-white">
                  <div className="h-3 bg-white/40 rounded w-16 mb-2"></div>
                  <div className="h-6 bg-white/50 rounded w-20"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/30 p-3 rounded-lg border border-white">
                  <div className="h-3 bg-white/40 rounded w-12 mb-2"></div>
                  <div className="h-6 bg-white/50 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-6 bg-white/40 rounded w-48 mt-6 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/30 p-3 rounded-lg border border-white">
                <div className="h-3 bg-white/40 rounded w-20 mb-2"></div>
                <div className="h-6 bg-white/50 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Поисковые запросы и Категории */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((section) => (
          <div key={section} className="liquid-glass rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-white/40 rounded w-56 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between text-sm p-2 bg-white/20 rounded-lg">
                  <div className="h-4 bg-white/40 rounded w-32"></div>
                  <div className="h-4 bg-white/50 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Пульсирующий индикатор загрузки */}
      <div className="fixed bottom-8 right-8 liquid-glass rounded-full p-4 shadow-2xl z-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          </div>
          <div>
            <div className="text-sm font-semibold text-text-main">Загрузка аналитики...</div>
            <div className="text-xs text-text-subtle">Получаем данные из Wildberries</div>
          </div>
        </div>
      </div>
    </div>
  );
}
