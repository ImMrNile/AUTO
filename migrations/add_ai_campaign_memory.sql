-- Добавляем поля для AI памяти в таблицу product_promotions (вместо Campaign)
ALTER TABLE "product_promotions" ADD COLUMN IF NOT EXISTS "aiThreadId" TEXT;
ALTER TABLE "product_promotions" ADD COLUMN IF NOT EXISTS "aiEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "product_promotions" ADD COLUMN IF NOT EXISTS "lastAiCheckAt" TIMESTAMP;

-- Создаем индекс для быстрого поиска промоакций с AI
CREATE INDEX IF NOT EXISTS "product_promotions_aiEnabled_status_idx" ON "product_promotions"("aiEnabled", "status");

-- Создаем таблицу для хранения решений AI (используем promotionId вместо campaignId)
CREATE TABLE IF NOT EXISTS "promotion_decisions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "promotionId" TEXT NOT NULL,
  "diagnosis" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "forecast" JSONB,
  "executed" BOOLEAN DEFAULT false,
  "executedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "promotion_decisions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "product_promotions"("id") ON DELETE CASCADE
);

-- Индекс для быстрого поиска решений по промоакции
CREATE INDEX IF NOT EXISTS "promotion_decisions_promotionId_createdAt_idx" ON "promotion_decisions"("promotionId", "createdAt" DESC);

-- Создаем таблицу для логирования действий AI
CREATE TABLE IF NOT EXISTS "promotion_action_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "promotionId" TEXT NOT NULL,
  "decisionId" TEXT,
  "actionType" TEXT NOT NULL,
  "actionDetails" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "executedAt" TIMESTAMP,
  
  CONSTRAINT "promotion_action_logs_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "product_promotions"("id") ON DELETE CASCADE,
  CONSTRAINT "promotion_action_logs_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "promotion_decisions"("id") ON DELETE SET NULL
);

-- Индекс для быстрого поиска действий по промоакции
CREATE INDEX IF NOT EXISTS "promotion_action_logs_promotionId_createdAt_idx" ON "promotion_action_logs"("promotionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "promotion_action_logs_status_idx" ON "promotion_action_logs"("status");

-- Комментарии к таблицам
COMMENT ON TABLE "promotion_decisions" IS 'Решения AI по промоакциям (история диалога)';
COMMENT ON TABLE "promotion_action_logs" IS 'Лог выполнения действий AI';

COMMENT ON COLUMN "product_promotions"."aiThreadId" IS 'ID Thread в OpenAI Assistants API';
COMMENT ON COLUMN "product_promotions"."aiEnabled" IS 'Включено ли автоматическое управление AI';
COMMENT ON COLUMN "product_promotions"."lastAiCheckAt" IS 'Время последней проверки AI';
