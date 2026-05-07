# Postocard — Setup & Deployment Guide

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Docker Desktop](https://docs.docker.com/desktop/) (for local PostgreSQL)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for webhook forwarding)

### 1. Clone & Install

```bash
git clone <repo-url> postocard
cd postocard
bun install
```

### 2. Start PostgreSQL

```bash
cd ops
docker compose up -d postgres
```

PostgreSQL starts on `localhost:5432`.

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://postocard:postocard@localhost:5432/postocard"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate: openssl rand -base64 32>"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_BASIC_PRICE_ID="price_..."             # $1/yr
STRIPE_PLUS_PRICE_ID="price_..."              # $5/yr
STRIPE_CREATOR_PRICE_ID="price_..."           # $20/yr
STRIPE_VIEW_EXTENSION_PRICE_ID="price_..."    # $1 one-time view extension

# Hetzner Object Storage (S3-compatible)
S3_ENDPOINT="https://<bucket>.your-objectstorage.com"
S3_BUCKET="postocard-media"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_REGION="eu-central-1"

# MapLibre tile style — no account or API key needed
NEXT_PUBLIC_MAP_STYLE_URL="https://tiles.openfreemap.org/styles/bright"

# Top Feed cron secret (used to authenticate the hourly job trigger)
CRON_SECRET="<generate: openssl rand -hex 32>"
```

### 4. Run Migrations

```bash
bunx prisma migrate dev --name init
bunx prisma generate
```

### 5. Forward Stripe Webhooks

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 6. Start Dev Server

```bash
bun dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### 7. Seed Test Data (Optional)

```bash
bunx prisma db seed
```

---

## Cron Jobs

### Top Feed (hourly)

Computes the hourly Top Feed snapshot by hitting `/api/cron/top-feed` with the `CRON_SECRET` in the `Authorization` header.

**Local**: run manually:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/top-feed
```

**Production**:

```bash
# crontab -e (as deploy user)
0 * * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" https://postocard.app/api/cron/top-feed
```

### Expired Profile Grants cleanup (daily)

Deletes `TemporaryProfileGrant` rows where `expiresAt < NOW()` (see Feature 2 — temporary profile visibility).

**Local**: run manually:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/cleanup-grants
```

**Production**:

```bash
# crontab -e (as deploy user)
0 3 * * * curl -s -H "Authorization: Bearer <CRON_SECRET>" https://postocard.app/api/cron/cleanup-grants
```

---

## Production — Hetzner VPS

### Server Sizing

| Tier | VPS Type | RAM | vCPU | Storage | Est. users |
|------|----------|-----|------|---------|------------|
| Launch | CX31 | 8 GB | 2 | 80 GB | < 10,000 |
| Growth | CX41 | 16 GB | 4 | 160 GB | < 50,000 |
| Scale | CCX23 | 16 GB | 4 (dedicated) | 360 GB | < 200,000 |

Media storage lives in Hetzner Object Storage — VPS disk only needs app + DB.

### Initial Server Setup

```bash
# SSH into Hetzner VPS
ssh root@<server-ip>

# Create deploy user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Install Bun
curl -fsSL https://bun.sh/install | bash && source /root/.bashrc

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Install PostgreSQL 16
apt install -y postgresql-16 postgresql-client-16
```

### PostgreSQL Setup

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE postocard;
CREATE USER postocard WITH ENCRYPTED PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE postocard TO postocard;
\q
```

### Caddy Configuration

`/etc/caddy/Caddyfile`:

```caddy
postocard.app {
    reverse_proxy localhost:3000
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
systemctl reload caddy
```

### App Deployment

```bash
cd /home/deploy
git clone <repo-url> postocard
cd postocard
bun install --production
```

Create `/home/deploy/postocard/.env.production.local` with all production env vars.

```bash
bunx prisma migrate deploy
bun run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### Zero-Downtime Redeploy

```bash
cd /home/deploy/postocard
./ops/deploy.sh
```

### Hetzner Object Storage

1. Create bucket `postocard-media` — set to **private**
2. Configure CORS for `https://postocard.app` (PUT, GET methods)
3. Create access keys → add to production `.env`
4. Set up lifecycle rule: delete media 30 days after soft-delete flag (or manage via cleanup job)

### Map Tiles

Tiles are served by [OpenFreeMap](https://openfreemap.org) — no account or API key needed. The style URL is set in `NEXT_PUBLIC_MAP_STYLE_URL`. Available styles: `bright`, `positron`, `fiord-color`. No production restriction needed since there is no token to protect.

### DNS

Point `postocard.app` A record → Hetzner VPS IP. Caddy auto-provisions TLS.

### Monitoring

```bash
pm2 logs postocard
pm2 monit
journalctl -u caddy -f
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Full public URL |
| `NEXTAUTH_SECRET` | Yes | Random 32-byte base64 secret |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_BASIC_PRICE_ID` | Yes | $1/yr price ID |
| `STRIPE_PLUS_PRICE_ID` | Yes | $5/yr price ID |
| `STRIPE_CREATOR_PRICE_ID` | Yes | $20/yr price ID |
| `STRIPE_VIEW_EXTENSION_PRICE_ID` | Yes | $1 one-time view extension price ID |
| `S3_ENDPOINT` | Yes | Object storage endpoint |
| `S3_BUCKET` | Yes | Bucket name |
| `S3_ACCESS_KEY` | Yes | Object storage access key |
| `S3_SECRET_KEY` | Yes | Object storage secret key |
| `S3_REGION` | Yes | Storage region |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Yes | MapLibre tile style URL (OpenFreeMap or self-hosted) |
| `CRON_SECRET` | Yes | Top Feed cron authentication secret |
