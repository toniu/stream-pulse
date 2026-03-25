#!/usr/bin/env bash
# Start the pyAux backend in a predictable way for local development
# Usage: ./scripts/start-backend.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PY="$ROOT_DIR/venv/bin/python"
APP_PY="$ROOT_DIR/app.py"

if [ ! -x "$VENV_PY" ]; then
  echo "Virtualenv Python not found at $VENV_PY"
  echo "Create a venv and install requirements first: python -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "Starting pyAux backend with $VENV_PY $APP_PY"
exec "$VENV_PY" "$APP_PY"
