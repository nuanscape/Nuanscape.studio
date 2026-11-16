-- AlterTable
ALTER TABLE "content_ideas" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "content_items" ADD COLUMN     "animationStyle" TEXT,
ADD COLUMN     "generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "musicStyle" TEXT,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "sourceIdeaId" TEXT,
ADD COLUMN     "thumbnailStyle" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "content_energy" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 100,
    "max" INTEGER NOT NULL DEFAULT 100,
    "lastRechargeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_energy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_energy_ownerId_key" ON "content_energy"("ownerId");

-- AddForeignKey
ALTER TABLE "content_energy" ADD CONSTRAINT "content_energy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
