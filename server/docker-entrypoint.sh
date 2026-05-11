#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until node -e "require('net').createConnection(5432,'postgres').on('error',()=>process.exit(1))" 2>/dev/null; do
  echo "   Waiting for postgres..."
  sleep 2
done

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Starting server..."
exec node dist/main
