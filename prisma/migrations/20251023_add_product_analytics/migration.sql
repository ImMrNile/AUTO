-- CreateTable
CREATE TABLE "product_analytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nmId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "addToCart" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topSearchQueries" JSONB,
    "totalQueries" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "units" INTEGER NOT NULL DEFAULT 0,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'wb_api',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_analytics_productId_key" ON "product_analytics"("productId");

-- CreateIndex
CREATE INDEX "product_analytics_productId_idx" ON "product_analytics"("productId");

-- CreateIndex
CREATE INDEX "product_analytics_nmId_idx" ON "product_analytics"("nmId");

-- CreateIndex
CREATE INDEX "product_analytics_lastSyncAt_idx" ON "product_analytics"("lastSyncAt");

-- CreateIndex
CREATE INDEX "product_analytics_syncStatus_idx" ON "product_analytics"("syncStatus");

-- AddForeignKey
ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
