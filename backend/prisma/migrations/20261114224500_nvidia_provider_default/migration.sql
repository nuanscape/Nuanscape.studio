-- Default head agent fallback ke NVIDIA NIM (KIE primary).
ALTER TABLE "head_agent_configs" ALTER COLUMN "fallbackProvider" SET DEFAULT 'nvidia';
ALTER TABLE "head_agent_configs" ALTER COLUMN "fallbackModel" SET DEFAULT 'meta/llama-3.3-70b-instruct';

-- Normalisasi konfigurasi lama agar tidak lagi mengarah ke OpenRouter.
UPDATE "head_agent_configs"
SET "fallbackProvider" = 'nvidia',
    "fallbackModel" = 'meta/llama-3.3-70b-instruct'
WHERE "fallbackProvider" = 'openrouter';
