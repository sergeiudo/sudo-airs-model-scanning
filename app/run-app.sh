#!/usr/bin/env bash
# Run the Prisma AIRS Demo UI. Activates the repo venv, loads .env,
# builds the frontend if needed, and starts uvicorn on localhost:8765.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "ERROR: .venv missing — run ./setup-sdk.sh first." >&2
  exit 1
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing — copy .env.template and fill credentials." >&2
  exit 1
fi
set -a; source .env; set +a

if [[ ! -d app/frontend/dist ]]; then
  echo "==> Frontend not built. Running first-time setup (npm install + build)…"
  pushd app/frontend >/dev/null
  npm install
  npm run build
  popd >/dev/null
fi

PORT="${PORT:-8765}"
echo "==> Starting Prisma AIRS Demo UI on http://localhost:${PORT}"
(sleep 1 && python -c "import webbrowser; webbrowser.open('http://localhost:${PORT}')") &
exec uvicorn app.backend.main:app --host 127.0.0.1 --port "$PORT"
