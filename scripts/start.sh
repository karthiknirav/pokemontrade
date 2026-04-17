#!/bin/sh
# Railway start script — routes to cron or web based on IS_CRON env var
if [ "$IS_CRON" = "true" ]; then
  echo "Starting cron monitor service..."
  sh scripts/cron-monitor.sh
else
  echo "Starting web server..."
  npx prisma migrate deploy && npx next start
fi
