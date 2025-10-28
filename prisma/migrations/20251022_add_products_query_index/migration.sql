-- Составной индекс для оптимизации запроса товаров
-- WHERE userId = ? ORDER BY updatedAt DESC LIMIT 100
-- Правильное имя таблицы: products (lowercase)
CREATE INDEX IF NOT EXISTS "products_userId_updatedAt_idx" 
ON public.products("userId", "updatedAt" DESC);
