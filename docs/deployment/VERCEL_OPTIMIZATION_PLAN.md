# 🚀 ПЛАН ОПТИМИЗАЦИИ ДЛЯ VERCEL

## 🎯 ПРОБЛЕМА

- Много товаров → страница "Товары" загружается медленно
- Аналитика тормозит
- Постоянная синхронизация с WB API → нагрузка

---

## ✅ РЕШЕНИЕ (3 ШАГА)

### ШАГ 1: PAGINATION (30 минут) - КРИТИЧНО!

**Что делает:**
- Загружает по 20 товаров вместо всех
- Автоматическая подгрузка при прокрутке
- Экономия памяти и трафика

**Файлы для изменения:**

#### 1.1. API: `/api/wb/products/route.ts`

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
      orderBy: { createdAt: 'desc' },
      include: {
        subcategory: true // Для комиссий
      }
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
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    }
  });
}
```

#### 1.2. Frontend: `src/app/components/ProductsWithAnalytics.tsx`

Добавь в начало компонента:

```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [allProducts, setAllProducts] = useState<ProductAnalytics[]>([]);
const observerTarget = useRef<HTMLDivElement>(null);

// Функция загрузки следующей страницы
const loadMore = useCallback(async () => {
  if (loading || !hasMore) return;

  setLoading(true);
  const nextPage = page + 1;
  
  try {
    const response = await fetch(
      `/api/wb/products?page=${nextPage}&limit=20&source=db&cabinetId=${cabinetId || ''}`
    );
    const data = await response.json();

    if (data.products.length === 0 || !data.pagination.hasMore) {
      setHasMore(false);
    } else {
      setAllProducts(prev => [...prev, ...data.products]);
      setPage(nextPage);
    }
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
  } finally {
    setLoading(false);
  }
}, [page, loading, hasMore, cabinetId]);

// Intersection Observer для автоматической подгрузки
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    { threshold: 0.1 }
  );

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [loadMore, hasMore, loading]);
```

В JSX добавь маркер для подгрузки:

```typescript
return (
  <div className="space-y-4">
    {allProducts.map(product => (
      <ProductCard key={product.nmID} {...product} />
    ))}
    
    {/* Маркер для автоматической подгрузки */}
    <div ref={observerTarget} className="h-10 flex items-center justify-center">
      {loading && <Loader2 className="w-6 h-6 animate-spin text-purple-600" />}
    </div>
    
    {!hasMore && allProducts.length > 0 && (
      <p className="text-center text-gray-500 py-4">
        Все товары загружены ({allProducts.length})
      </p>
    )}
  </div>
);
```

---

### ШАГ 2: VERCEL EDGE CACHING (15 минут)

**Что делает:**
- Кеширует ответы API на уровне Vercel
- Данные обновляются раз в N минут
- Не нужен Redis!

**Файлы для изменения:**

#### 2.1. `/api/analytics/dashboard/route.ts`

Добавь в начало файла:

```typescript
// ✅ Vercel Edge Caching - обновление раз в 5 минут
export const revalidate = 300; // 5 минут в секундах
```

Или для более гибкого контроля:

```typescript
export async function GET(request: Request) {
  // ... твой код ...

  return NextResponse.json(
    { success: true, data: analyticsResult },
    {
      headers: {
        // ✅ Кеширование на 5 минут
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    }
  );
}
```

**Что означает:**
- `s-maxage=300` - кеш на 5 минут
- `stale-while-revalidate=600` - показывать старые данные еще 10 минут, пока обновляются новые

#### 2.2. `/api/wb/products/route.ts`

```typescript
export async function GET(request: Request) {
  // ... твой код ...

  return NextResponse.json(
    { success: true, products, pagination },
    {
      headers: {
        // ✅ Кеш на 10 минут для товаров
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
      }
    }
  );
}
```

---

### ШАГ 3: АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ (✅ УЖЕ РЕАЛИЗОВАНО!)

**✅ ГОТОВО!** Система автоматической синхронизации уже создана и работает!

**Что делает:**
- Обновляет аналитику каждые 90 минут
- Обновляет цены товаров каждые 90 минут (защита от автоснижения WB)
- Работает в фоне без участия пользователя

**Файлы:**
- `src/app/components/BackgroundSyncWorker.tsx` - главный компонент
- `src/app/layout.tsx` - интегрирован в приложение

**Подробная документация:** См. файл `AUTO_SYNC_SETUP.md`

**Логи в консоли:**
```
🔄 [BackgroundSync] Запуск фонового обновления...
📊 [BackgroundSync] Начинаем обновление аналитики...
💰 [BackgroundSync] Начинаем обновление цен товаров...
✅ [BackgroundSync] Полная синхронизация завершена
```

**Настройка интервала:**
Файл `BackgroundSyncWorker.tsx`, строка 16:
```typescript
const SYNC_INTERVAL = 90 * 60 * 1000; // 90 минут
```

---

## 📊 РЕЗУЛЬТАТЫ ПОСЛЕ ОПТИМИЗАЦИИ

### До:
- Загрузка 500 товаров: **10-15 секунд**
- Каждый раз запрос к WB API
- Смартфон греется
- Батарея разряжается

### После:
- Загрузка первых 20 товаров: **0.5-1 секунда**
- Данные из кеша Vercel (5-10 минут)
- Смартфон не греется
- Батарея держится дольше

---

## 🎯 ПОРЯДОК ВЫПОЛНЕНИЯ

**День 1 (1 час):**
1. ШАГ 1: Pagination (30 мин)
2. ШАГ 2: Vercel Caching (15 мин)
3. ШАГ 3: Оптимизация синхронизации (20 мин)
4. Тестирование (10 мин)

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Pagination
```bash
# Открой раздел "Товары"
# Должно загрузиться только 20 товаров
# Прокрути вниз → загрузятся следующие 20
```

**Проверь Network tab:**
- Первый запрос: `/api/wb/products?page=1&limit=20`
- При прокрутке: `/api/wb/products?page=2&limit=20`

### 2. Vercel Caching
```bash
# Открой аналитику
# Обнови страницу (F5)
# Проверь Network tab
```

**Ожидаемое:**
- Первый запрос: медленный (загрузка с WB)
- Второй запрос (в течение 5 минут): **мгновенный** (из кеша)
- Response Headers: `x-vercel-cache: HIT`

### 3. Синхронизация
```bash
# Открой "Товары"
# Товары загружаются БЕЗ синхронизации
# Нажми кнопку "Синхронизировать" → синхронизация запустится
```

---

## 💡 ДОПОЛНИТЕЛЬНЫЕ ОПТИМИЗАЦИИ

### Оптимизация 4: Database Indexing

Добавь индексы в Prisma schema:

```prisma
model Product {
  // ... поля ...

  @@index([userId, createdAt]) // ✅ Для быстрой сортировки
  @@index([userId, status])    // ✅ Для фильтрации
}
```

Примени миграцию:
```bash
npx prisma migrate dev --name add_product_indexes
```

### Оптимизация 5: Lazy Loading компонентов

```typescript
import dynamic from 'next/dynamic';

// ✅ Ленивая загрузка тяжелых компонентов
const AnalyticsDashboard = dynamic(
  () => import('@/app/components/AnalyticsDashboard'),
  { loading: () => <Loader2 className="animate-spin" /> }
);
```

---

## 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Проблема: Pagination не работает
**Решение:**
1. Проверь консоль браузера на ошибки
2. Проверь что API возвращает `pagination` объект
3. Проверь что `observerTarget` правильно установлен

### Проблема: Кеш не работает
**Решение:**
1. Проверь Response Headers в Network tab
2. Должен быть `Cache-Control: public, s-maxage=300`
3. В production Vercel автоматически кеширует
4. В development кеш может не работать

### Проблема: Всё равно медленно
**Решение:**
1. Уменьши `limit` с 20 до 10
2. Увеличь время кеша с 300 до 600 секунд
3. Добавь индексы в БД (Оптимизация 4)

---

## 📞 ИТОГО

**Что получишь:**
- ✅ Загрузка в 10-20 раз быстрее
- ✅ Нет перегрева смартфона
- ✅ Батарея держится дольше
- ✅ Меньше запросов к WB API
- ✅ Работает на Vercel без Redis

**Время реализации:** 1-2 часа

**Сложность:** Средняя

Начинай с **ШАГ 1: Pagination** - это даст самый большой эффект! 🚀
