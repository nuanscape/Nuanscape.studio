#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
AGENT_HOME="$ROOT/agents/picoclaw"
PICOCLAW_BIN="${PICOCLAW_BIN:-./agents/picoclaw/bin/picoclaw}"
if [[ "$PICOCLAW_BIN" == */* && "$PICOCLAW_BIN" != /* ]]; then
  PICOCLAW_BIN="$ROOT/${PICOCLAW_BIN#./}"
fi
if [ ! -f "$AGENT_HOME/.security.yml" ]; then
  echo "SPIKE FAIL: $AGENT_HOME/.security.yml belum ada. Jalankan: npm run agent:security" >&2
  exit 1
fi
if grep -q 'REPLACE_WITH_VALID_NVIDIA_KEY' "$AGENT_HOME/.security.yml"; then
  echo "WARN: NVIDIA fallback masih placeholder. Set NVIDIA_API_KEY lalu jalankan npm run agent:security." >&2
fi
mkdir -p "$AGENT_HOME/.runtime"

export PICOCLAW_CONFIG="$AGENT_HOME/config.json"
export PICOCLAW_HOME="$AGENT_HOME/.runtime"
export PICOCLAW_LOG_LEVEL=info

RUNTIME_CONFIG="$AGENT_HOME/config.spike.json"
jq --arg root "$AGENT_HOME" '
  def absolutize:
    if . == null then .
    elif startswith("/") then .
    else ($root + "/" + (sub("^\\./"; "")))
    end;
  (if .agents.defaults.workspace then .agents.defaults.workspace |= absolutize else . end)
  | (if .agents.list then .agents.list |= map(if .workspace then .workspace |= absolutize else . end) else . end)
' "$AGENT_HOME/config.json" > "$RUNTIME_CONFIG"
export PICOCLAW_CONFIG="$RUNTIME_CONFIG"

WORKSPACES=(workspace workspace-asep workspace-ucup workspace-bambang)
for workspace in "${WORKSPACES[@]}"; do
  cp "$AGENT_HOME/context.sample.json" "$AGENT_HOME/$workspace/context.json"
done

LOG="$AGENT_HOME/.runtime/spike.log"
OUT="$AGENT_HOME/.runtime/spike.out"
cd "$AGENT_HOME"
set +e
"$PICOCLAW_BIN" agent \
  --message "$(cat "$AGENT_HOME/prompt.txt")" \
  --session "agent:muhe:nuanscape:spike-$(date +%s)" >"$OUT" 2>"$LOG"
STATUS=$?
set -e

rm -f "$RUNTIME_CONFIG"
for workspace in "${WORKSPACES[@]}"; do
  rm -f "$AGENT_HOME/$workspace/context.json"
done

if [ "$STATUS" -ne 0 ]; then
  echo "SPIKE FAIL: picoclaw exit $STATUS; lihat $LOG" >&2
  tail -50 "$LOG" >&2
  exit 1
fi

REGISTERED="$(cat "$OUT" "$LOG" | grep -c 'Registered agent' || true)"
if [ "$REGISTERED" -lt 4 ]; then
  echo "SPIKE FAIL: agent terdaftar $REGISTERED/4" >&2
  exit 1
fi

JSON="$(awk '
  /<<<NUANSCAPE_JSON>>>/ { start=1; buf=""; next }
  /<<<END_NUANSCAPE_JSON>>>/ && start { exit }
  start { buf = buf $0 "\n" }
  END { printf "%s", buf }
' "$OUT")"
if [ -z "$JSON" ]; then
  echo "SPIKE FAIL: sentinel JSON tidak ditemukan di stdout (final response kosong)." >&2
  echo "Lihat $OUT dan $LOG. Periksa kredensial/saldo provider." >&2
  tail -5 "$OUT" >&2
  exit 1
fi

if ! printf '%s' "$JSON" | jq -e '.findings | length >= 3' >/dev/null; then
  echo "SPIKE FAIL: JSON tidak valid atau findings < 3" >&2
  printf '%s\n' "$JSON" | head -c 1000 >&2
  exit 1
fi
AGENTS="$(printf '%s' "$JSON" | jq -r '[.findings[].agent] | unique | join(",")')"
COUNT="$(printf '%s' "$JSON" | jq '.findings | length')"
echo "SPIKE OK: registered=$REGISTERED findings=$COUNT agents=$AGENTS"