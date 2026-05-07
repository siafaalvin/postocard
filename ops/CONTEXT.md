# Ops Context — postocard
> ICM Layer 2: Operations Workspace

---

## Purpose

Infrastructure, deployment, and runtime configuration for Postocard.

---

## Contents

| File | Description |
|------|-------------|
| `docker-compose.yml` | Local development PostgreSQL |
| `deploy.sh` | Zero-downtime production deploy script |
| `ecosystem.config.js` | PM2 process configuration |
| `Caddyfile` | Caddy reverse proxy config |

---

## Environments

| Env | Host | URL |
|-----|------|-----|
| Local | Docker | http://localhost:3000 |
| Production | Hetzner CX31 | https://postocard.app |

---

## Deploy Process

1. `git pull` on server
2. `bun install --production`
3. `bunx prisma migrate deploy`
4. `bun run build`
5. `pm2 reload postocard`

See `docs/setup.md` for full guide.

---

## Cron Jobs

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Top Feed snapshot | Hourly (`0 * * * *`) | `/api/cron/top-feed` |
