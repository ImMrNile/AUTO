-- AddColumn marketplaceCommission to products table
ALTER TABLE "products" ADD COLUMN "marketplaceCommission" DOUBLE PRECISION;

-- CreateIndex for faster queries
CREATE INDEX "products_marketplaceCommission_idx" ON "products"("marketplaceCommission");
