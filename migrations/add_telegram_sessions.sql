-- Migration: Add TelegramSession table
-- Created: 2025-10-25

-- Create telegram_sessions table
CREATE TABLE IF NOT EXISTS "telegram_sessions" (
  "id" text NOT NULL PRIMARY KEY,
  "sessionId" text NOT NULL UNIQUE,
  "userId" text,
  "authenticated" boolean NOT NULL DEFAULT false,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX "telegram_sessions_sessionId_idx" ON "telegram_sessions"("sessionId");
CREATE INDEX "telegram_sessions_userId_idx" ON "telegram_sessions"("userId");
CREATE INDEX "telegram_sessions_expiresAt_idx" ON "telegram_sessions"("expiresAt");

-- Add trigger to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_telegram_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_telegram_sessions_updated_at_trigger ON "telegram_sessions";
CREATE TRIGGER update_telegram_sessions_updated_at_trigger
BEFORE UPDATE ON "telegram_sessions"
FOR EACH ROW
EXECUTE FUNCTION update_telegram_sessions_updated_at();
