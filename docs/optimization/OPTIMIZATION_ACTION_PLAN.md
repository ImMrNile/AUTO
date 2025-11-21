# 🎯 ПЛАН ДЕЙСТВИЙ ПО ОПТИМИЗАЦИИ

## ШАГ 1: НЕМЕДЛЕННЫЕ ИСПРАВЛЕНИЯ (30 минут)

### 1.1 Отключить фоновую загрузку товаров

**Файл:** `src/app/components/BackgroundProductLoader.tsx`

**Действие:** Временно отключить компонент

```typescript
// src/app/components/BackgroundProductLoader.tsx
export default function BackgroundProductLoader() {
  // ❌ ВРЕМЕННО ОТКЛЮЧЕНО для оптимизации
  // Будет заменено на серверный Cron Job
  return null;
}
```

**Или удалить импорт из layout:**
```typescript
// src/app/layout.tsx
// import BackgroundProductLoader from './components/BackgroundProductLoader'; // ❌ Закомментировать
```

---

### 1.2 Увеличить интервалы polling

**Файл:** `src/app/components/InProgressProducts.tsx` (строка 118-137)

**Было:**
```typescript
const getPollingInterval = () => {
  if (tasks.length === 0) return 60000; // 60 секунд
  const hasActiveTasks = tasks.some(...);
  if (hasActiveTasks) return 5000; // ❌ 5 секунд - СЛИШКОМ ЧАСТО
  return 30000; // 30 секунд
};
```

**Стало:**
```typescript
const getPollingInterval = () => {
  if (tasks.length === 0) return 300000; // ✅ 5 минут (нет задач)
  const hasActiveTasks = tasks.some(...);
  if (hasActiveTasks) return 30000; // ✅ 30 секунд (есть активные)
  return 120000; // ✅ 2 минуты (завершенные)
};
```

---

### 1.3 Отключить фоновое обновление аналитики

**Файл:** `src/app/components/AnalyticsDashboard.tsx` (строка 262)

**Было:**
```typescript
const { data, loading, ... } = useAnalyticsCache<DashboardData>(fetchAnalytics, {
  key: `analytics-dashboard-${period}`,
  ttl: 6 * 60 * 60 * 1000,
  backgroundRefresh: true // ❌ ПОСТОЯННО ОБНОВЛЯЕТ
});
```

**Стало:**
```typescript
const { data, loading, ... } = useAnalyticsCache<DashboardData>(fetchAnalytics, {
  key: `analytics-dashboard-${period}`,
  ttl: 6 * 60 * 60 * 1000,
  backgroundRefresh: false // ✅ ОБНОВЛЕНИЕ ТОЛЬКО ПО КНОПКЕ
});
```

---

### 1.4 Остановить polling при неактивной вкладке

**Файл:** `src/app/components/InProgressProducts.tsx`

**Добавить:**
```typescript
useEffect(() => {
  // ✅ Останавливаем polling когда вкладка неактивна
  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('⏸️ Вкладка неактивна - останавливаем polling');
      // Интервал автоматически остановится при размонтировании
    } else {
      console.log('▶️ Вкладка активна - возобновляем polling');
      updateTasks(); // Обновляем сразу
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);

// Изменить логику интервала
useEffect(() => {
  // ✅ НЕ запускаем интервал если вкладка неактивна
  if (document.hidden) {
    console.log('⏸️ Вкладка неактивна - интервал не запускается');
    return;
  }

  const interval = setInterval(updateTasks, getPollingInterval());
  return () => clearInterval(interval);
}, [cabinetId, document.hidden]); // Добавить document.hidden в зависимости
```

---

## ШАГ 2: СЕРВЕРНОЕ КЕШИРОВАНИЕ (1-2 часа)

### 2.1 Установить Redis (если еще нет)

**Docker Compose:**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

**Или использовать Upstash (бесплатный Redis в облаке):**
```bash
# .env
REDIS_URL=redis://default:password@your-upstash-url:6379
```

---

### 2.2 Создать Redis клиент

**Файл:** `lib/cache/redis.ts` (создать новый)

```typescript
import { Redis } from '@upstash/redis';

// Singleton Redis клиент
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }
  return redis;
}

// Утилиты для кеширования
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    
    console.log(`✅ Cache HIT: ${key}`);
    return data as T;
  } catch (error) {
    console.error(`❌ Cache ERROR: ${key}`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string, 
  value: T, 
  ttlSeconds: number
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
    console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`❌ Cache SET ERROR: ${key}`, error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
    console.log(`🗑️ Cache DELETE: ${key}`);
  } catch (error) {
    console.error(`❌ Cache DELETE ERROR: ${key}`, error);
  }
}
```

---

### 2.3 Обновить API endpoints с кешированием

**Файл:** `src/app/api/analytics/dashboard/route.ts`

**Добавить в начало:**
```typescript
import { getCached, setCached } from '@/lib/cache/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const cabinetId = searchParams.get('cabinetId');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';
  
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  // ✅ Проверяем кеш
  const cacheKey = `analytics:${user.id}:${cabinetId}:${days}`;
  
  if (!forceRefresh) {
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      console.log(`✅ Возвращаем данные из кеша: ${cacheKey}`);
      return NextResponse.json({
        success: true,
        data: cached,
        fromCache: true,
        cacheAge: Math.round((Date.now() - cached.timestamp) / 60000)
      });
    }
  }

  // Загружаем данные из WB API
  const data = await buildAnalyticsDashboard(...);
  
  // ✅ Сохраняем в кеш на 1 час
  await setCached(cacheKey, { ...data, timestamp: Date.now() }, 3600);
  
  return NextResponse.json({
    success: true,
    data,
    fromCache: false
  });
}
```

---

## ШАГ 3: SERVER-SENT EVENTS (2-3 часа)

### 3.1 Создать SSE endpoint для задач

**Файл:** `src/app/api/tasks/stream/route.ts` (создать новый)

```typescript
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`📡 SSE: Клиент подключен (user: ${user.id})`);

      // Отправляем начальные данные
      const sendUpdate = async () => {
        try {
          const tasks = await prisma.productCreationTask.findMany({
            where: {
              userId: user.id,
              status: { in: ['CREATING', 'ANALYZING', 'PUBLISHING'] }
            },
            orderBy: { createdAt: 'desc' }
          });

          const data = `data: ${JSON.stringify(tasks)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('❌ SSE: Ошибка отправки данных', error);
        }
      };

      // Отправляем сразу
      await sendUpdate();

      // Отправляем обновления каждые 10 секунд
      const interval = setInterval(sendUpdate, 10000);

      // Cleanup при отключении клиента
      request.signal.addEventListener('abort', () => {
        console.log(`📡 SSE: Клиент отключен (user: ${user.id})`);
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### 3.2 Использовать SSE на клиенте

**Файл:** `src/app/components/InProgressProducts.tsx`

**Заменить useEffect с setInterval на:**
```typescript
useEffect(() => {
  // ✅ Используем SSE вместо polling
  const eventSource = new EventSource('/api/tasks/stream');

  eventSource.onmessage = (event) => {
    try {
      const tasks = JSON.parse(event.data);
      console.log(`📡 SSE: Получены обновления задач (${tasks.length})`);
      setTasks(tasks);
    } catch (error) {
      console.error('❌ SSE: Ошибка парсинга данных', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('❌ SSE: Ошибка соединения', error);
    eventSource.close();
    
    // Fallback на обычный запрос
    setTimeout(() => {
      fetch('/api/tasks?status=in-progress')
        .then(res => res.json())
        .then(data => setTasks(data.tasks));
    }, 5000);
  };

  return () => {
    console.log('📡 SSE: Закрываем соединение');
    eventSource.close();
  };
}, [cabinetId]);
```

---

## ШАГ 4: PAGINATION (1 час)

### 4.1 Обновить API для товаров

**Файл:** `src/app/api/wb/products/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  // ✅ Загружаем только нужную страницу
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where: { userId: user.id } })
  ]);

  return NextResponse.json({
    success: true,
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
```

---

### 4.2 Добавить Infinite Scroll на клиенте

**Файл:** `src/app/components/ProductsWithAnalytics.tsx`

```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const observerTarget = useRef<HTMLDivElement>(null);

// Загрузка следующей страницы
const loadMore = useCallback(async () => {
  if (loading || !hasMore) return;

  const nextPage = page + 1;
  const response = await fetch(`/api/wb/products?page=${nextPage}&limit=20`);
  const data = await response.json();

  if (data.products.length === 0) {
    setHasMore(false);
  } else {
    setProducts(prev => [...prev, ...data.products]);
    setPage(nextPage);
  }
}, [page, loading, hasMore]);

// Intersection Observer для автозагрузки
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    },
    { threshold: 0.1 }
  );

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [loadMore, hasMore]);

// В JSX добавить маркер для наблюдения
return (
  <>
    {products.map(product => <ProductCard key={product.id} {...product} />)}
    <div ref={observerTarget} className="h-10" />
    {loading && <Loader />}
  </>
);
```

---

## ШАГ 5: LAZY LOADING ИЗОБРАЖЕНИЙ (15 минут)

**Файл:** `src/app/components/ProductsWithAnalytics.tsx`

**Заменить все `<img>` на:**
```typescript
<img
  src={product.image}
  alt={product.title}
  loading="lazy" // ✅ Браузер загружает только видимые
  decoding="async" // ✅ Асинхронная декодировка
  className="w-full h-48 object-cover"
  onError={(e) => {
    // Fallback на placeholder
    e.currentTarget.src = '/placeholder.png';
  }}
/>
```

---

## ШАГ 6: МОБИЛЬНАЯ ОПТИМИЗАЦИЯ (30 минут)

### 6.1 Определение мобильного устройства

**Файл:** `src/app/hooks/useDeviceType.ts` (создать новый)

```typescript
import { useState, useEffect } from 'react';

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent;
      setIsMobile(/iPhone|iPod|Android.*Mobile/i.test(ua));
      setIsTablet(/iPad|Android(?!.*Mobile)/i.test(ua));
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}
```

---

### 6.2 Упрощенный интерфейс для мобильных

**Файл:** `src/app/components/AnalyticsDashboard.tsx`

```typescript
import { useDeviceType } from '@/app/hooks/useDeviceType';

export default function AnalyticsDashboard() {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    // ✅ Упрощенная мобильная версия
    return (
      <div className="space-y-4">
        {/* Только основные метрики */}
        <MetricsCards data={data} />
        
        {/* БЕЗ графиков - только цифры */}
        <SimpleStats data={data} />
        
        {/* Топ-3 товара вместо всех */}
        <TopProducts products={data.sales.topProducts.slice(0, 3)} />
      </div>
    );
  }

  // Полная версия для десктопа
  return <FullDashboard data={data} />;
}
```

---

## 📊 ЧЕКЛИСТ ВНЕДРЕНИЯ

### Немедленно (сегодня):
- [ ] Отключить BackgroundProductLoader
- [ ] Увеличить интервалы polling (5с → 30с)
- [ ] Отключить backgroundRefresh в useAnalyticsCache
- [ ] Добавить остановку polling при неактивной вкладке
- [ ] Добавить lazy loading для изображений

### На этой неделе:
- [ ] Настроить Redis (Upstash или Docker)
- [ ] Внедрить кеширование в API endpoints
- [ ] Создать SSE endpoint для задач
- [ ] Заменить polling на SSE в InProgressProducts
- [ ] Добавить pagination для товаров

### В следующем месяце:
- [ ] Создать мобильную версию интерфейса
- [ ] Внедрить Cron Jobs для фоновых задач
- [ ] Оптимизировать изображения через CDN
- [ ] Добавить Service Worker для PWA
- [ ] Мониторинг производительности

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

**После внедрения ВСЕХ оптимизаций:**

✅ Смартфон НЕ греется
✅ Батарея держится в 3-4 раза дольше
✅ Приложение работает быстрее
✅ Меньше трафика (экономия мобильного интернета)
✅ Лучший UX на мобильных устройствах
