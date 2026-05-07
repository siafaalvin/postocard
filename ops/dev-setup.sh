#!/usr/bin/env bash
# dev-setup.sh — spin up a full local Postocard dev environment
# Usage: ./ops/dev-setup.sh [--seed] [--reset]
#   --seed   run prisma db seed after migrations
#   --reset  drop and recreate the DB (destructive!)

set -euo pipefail

SEED=false
RESET=false

for arg in "$@"; do
  case $arg in
    --seed)  SEED=true  ;;
    --reset) RESET=true ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[postocard]${NC} $*"; }
success() { echo -e "${GREEN}[postocard]${NC} $*"; }
warn()    { echo -e "${YELLOW}[postocard]${NC} $*"; }
error()   { echo -e "${RED}[postocard] ERROR:${NC} $*" >&2; exit 1; }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v bun    &>/dev/null || error "bun not found — install from https://bun.sh"
command -v docker &>/dev/null || error "docker not found — install Docker Desktop"
docker info       &>/dev/null || error "Docker daemon is not running"

BUN_VERSION=$(bun --version)
DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
success "bun $BUN_VERSION  |  Docker $DOCKER_VERSION"

# ── 2. Environment file ───────────────────────────────────────────────────────
cd "$ROOT_DIR"

if [[ ! -f .env.local ]]; then
  info "Creating .env.local from .env.example..."
  cp .env.example .env.local

  # Auto-generate secrets
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  CRON_SECRET=$(openssl rand -hex 32)
  sed -i.bak "s|NEXTAUTH_SECRET=\"\"|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|" .env.local
  sed -i.bak "s|CRON_SECRET=\"\"|CRON_SECRET=\"$CRON_SECRET\"|"           .env.local
  rm -f .env.local.bak

  warn ".env.local created — fill in Stripe keys and S3 credentials before testing payments/uploads"
else
  info ".env.local already exists — skipping"
fi

# ── 3. Install dependencies ───────────────────────────────────────────────────
info "Installing dependencies..."
bun install
success "Dependencies installed"

# ── 4. Start PostgreSQL ───────────────────────────────────────────────────────
info "Starting PostgreSQL..."
docker compose -f ops/docker-compose.yml up -d postgres

# Wait for Postgres to accept connections (up to 30 s)
info "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker compose -f ops/docker-compose.yml exec -T postgres \
       pg_isready -U postocard -d postocard &>/dev/null; then
    success "PostgreSQL is ready"
    break
  fi
  if [[ $i -eq 30 ]]; then
    error "PostgreSQL did not become ready in time"
  fi
  sleep 1
done

# ── 5. Database (reset or migrate) ───────────────────────────────────────────
if $RESET; then
  warn "--reset flag detected: dropping and recreating the database"
  docker compose -f ops/docker-compose.yml exec -T postgres \
    psql -U postocard -c "DROP DATABASE IF EXISTS postocard;" postgres
  docker compose -f ops/docker-compose.yml exec -T postgres \
    psql -U postocard -c "CREATE DATABASE postocard;" postgres
  info "Running migrations from scratch..."
  bunx prisma migrate dev --name init
else
  info "Running pending migrations..."
  bunx prisma migrate deploy 2>/dev/null || bunx prisma migrate dev --name init
fi

info "Generating Prisma client..."
bunx prisma generate
success "Database ready"

# ── 6. Seed (optional) ───────────────────────────────────────────────────────
if $SEED; then
  info "Seeding database..."
  bunx prisma db seed
  success "Seed complete"
fi

# ── 7. Stripe webhook forwarding (optional) ──────────────────────────────────
if command -v stripe &>/dev/null; then
  info "Starting Stripe webhook forwarding in background..."
  stripe listen --forward-to localhost:3000/api/stripe/webhook \
    --skip-verify &>/tmp/postocard-stripe.log &
  STRIPE_PID=$!
  echo $STRIPE_PID > /tmp/postocard-stripe.pid
  warn "Stripe CLI forwarding started (PID $STRIPE_PID) — logs: /tmp/postocard-stripe.log"
  warn "Copy the whsec_... value from that log into .env.local as STRIPE_WEBHOOK_SECRET"
else
  warn "Stripe CLI not found — skipping webhook forwarding (payments won't work locally)"
  warn "Install: https://stripe.com/docs/stripe-cli"
fi

# ── 8. Start dev server ───────────────────────────────────────────────────────
echo ""
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "  Postocard dev server starting"
success "  http://localhost:3000"
success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open browser after a short delay (macOS / Linux)
(sleep 3 && \
  if command -v open &>/dev/null; then
    open http://localhost:3000
  elif command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:3000
  fi) &

bun dev
