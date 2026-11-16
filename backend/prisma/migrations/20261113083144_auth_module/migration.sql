-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "language" TEXT NOT NULL DEFAULT 'Bahasa Indonesia',
    "weekStart" TEXT NOT NULL DEFAULT 'Senin',
    "compact" BOOLEAN NOT NULL DEFAULT true,
    "notifyDaily" BOOLEAN NOT NULL DEFAULT true,
    "notifyStock" BOOLEAN NOT NULL DEFAULT true,
    "notifyBudget" BOOLEAN NOT NULL DEFAULT true,
    "notifyContent" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "aiTone" TEXT NOT NULL DEFAULT 'Ringkas dan langsung',
    "aiCitations" BOOLEAN NOT NULL DEFAULT true,
    "aiEstimates" BOOLEAN NOT NULL DEFAULT true,
    "aiApproval" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "auth_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
