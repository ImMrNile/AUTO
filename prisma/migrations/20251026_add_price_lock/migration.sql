-- Добавление полей для закрепления цены
ALTER TABLE "products" ADD COLUMN "priceLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "lockedPrice" DOUBLE PRECISION;

-- Комментарии
COMMENT ON COLUMN "products"."priceLocked" IS 'Флаг закрепления цены (защита от автоснижения WB)';
COMMENT ON COLUMN "products"."lockedPrice" IS 'Закрепленная цена товара';
