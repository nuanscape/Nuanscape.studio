-- CreateEnum
CREATE TYPE "MarketplaceName" AS ENUM ('TikTokShop', 'Shopee');

-- CreateEnum
CREATE TYPE "ProductMarketplace" AS ENUM ('TikTokShop', 'Shopee', 'Both');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('Active', 'Paused', 'OutOfStock');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled', 'Returned');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('In', 'Out', 'Damaged', 'Reserved');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('connected', 'disconnected', 'syncing', 'error');

-- CreateTable
CREATE TABLE "seller_settings" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "marketplacePct" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "affiliatePct" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "shippingPerOrder" INTEGER NOT NULL DEFAULT 12500,
    "adsMonthly" INTEGER NOT NULL DEFAULT 3750000,
    "opexMonthly" INTEGER NOT NULL DEFAULT 2400000,
    "grossRevenue30d" INTEGER NOT NULL DEFAULT 0,
    "cogs30d" INTEGER NOT NULL DEFAULT 0,
    "discounts30d" INTEGER NOT NULL DEFAULT 0,
    "refunds30d" INTEGER NOT NULL DEFAULT 0,
    "orderCount30d" INTEGER NOT NULL DEFAULT 0,
    "tiktokRevenue30d" INTEGER NOT NULL DEFAULT 0,
    "shopeeRevenue30d" INTEGER NOT NULL DEFAULT 0,
    "tiktokOrders30d" INTEGER NOT NULL DEFAULT 0,
    "shopeeOrders30d" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_products" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "marketplace" "ProductMarketplace" NOT NULL DEFAULT 'Both',
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "geoScore" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_inventory_movements" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_orders" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'Pending',
    "marketplace" "MarketplaceName" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "includedInBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_marketplace_connections" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" "MarketplaceName" NOT NULL,
    "storeName" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'connected',
    "lastSync" TIMESTAMP(3),
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_marketplace_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_daily_snapshots" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tiktok" INTEGER NOT NULL,
    "shopee" INTEGER NOT NULL,

    CONSTRAINT "seller_daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_settings_ownerId_key" ON "seller_settings"("ownerId");

-- CreateIndex
CREATE INDEX "seller_products_ownerId_status_idx" ON "seller_products"("ownerId", "status");

-- CreateIndex
CREATE INDEX "seller_products_ownerId_marketplace_idx" ON "seller_products"("ownerId", "marketplace");

-- CreateIndex
CREATE INDEX "seller_products_ownerId_category_idx" ON "seller_products"("ownerId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "seller_products_ownerId_sku_key" ON "seller_products"("ownerId", "sku");

-- CreateIndex
CREATE INDEX "seller_inventory_movements_ownerId_date_idx" ON "seller_inventory_movements"("ownerId", "date");

-- CreateIndex
CREATE INDEX "seller_inventory_movements_ownerId_productId_idx" ON "seller_inventory_movements"("ownerId", "productId");

-- CreateIndex
CREATE INDEX "seller_orders_ownerId_date_idx" ON "seller_orders"("ownerId", "date");

-- CreateIndex
CREATE INDEX "seller_orders_ownerId_status_idx" ON "seller_orders"("ownerId", "status");

-- CreateIndex
CREATE INDEX "seller_orders_ownerId_marketplace_idx" ON "seller_orders"("ownerId", "marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "seller_marketplace_connections_ownerId_name_key" ON "seller_marketplace_connections"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "seller_daily_snapshots_ownerId_date_key" ON "seller_daily_snapshots"("ownerId", "date");

-- AddForeignKey
ALTER TABLE "seller_settings" ADD CONSTRAINT "seller_settings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_inventory_movements" ADD CONSTRAINT "seller_inventory_movements_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_inventory_movements" ADD CONSTRAINT "seller_inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "seller_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "seller_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_marketplace_connections" ADD CONSTRAINT "seller_marketplace_connections_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_daily_snapshots" ADD CONSTRAINT "seller_daily_snapshots_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
