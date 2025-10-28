# Миграция таблицы ProductAnalytics

## Проблема

При попытке получить данные конверсии из БД возникает ошибка:

```
Invalid `prisma.productAnalytics.findMany()` invocation:
The table `public.product_analytics` does not exist in the current database.
```

## Решение

Таблица `product_analytics` определена в схеме Prisma, но не создана в базе данных. Необходимо применить миграцию.

## Шаги для исправления

### Вариант 1: Применить миграцию (Production)

```bash
npx prisma migrate deploy
```

Эта команда применит все неприменённые миграции, включая `20251023_add_product_analytics`.

### Вариант 2: Синхронизировать схему (Development)

```bash
npx prisma db push
```

Эта команда синхронизирует схему Prisma с базой данных без создания файла миграции.

### Вариант 3: Создать и применить миграцию

```bash
# Создать миграцию
npx prisma migrate dev --name add_product_analytics

# Применить миграцию
npx prisma migrate deploy
```

## Структура таблицы

```sql
CREATE TABLE "product_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL UNIQUE,
    "nmId" TEXT,
    
    -- Конверсия
    "views" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Поисковые запросы
    "topSearchQueries" JSONB,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    
    -- Продажи
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "units" INTEGER NOT NULL DEFAULT 0,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Метаданные синхронизации
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'wb_api',
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "product_analytics_productId_fkey" 
        FOREIGN KEY ("productId") 
        REFERENCES "products"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Индексы
CREATE INDEX "product_analytics_productId_idx" ON "product_analytics"("productId");
CREATE INDEX "product_analytics_nmId_idx" ON "product_analytics"("nmId");
CREATE INDEX "product_analytics_lastSyncAt_idx" ON "product_analytics"("lastSyncAt");
CREATE INDEX "product_analytics_syncStatus_idx" ON "product_analytics"("syncStatus");
```

## Проверка

После применения миграции проверьте, что таблица создана:

```sql
-- В PostgreSQL
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'product_analytics';
```

Или через Prisma Studio:

```bash
npx prisma studio
```

## Fallback логика

Система теперь имеет fallback логику - если таблица не существует, будут использоваться примерные данные конверсии:

```typescript
try {
  analyticsData = await prisma.productAnalytics.findMany(...);
} catch (error: any) {
  if (error.code === 'P2021') {
    console.warn('⚠️ Таблица ProductAnalytics не существует');
    console.warn('⚠️ Используем fallback на примерные данные конверсии');
  }
}
```

## После миграции

1. **Синхронизируйте данные:**
   ```bash
   curl -X POST http://localhost:3000/api/analytics/sync \
     -H "Content-Type: application/json" \
     -d '{"forceSync": true}'
   ```

2. **Проверьте данные:**
   ```bash
   curl http://localhost:3000/api/analytics/dashboard?days=30
   ```

3. **Настройте Cron Job** для автоматической синхронизации (каждый час):
   - Уже настроено в `vercel.json`
   - Endpoint: `/api/cron/sync-analytics`

## Troubleshooting

### Ошибка: "Can't reach database server"

Проверьте:
1. Доступность базы данных
2. Правильность DATABASE_URL в `.env`
3. Сетевое подключение

### Ошибка: "Migration already applied"

Миграция уже применена. Проверьте таблицу в БД:

```bash
npx prisma studio
```

### Ошибка: "Foreign key constraint fails"

Убедитесь, что таблица `products` существует и имеет поле `id`.

## Файлы

- `prisma/schema.prisma` - определение модели ProductAnalytics
- `prisma/migrations/20251023_add_product_analytics/migration.sql` - SQL миграция
- `src/app/api/analytics/dashboard/route.ts` - использование таблицы с fallback логикой
- `src/app/api/analytics/sync/route.ts` - синхронизация данных
- `src/app/api/cron/sync-analytics/route.ts` - автоматическая синхронизация
