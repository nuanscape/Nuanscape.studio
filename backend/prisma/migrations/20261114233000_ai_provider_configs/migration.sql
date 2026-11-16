-- Kredensial provider LLM terenkripsi per owner (AES-256-GCM).
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyIv" TEXT NOT NULL,
    "keyTag" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "keyHint" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_provider_configs_ownerId_provider_key" ON "ai_provider_configs"("ownerId", "provider");
CREATE INDEX "ai_provider_configs_ownerId_idx" ON "ai_provider_configs"("ownerId");

ALTER TABLE "ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
