-- Миграция: Добавление таблицы для QR авторизации через Telegram
-- Дата: 2025-10-28
-- Описание: Таблица для хранения QR кодов и сессий авторизации через Telegram

-- Создание таблицы TelegramQRAuth
CREATE TABLE IF NOT EXISTS "TelegramQRAuth" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "qrCode" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  "sessionToken" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS "TelegramQRAuth_qrCode_idx" ON "TelegramQRAuth"("qrCode");
CREATE INDEX IF NOT EXISTS "TelegramQRAuth_userId_idx" ON "TelegramQRAuth"("userId");
CREATE INDEX IF NOT EXISTS "TelegramQRAuth_status_idx" ON "TelegramQRAuth"("status");
CREATE INDEX IF NOT EXISTS "TelegramQRAuth_expiresAt_idx" ON "TelegramQRAuth"("expiresAt");

-- Добавление внешнего ключа к таблице User (если нужно)
-- ALTER TABLE "TelegramQRAuth" ADD CONSTRAINT "TelegramQRAuth_userId_fkey" 
-- FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Комментарии к таблице и полям
COMMENT ON TABLE "TelegramQRAuth" IS 'Таблица для хранения QR кодов авторизации через Telegram';
COMMENT ON COLUMN "TelegramQRAuth"."id" IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN "TelegramQRAuth"."qrCode" IS 'Уникальный код QR для авторизации';
COMMENT ON COLUMN "TelegramQRAuth"."status" IS 'Статус QR кода: PENDING, CONFIRMED, EXPIRED';
COMMENT ON COLUMN "TelegramQRAuth"."expiresAt" IS 'Время истечения QR кода (обычно 5 минут)';
COMMENT ON COLUMN "TelegramQRAuth"."userId" IS 'ID пользователя, который подтвердил QR код';
COMMENT ON COLUMN "TelegramQRAuth"."sessionToken" IS 'Токен сессии после успешной авторизации';
COMMENT ON COLUMN "TelegramQRAuth"."confirmedAt" IS 'Время подтверждения QR кода';
COMMENT ON COLUMN "TelegramQRAuth"."createdAt" IS 'Время создания QR кода';
COMMENT ON COLUMN "TelegramQRAuth"."updatedAt" IS 'Время последнего обновления';

-- Функция для автоматического обновления updatedAt
CREATE OR REPLACE FUNCTION update_telegram_qr_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updatedAt
CREATE TRIGGER telegram_qr_auth_updated_at
BEFORE UPDATE ON "TelegramQRAuth"
FOR EACH ROW
EXECUTE FUNCTION update_telegram_qr_auth_updated_at();

-- Функция для автоматической очистки истекших QR кодов (опционально)
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM "TelegramQRAuth"
  WHERE "expiresAt" < CURRENT_TIMESTAMP
  AND "status" = 'PENDING';
END;
$$ LANGUAGE plpgsql;

-- Комментарий к функции
COMMENT ON FUNCTION cleanup_expired_qr_codes() IS 'Удаляет истекшие QR коды со статусом PENDING';
