-- Исправление: Создание оптимального индекса для SSE запросов
-- Проблема: PostgreSQL не использует составной индекс для запросов с IN

-- Удаляем старые неэффективные индексы
DROP INDEX IF EXISTS "product_creation_tasks_userId_status_idx";
DROP INDEX IF EXISTS "product_creation_tasks_userId_status_createdAt_idx";

-- Создаем оптимальный индекс с правильным порядком колонок
-- userId (равенство) -> createdAt (сортировка) -> status (фильтр)
CREATE INDEX IF NOT EXISTS "product_creation_tasks_userId_createdAt_status_idx" 
ON "product_creation_tasks" ("userId", "createdAt" DESC, "status");

-- Альтернативный индекс для быстрого поиска по userId и status
CREATE INDEX IF NOT EXISTS "product_creation_tasks_userId_status_v2_idx" 
ON "product_creation_tasks" ("userId", "status") 
WHERE "status" IN ('CREATING', 'ANALYZING', 'PUBLISHING', 'COMPLETED');

-- Обновляем статистику таблицы
ANALYZE "product_creation_tasks";

-- Проверяем план запроса
EXPLAIN ANALYZE
SELECT * FROM "product_creation_tasks"
WHERE "userId" = 'cmhcbit860000ib04m8im7vfz'
AND "status" IN ('CREATING', 'ANALYZING', 'PUBLISHING')
ORDER BY "createdAt" DESC
LIMIT 10;
