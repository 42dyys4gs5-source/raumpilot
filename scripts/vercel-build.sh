#!/bin/sh
# Build command on Vercel (package.json "vercel-build").
# Production deployments apply pending database migrations first. Migrations must stay additive and
# backward compatible: the previous deployment keeps serving traffic until the new one is live.
# Preview deployments never touch the database schema.
set -e
if [ "$VERCEL_ENV" = "production" ]; then
  echo "▶ Datenbank-Migrationen (Production)"
  npx tsx scripts/migrate.ts
fi
exec npx next build
