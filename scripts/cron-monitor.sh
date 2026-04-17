#!/bin/sh
# Railway cron service — polls the flash sale monitor endpoint every 5 minutes.
# Set APP_URL and CRON_SECRET as Railway environment variables on this service.

set -e

: "${APP_URL:?APP_URL env var is required}"
: "${CRON_SECRET:?CRON_SECRET env var is required}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Polling $APP_URL/api/cron/monitor"

response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/monitor")

body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)

echo "Status: $status"
echo "$body"

if [ "$status" != "200" ]; then
  echo "ERROR: unexpected status $status" >&2
  exit 1
fi
