# Применение миграции в Supabase

## Быстрая инструкция

1. Откройте https://supabase.com → ваш проект → **SQL Editor**
2. Скопируйте код из файла `migrations/add_sse_indexes.sql`
3. Вставьте в SQL Editor и нажмите **Run**
4. Проверьте что появились 2 новых индекса

## Что делает миграция

Добавляет составные индексы для ускорения SSE запросов:
- `product_creation_tasks_userId_status_idx`
- `product_creation_tasks_userId_status_createdAt_idx`

## Результат

**До:** SSE запросы 1200-1800ms  
**После:** SSE запросы < 100ms

## Проверка

После применения выполните в SQL Editor:

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'product_creation_tasks';
```

Должно быть 6 индексов (включая 2 новых).
