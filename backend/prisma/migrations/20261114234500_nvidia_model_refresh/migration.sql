-- Model fallback NVIDIA NIM lama sudah EOL (26 Agustus 2026).
-- Ganti default dan migrasikan konfigurasi yang masih memakai model lama.
ALTER TABLE "head_agent_configs"
    ALTER COLUMN "fallbackModel" SET DEFAULT 'nvidia/nemotron-3.5-lightning-30b-a3b';

UPDATE "head_agent_configs"
SET "fallbackModel" = 'nvidia/nemotron-3.5-lightning-30b-a3b'
WHERE "fallbackModel" = 'meta/llama-3.3-70b-instruct';

UPDATE "ai_provider_configs"
SET "model" = 'nvidia/nemotron-3.5-lightning-30b-a3b'
WHERE "provider" = 'nvidia'
  AND "model" = 'meta/llama-3.3-70b-instruct';
