-- CreateEnum
CREATE TYPE "AutomationModule" AS ENUM ('Finance', 'Content', 'Shop');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('active', 'paused', 'needs_approval');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('finance', 'content', 'shop', 'system', 'ai');

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "AutomationModule" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'active',
    "trigger" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "successRate" INTEGER NOT NULL DEFAULT 100,
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "summary" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefing_reports" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'daily',
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "metrics" JSONB,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "head_agent_configs" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "primaryProvider" TEXT NOT NULL DEFAULT 'kie.ai',
    "fallbackProvider" TEXT NOT NULL DEFAULT 'openrouter',
    "primaryModel" TEXT NOT NULL DEFAULT 'kimi-k3-1-pro',
    "fallbackModel" TEXT NOT NULL DEFAULT 'google/gemini-3.8-flash',
    "autoApproval" BOOLEAN NOT NULL DEFAULT false,
    "dailyBriefingHour" INTEGER NOT NULL DEFAULT 7,
    "weeklyBriefingDay" TEXT NOT NULL DEFAULT 'Senin',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automations_ownerId_module_idx" ON "automations"("ownerId", "module");

-- CreateIndex
CREATE INDEX "automations_ownerId_status_idx" ON "automations"("ownerId", "status");

-- CreateIndex
CREATE INDEX "automation_runs_ownerId_automationId_idx" ON "automation_runs"("ownerId", "automationId");

-- CreateIndex
CREATE INDEX "app_notifications_ownerId_read_idx" ON "app_notifications"("ownerId", "read");

-- CreateIndex
CREATE INDEX "app_notifications_ownerId_type_idx" ON "app_notifications"("ownerId", "type");

-- CreateIndex
CREATE INDEX "briefing_reports_ownerId_date_idx" ON "briefing_reports"("ownerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "head_agent_configs_ownerId_key" ON "head_agent_configs"("ownerId");

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefing_reports" ADD CONSTRAINT "briefing_reports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "head_agent_configs" ADD CONSTRAINT "head_agent_configs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
