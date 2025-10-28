-- Миграция: Добавление полей для Telegram OAuth
-- Дата: 2025-10-28
-- Описание: Добавляет поля для хранения данных Telegram OAuth в таблицу users

-- Добавление полей Telegram OAuth
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramPhotoUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramAuthDate" TIMESTAMP(3);

-- Создание уникального индекса для telegramId
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegramId_key" ON "users"("telegramId");

-- Создание индекса для быстрого поиска по telegramId
CREATE INDEX IF NOT EXISTS "users_telegramId_idx" ON "users"("telegramId");

-- Комментарии к полям
COMMENT ON COLUMN "users"."telegramId" IS 'Telegram User ID для OAuth авторизации';
COMMENT ON COLUMN "users"."telegramUsername" IS 'Telegram username пользователя';
COMMENT ON COLUMN "users"."telegramPhotoUrl" IS 'URL фото профиля из Telegram';
COMMENT ON COLUMN "users"."telegramAuthDate" IS 'Дата последней авторизации через Telegram';

-- Обновление существующих пользователей (опционально)
-- Если у вас уже есть пользователи с Telegram данными в других полях,
-- вы можете мигрировать их здесь

-- Пример:
-- UPDATE "users" 
-- SET "telegramId" = "oldTelegramIdField"
-- WHERE "oldTelegramIdField" IS NOT NULL;
