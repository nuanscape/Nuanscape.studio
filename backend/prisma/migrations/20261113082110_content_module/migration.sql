-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YouTube', 'TikTok', 'Instagram');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('long', 'short');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Growing', 'Paused');

-- CreateEnum
CREATE TYPE "ContentAssetType" AS ENUM ('Video', 'Image', 'Thumbnail', 'Script', 'Caption');

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "posts30d" INTEGER NOT NULL,
    "views30d" INTEGER NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "avgWatchMinutes" DOUBLE PRECISION NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "status" "AccountStatus" NOT NULL,
    "lastSync" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "niche" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "script" TEXT,
    "thumbnail" TEXT,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "niche" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_assets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContentAssetType" NOT NULL,
    "platform" "Platform" NOT NULL,
    "accountId" TEXT,
    "size" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" TEXT,

    CONSTRAINT "library_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_accounts_ownerId_format_idx" ON "platform_accounts"("ownerId", "format");

-- CreateIndex
CREATE INDEX "platform_accounts_ownerId_platform_idx" ON "platform_accounts"("ownerId", "platform");

-- CreateIndex
CREATE INDEX "content_items_ownerId_platform_status_idx" ON "content_items"("ownerId", "platform", "status");

-- CreateIndex
CREATE INDEX "content_items_ownerId_accountId_idx" ON "content_items"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "content_items_ownerId_scheduledAt_idx" ON "content_items"("ownerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "content_ideas_ownerId_platform_approved_idx" ON "content_ideas"("ownerId", "platform", "approved");

-- CreateIndex
CREATE INDEX "content_ideas_ownerId_accountId_idx" ON "content_ideas"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "library_assets_ownerId_type_idx" ON "library_assets"("ownerId", "type");

-- CreateIndex
CREATE INDEX "library_assets_ownerId_accountId_idx" ON "library_assets"("ownerId", "accountId");

-- CreateIndex
CREATE INDEX "library_assets_ownerId_contentId_idx" ON "library_assets"("ownerId", "contentId");

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_assets" ADD CONSTRAINT "library_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_assets" ADD CONSTRAINT "library_assets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_assets" ADD CONSTRAINT "library_assets_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
