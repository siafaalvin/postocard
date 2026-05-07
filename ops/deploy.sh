#!/usr/bin/env bash
# Zero-downtime deploy for postocard on Hetzner VPS
set -euo pipefail

APP_DIR="/home/deploy/postocard"
APP_NAME="postocard"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
bun install --production

echo "==> Running database migrations..."
bunx prisma migrate deploy

echo "==> Building application..."
bun run build

echo "==> Reloading PM2 process..."
pm2 reload "$APP_NAME" --update-env

echo "==> Deploy complete."
pm2 status "$APP_NAME"
