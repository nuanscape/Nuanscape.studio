#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/agents/picoclaw/.security.yml"

: "${KIE_API_KEY:?Set KIE_API_KEY (kie.ai) dulu}"
NVIDIA_KEY="${NVIDIA_API_KEY:-}"

umask 077
{
  printf 'model_list:\n'
  printf '  kie-kimi:\n    api_keys:\n      - "%s"\n' "$KIE_API_KEY"
  printf '  kie-gpt5:\n    api_keys:\n      - "%s"\n' "$KIE_API_KEY"
  printf '  kie-gemini:\n    api_keys:\n      - "%s"\n' "$KIE_API_KEY"
  if [ -n "$NVIDIA_KEY" ]; then
    printf '  nvidia-llama:\n    api_keys:\n      - "%s"\n' "$NVIDIA_KEY"
  fi
} >"$OUT"
chmod 600 "$OUT"

echo "Security file updated: $OUT"
