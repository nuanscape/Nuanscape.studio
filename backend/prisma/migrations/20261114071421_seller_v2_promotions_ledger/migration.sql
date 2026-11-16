-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('active', 'paused', 'scheduled', 'ended');

-- CreateEnum
CREATE TYPE "VoucherKind" AS ENUM ('percent', 'fixed', 'shipping');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('income', 'discount', 'refund', 'platform_fee', 'affiliate_fee', 'shipping', 'cogs', 'ads', 'opex');

-- DropIndex
DROP INDEX "seller_marketplace_connections_ownerId_name_key";

-- AlterTable
ALTER TABLE "seller_orders" ADD COLUMN     "accountId" TEXT NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "seller_products" ADD COLUMN     "accountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discountPct" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "seller_vouchers" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'all',
    "marketplace" "MarketplaceName" NOT NULL,
    "kind" "VoucherKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "minSpend" INTEGER NOT NULL DEFAULT 0,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PromoStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_flash_sales" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'all',
    "marketplace" "MarketplaceName" NOT NULL,
    "productId" TEXT,
    "discountPct" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PromoStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_flash_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_ad_campaigns" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'all',
    "marketplace" "MarketplaceName" NOT NULL,
    "objective" TEXT NOT NULL DEFAULT 'Sales',
    "budget" INTEGER NOT NULL,
    "spend" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PromoStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_ledger_entries" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT 'all',
    "marketplace" "MarketplaceName" NOT NULL,
    "type" "LedgerType" NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "amount" INTEGER NOT NULL,
    "productId" TEXT,
    "ref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_vouchers_ownerId_status_idx" ON "seller_vouchers"("ownerId", "status");

-- CreateIndex
CREATE INDEX "seller_vouchers_ownerId_accountId_idx" ON "seller_vouchers"("ownerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_vouchers_ownerId_code_key" ON "seller_vouchers"("ownerId", "code");

-- CreateIndex
CREATE INDEX "seller_flash_sales_ownerId_status_idx" ON "seller_flash_sales"("ownerId", "status");

-- CreateIndex
CREATE INDEX "seller_flash_sales_ownerId_accountId_idx" ON "seller_flash_sales"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "seller_ad_campaigns_ownerId_status_idx" ON "seller_ad_campaigns"("ownerId", "status");

-- CreateIndex
CREATE INDEX "seller_ad_campaigns_ownerId_accountId_idx" ON "seller_ad_campaigns"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_ownerId_date_idx" ON "seller_ledger_entries"("ownerId", "date");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_ownerId_type_idx" ON "seller_ledger_entries"("ownerId", "type");

-- CreateIndex
CREATE INDEX "seller_ledger_entries_ownerId_accountId_idx" ON "seller_ledger_entries"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "seller_marketplace_connections_ownerId_name_idx" ON "seller_marketplace_connections"("ownerId", "name");

-- CreateIndex
CREATE INDEX "seller_orders_ownerId_accountId_idx" ON "seller_orders"("ownerId", "accountId");

-- AddForeignKey
ALTER TABLE "seller_vouchers" ADD CONSTRAINT "seller_vouchers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_flash_sales" ADD CONSTRAINT "seller_flash_sales_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_flash_sales" ADD CONSTRAINT "seller_flash_sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "seller_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ad_campaigns" ADD CONSTRAINT "seller_ad_campaigns_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_ledger_entries" ADD CONSTRAINT "seller_ledger_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "seller_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
