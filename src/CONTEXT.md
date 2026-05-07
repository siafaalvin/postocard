# Source Context — postocard
> ICM Layer 2: Application Source Workspace

---

## Purpose

Next.js 15 App Router application source for Postocard.

---

## Planned Structure

```
src/
├── app/
│   ├── (public)/                        # Landing, Top Feed, login, signup
│   │   └── blocklist/[slug]/            # Public shareable block list view (F6)
│   ├── (app)/                           # Authenticated shell
│   │   ├── feed/                        # Main chronological feed
│   │   ├── top/                         # Top 100 posts today
│   │   ├── map/                         # Map view
│   │   ├── post/new/                    # Create post
│   │   ├── post/[id]/                   # Single post (deep-links via ?c= and ?r=)
│   │   ├── [username]/                  # Public profile
│   │   ├── [username]/calendar/         # Calendar view
│   │   └── settings/
│   │       ├── page.tsx                 # Account + subscription + camera-only toggle
│   │       └── restricted/              # Restricted users table (F6)
│   ├── admin/                           # Moderation queue
│   └── api/                             # API routes (see PRD for full route list)
├── components/
│   ├── feed/
│   │   ├── PostCard
│   │   ├── FeedList
│   │   ├── DailyCapBanner
│   │   ├── ViewExtensionBanner          # F1: shown when daily cap reached
│   │   └── ViewExtensionModal           # F1: Stripe Elements payment modal
│   ├── post/
│   │   ├── PostForm
│   │   ├── MediaUpload                  # F7: runs exifr EXIF extraction before upload
│   │   ├── LocationPicker
│   │   ├── ReplyThread                  # F3: collapsible reply list per comment
│   │   ├── ReplyForm                    # F3: inline reply input
│   │   ├── CommentShareButton           # F3: copies /post/[id]?c=[commentId]
│   │   └── ReplyShareButton             # F3: copies /post/[id]?c=[commentId]&r=[replyId]
│   ├── map/                             # MapView, PostPin
│   ├── calendar/                        # CalendarGrid, DayView, EventItem
│   ├── social/
│   │   ├── FollowButton
│   │   ├── UserCard
│   │   ├── MassBlockModal               # F4: confirm mass-block action
│   │   ├── RestrictionContextPanel      # F5: note + hashtag + visibility toggle
│   │   ├── MuteModal                    # F5: mute confirmation with context panel
│   │   └── BlockModal                   # F5: block confirmation with context panel
│   ├── settings/
│   │   ├── RestrictedUsersTable         # F6: paginated table with bulk selection
│   │   ├── BlockListShareModal          # F6: create named shareable list
│   │   ├── BlockListImportCard          # F6: import a block list on /blocklist/[slug]
│   │   └── CameraOnlyToggle             # F7: preference toggle in settings
│   └── ui/                             # Shared primitives
└── lib/
    ├── prisma.ts                        # Prisma client singleton
    ├── stripe.ts                        # Stripe client + helpers
    ├── storage.ts                       # S3 presigned URL helpers
    ├── auth.ts                          # NextAuth config
    ├── feed.ts                          # getRemainingCapacity (base tier + ViewExtension)
    └── visibility.ts                    # canViewProfile() — all 5 visibility rules (F2)

# prisma/ lives at the project root (alongside src/), not inside src/
prisma/
├── schema.prisma
└── migrations/
```

---

## Conventions

- Feed queries must include `ORDER BY "createdAt" DESC` — never let ORM default reorder
- Daily cap checked server-side in the feed API route via `FeedDailyCount` + active `ViewExtension` rows
- All media accessed via presigned GET URLs (30-min expiry); never public bucket
- Top Feed reads from `TopFeedSnapshot` table — never re-queries live likes in feed route
- Geotag is optional and never required; map shows only posts where `lat IS NOT NULL`
- Profile visibility checked via `canViewProfile()` in `src/lib/visibility.ts` — never inline
- EXIF extraction is client-side only (`exifr`, dynamic import); server never reads raw file bytes for EXIF
- Reply threads are one level deep only — `Reply.commentId` → `Comment`; no `Reply.parentReplyId`
- Block service logic lives in a shared helper so both `POST /api/block` and `POST /api/block/mass` use the same path

---

## Key Dependencies

```json
{
  "next": "^16",
  "react": "^19",
  "@prisma/client": "^6",
  "next-auth": "^4",
  "stripe": "^20",
  "@stripe/stripe-js": "^5",
  "@stripe/react-stripe-js": "^3",
  "@aws-sdk/client-s3": "^3",
  "maplibre-gl": "^5",
  "tailwindcss": "^4",
  "zod": "^4",
  "exifr": "^7"
}
```
