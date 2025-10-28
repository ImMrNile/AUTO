'use client';

export default function ProductsLoadingSkeleton() {
  return (
    <div className="fade-in space-y-6 relative w-full max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="animate-pulse">
        <div className="h-8 bg-white/40 rounded-lg w-64 mb-2"></div>
        <div className="h-5 bg-white/30 rounded-lg w-80"></div>
      </div>

      {/* Статистика - 4 карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="liquid-glass rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/40 rounded w-20 mb-2"></div>
            <div className="h-8 bg-white/50 rounded w-28"></div>
          </div>
        ))}
      </div>

      {/* Поиск и фильтры */}
      <div className="liquid-glass rounded-xl p-4 animate-pulse">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-white/30 rounded-lg"></div>
          <div className="w-48 h-10 bg-white/30 rounded-lg"></div>
        </div>
      </div>

      {/* Список товаров */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="liquid-glass rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-4">
              {/* Изображение */}
              <div className="w-20 h-20 bg-white/40 rounded-lg shimmer"></div>
              
              {/* Информация */}
              <div className="flex-1">
                <div className="flex justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-5 bg-white/40 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-white/30 rounded w-1/2"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-7 bg-white/50 rounded w-24 mb-1"></div>
                    <div className="h-4 bg-white/30 rounded w-20"></div>
                  </div>
                </div>
                
                {/* Мини статистика */}
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j}>
                      <div className="h-3 bg-white/30 rounded w-16 mb-1"></div>
                      <div className="h-4 bg-white/40 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
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
            <div className="text-sm font-semibold text-text-main">Загрузка товаров...</div>
            <div className="text-xs text-text-subtle">Получаем данные из Wildberries</div>
          </div>
        </div>
      </div>
    </div>
  );
}
