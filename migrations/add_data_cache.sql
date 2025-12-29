-- Миграция: Добавление таблицы для кеширования данных аналитики
-- Дата: 2025-12-29
-- Цель: Решить проблему Rate Limit 429 от WB API через кеширование в БД

-- Создаем таблицу для кеша
CREATE TABLE IF NOT EXISTS "data_cache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "data" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "data_cache_key_idx" ON "data_cache"("key");
CREATE INDEX IF NOT EXISTS "data_cache_expiresAt_idx" ON "data_cache"("expiresAt");

-- Комментарии для документации
COMMENT ON TABLE "data_cache" IS 'Кеш для данных аналитики и других данных с WB API';
COMMENT ON COLUMN "data_cache"."key" IS 'Уникальный ключ кеша (userId:cabinetId:type:params)';
COMMENT ON COLUMN "data_cache"."data" IS 'Закешированные данные в формате JSON';
COMMENT ON COLUMN "data_cache"."expiresAt" IS 'Время истечения кеша';
