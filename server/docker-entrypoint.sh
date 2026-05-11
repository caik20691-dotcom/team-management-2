#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until node -e "const s=require('net').createConnection(5432,'postgres',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; do
  echo "   Waiting for postgres..."
  sleep 2
done

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Starting server..."
exec node dist/src/main
