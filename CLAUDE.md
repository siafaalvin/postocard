# Claude Code — postocard
> ICM Layer 0: Project Identity

**Postocard** is a simplified Instagram-style social media PWA. Posts appear in strict chronological order. Basic users see up to 100 posts/day; paid tiers unlock more — or they can pay $1 for 200 extra posts valid 7 days. A Top Feed shows the 100 most popular platform-wide posts each day. A Calendar lets users browse any past day's activity. A Map shows the 100 most popular geotagged posts in any area. Costs **$1/year** to register.

Read `CONTEXT.md` next for task routing within this project.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (via Prisma ORM 6) |
| Auth | NextAuth.js 4 |
| Media Storage | Hetzner Object Storage (S3-compatible) |
| Payments | Stripe 20 + Stripe Elements (`@stripe/react-stripe-js`) |
| EXIF extraction | `exifr` 7 (client-side, dynamic import) |
| Map | MapLibre GL JS + OpenFreeMap tiles (open-source, no API key) |
| Deployment | Hetzner VPS (Ubuntu 22.04) + PM2 + Caddy |
| Package manager | Bun |

---

## Features (v2)

| Feature | Summary |
|---------|---------|
| **Chronological feed** | Main feed always `createdAt DESC`; no ranking |
| **Daily feed caps** | Basic 100/day, Plus 500/day, Creator unlimited; resets midnight UTC |
| **View Extension** | Pay $1 → 200 extra posts for 7 days; stacks; banner appears at cap |
| **Top Feed** | Platform-wide 100 most-liked posts today; computed hourly |
| **Post creation** | Images, video, text status; optional geotag; public or followers-only |
| **Camera-only mode** | User preference; filters out non-camera images (no EXIF Make+Model) from feed |
| **Profile visibility** | Public or private; private profiles also visible to users the owner follows, and to anyone they comment under (3-day window) |
| **Reply threads** | One level of replies under each comment; no deeper nesting |
| **Shareable links** | Every comment and reply has a direct deep-link (`?c=` / `?r=`) |
| **Mass restriction** | Block all followers of a user, all likers of a post, or all likers of a comment (max 5,000) |
| **Restriction context** | Optional 200-char note + hashtag on mute/block; can be shown to the restricted user |
| **Restricted Users page** | `/settings/restricted` — table of all blocks/mutes; bulk undo; create shareable block lists |
| **Shareable block lists** | Export a named list; anyone can view and import it |
| **Calendar** | Browse own posts + interaction events by day; view others' public posts by day |
| **Map** | 100 most popular geotagged posts today in the current viewport |

---

## Project Structure

```
postocard/
├── src/               # Next.js application source
│   ├── app/           # App Router pages & API routes
│   ├── components/    # React components
│   ├── lib/           # Shared utilities, Prisma, Stripe, S3, feed cap, visibility
│   └── prisma/        # Schema and migrations
├── planning/          # PRDs, specs, architecture decisions
├── docs/              # Setup guides, API docs, changelogs
└── ops/               # Docker, deploy scripts, infra config, dev-setup.sh
```

---

## Workspace Routing

| Task | Go to |
|------|-------|
| Work on a feature | `src/CONTEXT.md` |
| Plan a feature | `planning/CONTEXT.md` |
| Deploy / infra | `ops/CONTEXT.md` |
| Documentation | `docs/CONTEXT.md` |
| Spin up local dev | `ops/dev-setup.sh` |

---

## Key Conventions

- Feed always strict chronological — no algorithm reordering
- Post limits enforced server-side: `FeedDailyCount` + active `ViewExtension` rows; never client-side
- All media served via signed S3 URLs (never public bucket)
- Profile visibility checked via `src/lib/visibility.ts → canViewProfile()` — never inline the logic
- EXIF extraction is client-side only (`exifr`, dynamic import) — server never reads raw file bytes for EXIF
- Reply threads are one level deep only — `Reply.commentId → Comment`; no `parentReplyId`
- Block service logic lives in a shared helper so `POST /api/block` and `POST /api/block/mass` share the same path
- Calendar interactions are read-only for other users; own calendar is editable
- Map only shows posts where user has granted location permission
- Never commit `.env` — use `.env.local` for local dev
