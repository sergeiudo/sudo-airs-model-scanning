#!/usr/bin/env bash
# Kill any running Prisma AIRS Demo UI server, then start a fresh one.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8765}"

PIDS="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
if [[ -n "$PIDS" ]]; then
  echo "==> Stopping existing server on port ${PORT} (pids: ${PIDS})"
  kill $PIDS 2>/dev/null || true
  sleep 1
  PIDS="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
  if [[ -n "$PIDS" ]]; then
    echo "==> Force-killing stubborn processes (${PIDS})"
    kill -9 $PIDS 2>/dev/null || true
  fi
fi

exec "$ROOT/app/run-app.sh"
