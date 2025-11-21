-- Миграция: Добавление составных индексов для оптимизации SSE запросов
-- Дата: 2025-11-05
-- Цель: Ускорить запросы к product_creation_tasks (userId + status)

-- Проверяем существование индексов перед созданием
DO $$
BEGIN
    -- Составной индекс для фильтрации по userId и status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'product_creation_tasks' 
        AND indexname = 'product_creation_tasks_userId_status_idx'
    ) THEN
        CREATE INDEX "product_creation_tasks_userId_status_idx" 
        ON "product_creation_tasks" ("userId", "status");
        RAISE NOTICE 'Создан индекс: product_creation_tasks_userId_status_idx';
    ELSE
        RAISE NOTICE 'Индекс product_creation_tasks_userId_status_idx уже существует';
    END IF;

    -- Составной индекс для фильтрации и сортировки
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'product_creation_tasks' 
        AND indexname = 'product_creation_tasks_userId_status_createdAt_idx'
    ) THEN
        CREATE INDEX "product_creation_tasks_userId_status_createdAt_idx" 
        ON "product_creation_tasks" ("userId", "status", "createdAt" DESC);
        RAISE NOTICE 'Создан индекс: product_creation_tasks_userId_status_createdAt_idx';
    ELSE
        RAISE NOTICE 'Индекс product_creation_tasks_userId_status_createdAt_idx уже существует';
    END IF;
END $$;

-- Анализируем таблицу для обновления статистики
ANALYZE "product_creation_tasks";

-- Проверяем созданные индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'product_creation_tasks'
ORDER BY indexname;
