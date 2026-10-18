#!/usr/bin/env bash
# Smoke auth для POST /orders/yookassa/webhook — только через nginx :80/:443.
# См. deploy/CHECKOUT-PROD.md. Не бить в :3011.
set -euo pipefail

HOST="${SMOKE_HOST:-vspomni.store}"
IP="${SMOKE_IP:-}"
SECRET="${YOOKASSA_WEBHOOK_SECRET:-}"

if [[ -z "$IP" && -f "$(cd "$(dirname "$0")/.." && pwd)/deploy/deploy.env" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$(cd "$(dirname "$0")/.." && pwd)/deploy/deploy.env" && set +a
  IP="${DEPLOY_HOST##*@}"
fi
: "${IP:?задайте SMOKE_IP или DEPLOY_HOST}"

BASE="https://${HOST}/api/v1"
RESOLVE=(--resolve "${HOST}:443:${IP}")

echo "==> webhook without secret (expect 401 if secret configured)"
code=$(curl -skS -o /tmp/yk-wh1.json -w "%{http_code}" -X POST \
  "${RESOLVE[@]}" \
  "$BASE/orders/yookassa/webhook" \
  -H 'content-type: application/json' \
  -d '{"event":"payment.waiting_for_capture","object":{"id":"smoke-missing","status":"waiting_for_capture","paid":true,"amount":{"value":"1.00","currency":"RUB"}}}')
echo "HTTP $code body=$(head -c 200 /tmp/yk-wh1.json)"

if [[ -n "$SECRET" ]]; then
  echo "==> webhook with header secret + YooKassa IP (auth should pass)"
  code=$(curl -skS -o /tmp/yk-wh2.json -w "%{http_code}" -X POST \
    "${RESOLVE[@]}" \
    "$BASE/orders/yookassa/webhook" \
    -H 'content-type: application/json' \
    -H "X-Yookassa-Webhook-Secret: ${SECRET}" \
    -H 'X-Forwarded-For: 185.71.76.1' \
    -d '{"event":"payment.waiting_for_capture","object":{"id":"smoke-nonexistent","status":"waiting_for_capture","paid":true,"amount":{"value":"1.00","currency":"RUB"}}}')
  echo "HTTP $code body=$(head -c 200 /tmp/yk-wh2.json)"
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    echo "FAIL: auth rejected with valid secret — check TRUST_PROXY / YOOKASSA_WEBHOOK_*"
    exit 1
  fi
fi

echo "DONE (via :443 @ ${IP})"
