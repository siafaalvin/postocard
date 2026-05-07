# Project Context — postocard
> ICM Layer 1: Task Routing

---

## Current Status

| Item | Detail |
|------|--------|
| Stage | Planning |
| PRD | `planning/PRD-postocard.md` |
| Active tasks | None yet — scaffold only |

---

## Workspace Routing

### "I want to build a feature"
→ `src/CONTEXT.md` — read first, then the relevant PRD section

### "I want to plan or spec something"
→ `planning/CONTEXT.md` — check existing PRDs before writing new ones

### "I want to deploy or configure infra"
→ `ops/CONTEXT.md` — Hetzner VPS + Caddy + PM2 guides

### "I need setup instructions"
→ `docs/setup.md` — local dev + Hetzner production

---

## Feature Areas

| Area | Description |
|------|-------------|
| Auth & Registration | NextAuth + Stripe $1/yr one-time registration |
| Main Feed | Chronological posts from followed users, 100/day cap |
| Top Feed | Platform-wide 100 most popular posts today |
| Post Creation | Image, video, status — with optional geotag |
| Calendar | Browse any day's posts, own interactions |
| Map | 100 most popular geotagged posts in area |
| Social Graph | Follow, unfollow, mute, block, follow requests |
| Interactions | Like, comment (top-level only tracked in calendar) |
| Paid Tiers | More daily posts, higher upload limits |
| Admin | Moderation queue, user management |

---

## Auto-Synced State
<!-- icm:auto-start -->
> **Last synced:** 2026-04-27

| Workspace | Status | Notes |
|-----------|--------|-------|
| `planning/` | 🔵 Ready | PRD written |
| `src/` | ⚪ Not started | |
| `docs/` | 🟢 Setup docs ready | |
| `ops/` | 🟢 Deploy config ready | |
<!-- icm:auto-end -->
