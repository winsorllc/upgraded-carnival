#!/bin/bash
# Test webhook sender

URL="${1:-http://127.0.0.1:3456/webhook/generic}"
PAYLOAD="${2:-'{"event":"test","timestamp":"'$(date -Iseconds)'"}'}"
SECRET="${3:-}"

echo "🚀 Sending webhook to: $URL"
echo "📦 Payload: $PAYLOAD"

if [ -n "$SECRET" ]; then
  SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
  echo "🔏 Signature: sha256=$SIGNATURE"
  curl -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
    -d "$PAYLOAD" \
    -s | jq .
else
  echo "⚠️  No secret configured"
  curl -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -s | jq .
fi

echo "✅ Done"