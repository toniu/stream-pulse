#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL=${API_URL:-http://localhost:5001/api/v1/analyze}

echo "Running pyAux smoke test against $API_URL"

PAYLOAD='{"tracks":[{"tempo":120,"energy":0.5,"valence":0.5,"danceability":0.6,"key":0,"mode":1},{"tempo":125,"energy":0.6,"valence":0.6,"danceability":0.7,"key":2,"mode":1}]}'

RESP=$(curl -sS -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$API_URL")
if [ -z "$RESP" ]; then
  echo "No response from $API_URL" >&2
  exit 2
fi

echo "Response: $RESP" | jq || true

SUCCESS=$(echo "$RESP" | jq -r '.success // false')
if [ "$SUCCESS" != "true" ]; then
  echo "Smoke test failed: success != true" >&2
  exit 3
fi

echo "Smoke test passed"
