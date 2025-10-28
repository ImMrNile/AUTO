-- Индекс для оптимизации запроса товаров по userId и wbData
CREATE INDEX IF NOT EXISTS "Product_userId_wbData_updatedAt_idx" 
ON "Product"("userId", "updatedAt" DESC) 
WHERE "wbData" IS NOT NULL;
