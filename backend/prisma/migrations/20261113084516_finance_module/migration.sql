-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "TransactionAccount" AS ENUM ('Personal', 'Business', 'Marketplace');

-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('none', 'monthly', 'weekly');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('Cash', 'Bank', 'Investment', 'Business', 'Inventory');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('Debt', 'Obligation');

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "account" "TransactionAccount" NOT NULL,
    "recurring" "RecurringInterval" NOT NULL DEFAULT 'none',
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_budgets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit_amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_goals" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "saved" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATE NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_assets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "value" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_liabilities" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LiabilityType" NOT NULL,
    "value" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_monthly_snapshots" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "income" INTEGER NOT NULL,
    "expense" INTEGER NOT NULL,

    CONSTRAINT "finance_monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_transactions_ownerId_date_idx" ON "finance_transactions"("ownerId", "date");

-- CreateIndex
CREATE INDEX "finance_transactions_ownerId_type_category_idx" ON "finance_transactions"("ownerId", "type", "category");

-- CreateIndex
CREATE INDEX "finance_transactions_ownerId_account_idx" ON "finance_transactions"("ownerId", "account");

-- CreateIndex
CREATE UNIQUE INDEX "finance_budgets_ownerId_category_key" ON "finance_budgets"("ownerId", "category");

-- CreateIndex
CREATE INDEX "finance_goals_ownerId_deadline_idx" ON "finance_goals"("ownerId", "deadline");

-- CreateIndex
CREATE INDEX "finance_assets_ownerId_type_idx" ON "finance_assets"("ownerId", "type");

-- CreateIndex
CREATE INDEX "finance_liabilities_ownerId_dueDate_idx" ON "finance_liabilities"("ownerId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "finance_monthly_snapshots_ownerId_month_key" ON "finance_monthly_snapshots"("ownerId", "month");

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_goals" ADD CONSTRAINT "finance_goals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_assets" ADD CONSTRAINT "finance_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_liabilities" ADD CONSTRAINT "finance_liabilities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_monthly_snapshots" ADD CONSTRAINT "finance_monthly_snapshots_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
