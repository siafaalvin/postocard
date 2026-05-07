# PRD — Postocard
> Product Requirements Document · v2.0 · 2026-05-05

---

## Overview

Postocard is a simplified social media PWA inspired by early Instagram. The core principle: **chronological feeds, no algorithm**. Users share images, videos, and text status updates. A one-time **$1/year registration fee** keeps bots out and costs down.

---

## Goals

1. Restore the chronological social feed — users see what people posted in the order they posted it
2. Give users clear daily limits so the app is a considered experience, not a doom-scroll machine
3. Surface discovery through popularity (Top Feed) and location (Map) without algorithmic ranking
4. Let users own their history via the Calendar view

---

## Non-Goals (v2)

- Stories / ephemeral content
- Direct messaging
- Reels / short-form video loops
- Advertising
- Algorithm-based ranking of any feed

---

## User Roles

| Role | Description |
|------|-------------|
| `basic` | Registered, paid $1 — 100 posts/day in main feed |
| `plus` | Paid upgrade — 500 posts/day, higher upload limits |
| `creator` | Higher upload limits, analytics, scheduled posts |
| `admin` | Platform moderation |

---

## Core Features

### 1. Registration & Subscription

- Email + password via NextAuth credentials
- Stripe Checkout: $1/year registration fee (not recurring subscription — annual renewal)
- Unregistered visitors can view public profiles and the Top Feed (read-only)
- Registered users can post, follow, like, comment

### 2. Main Feed

- Posts from followed accounts, ordered strictly by `createdAt DESC`
- **Daily cap**: 100 posts for `basic` users, 500 for `plus`, unlimited for `creator`
- Cap resets at midnight UTC
- When cap is reached: show `ViewExtensionBanner` — "You've seen all your posts today. View 200 more for $1 (valid 7 days)." or upgrade prompt
- Videos autoplay muted; tap to unmute
- No reposts/shares in main feed (users can copy link)
- **Camera-only mode**: optional user preference; when on, filters out posts whose media lacks camera EXIF metadata (see Feature 7)

### 3. Top Feed

- Platform-wide 100 most-liked posts created **today** (UTC day)
- Computed hourly via background job — not real-time
- Available to all users including logged-out visitors
- Toggle between Main Feed and Top Feed via tab/toggle in nav
- Respects camera-only mode preference when viewer is logged in

### 4. Post Creation

| Field | Type | Limits |
|-------|------|--------|
| Media | Image or video | Images ≤ 10 MB, Video ≤ 200 MB |
| Caption | Text | 2,200 chars |
| Status | Text-only post | 500 chars |
| Location | Optional geotag (lat/lng) | User-granted browser permission |
| Visibility | Public or followers-only | Default: public |

- Media uploaded directly to Hetzner Object Storage via presigned PUT URL
- Client-side EXIF extraction (`exifr`) runs before upload; `hasCamera` + `mediaMetadata` sent with post creation
- Next.js API route generates presigned URL, stores metadata in DB after upload confirms

### 5. Calendar View

- Month calendar grid; tap any day to see that day's content
- **Viewing others' calendars**: shows their public posts for that day (chronological)
- **Own calendar**: shows:
  - Own posts and comments
  - Top-level interactions: Followed/Unfollowed, Follow Requested, Muted, Blocked, Liked post
  - Each event is a clickable link to the relevant post/profile
- Interaction log stored in `UserEvent` table at time of action

### 6. Map View

- Shows the **100 most popular geotagged posts today** within the current map viewport
- Uses MapLibre GL JS + OpenFreeMap tiles; pins cluster below zoom threshold
- Tap pin → post preview card
- Only posts with a geotag and public visibility appear on the map
- Available to logged-in users only

### 7. Social Graph

| Action | Notes |
|--------|-------|
| Follow | If target is public, immediate. If private, sends follow request. |
| Unfollow | Immediate; logged in own calendar |
| Mute | Hides posts from feed without unfollowing; logged in own calendar. Context note + topic hashtag optional. |
| Block | Removes follow relationship both ways; blocks search/profile view. Context note + topic hashtag optional. |
| Follow Request | Target approves/declines; logged in own calendar |
| Mass Block | Block all followers of a user, all likers of a post, or all likers of a comment in one action (max 5,000). |

### 8. Interactions

- **Like**: tap heart — increments like count; logged in own calendar
- **Comment**: supports one level of replies (not nested deeper)
- **Comment like**: tap heart on a comment
- **Share**: copy link only — no platform repost. Comments and replies each have their own direct shareable link.
- **Save**: private bookmark, not shared

---

## Feature 1 — Post-View Limit Extension

When a user's daily feed cap is reached, a `ViewExtensionBanner` appears at the bottom of the feed offering 200 additional posts for $1, valid for 7 days. Extensions stack and can be purchased multiple times.

**Flow:**
1. User sees banner → taps "Buy Now"
2. `POST /api/stripe/view-extension` creates a Stripe PaymentIntent ($1, `purpose: "view_extension"` metadata)
3. `ViewExtensionModal` (Stripe Elements) collects payment
4. Webhook `payment_intent.succeeded` creates a `ViewExtension` row (`expiresAt = now + 7 days`)
5. Feed re-queries; banner disappears; 200 more posts served

**Cap logic** (`src/lib/feed.ts`):
- `totalCap = baseTierCap + SUM(postsGranted − usedCount) for active non-expired extensions`
- When posts are served, `usedCount` incremented on the oldest non-exhausted extension first (FIFO)

---

## Feature 2 — Enhanced Profile Visibility

**Profile visibility rules** (evaluated in order, first `true` wins):

| # | Condition | Result |
|---|-----------|--------|
| 1 | Profile is public | Visible |
| 2 | Viewer is the profile owner | Visible |
| 3 | Viewer actively follows the profile owner | Visible |
| 4 | Profile owner actively follows the viewer | Visible *(new)* |
| 5 | Active `TemporaryProfileGrant` exists (`grantedById = owner, grantedToId = viewer, expiresAt > now`) | Visible *(new)* |
| 6 | None of the above | 403 |

**Temporary grant trigger**: When a private user leaves a comment (or reply) on any post, a `TemporaryProfileGrant` is upserted for the post author and all other commenters on that post. `expiresAt = now + 3 days`. Renewed (extended) on each new comment.

**Cleanup**: `/api/cron/cleanup-grants` runs daily and deletes expired grant rows.

---

## Feature 3 — Shareable Comment & Reply Links

Comments support **one level of replies** (not nested further).

**Shareable URL patterns:**
- Comment: `/post/[id]?c=[commentId]`
- Reply: `/post/[id]?c=[commentId]&r=[replyId]`

On page load, if `c` (and optionally `r`) are present in the URL, the page scrolls to and highlights the target element for 3 seconds (`ring-2 ring-amber-400`). Each comment and reply has a share button (Lucide `Link2`) that copies the deep-link to clipboard with a transient "Copied!" toast.

---

## Feature 4 — Mass Restriction Privileges

Users can perform bulk blocks via `POST /api/block/mass`:

| Source | Targets blocked |
|--------|----------------|
| `user_followers` | All active followers of a target user |
| `post_likers` | All users who liked a specific post |
| `comment_likers` | All users who liked a specific comment |

- Skip self, already-blocked users, and admins
- Max 5,000 targets per request (returns 400 if exceeded)
- Runs in a single `$transaction`: `createMany({ skipDuplicates: true })` + bulk `Follow` deletion both ways
- UI: three-dot menu on user profiles and like counts → "Block all followers / all likers" → `MassBlockModal` confirmation

---

## Feature 5 — Mute/Block Context

Before confirming a mute or block, a collapsible `RestrictionContextPanel` appears above the confirmation:
- **Notes**: 200-character textarea (optional)
- **Topic**: `#hashtag` field, alphanumeric + underscore, max 100 chars (optional)
- **Visibility toggle**: "Make visible to this user" (default off)

If `visibleToTarget = true`: the blocked/muted user's profile fetch from the restrictor returns `blockContext: { note, hashtag }`. The profile page renders a muted info banner showing the context note.

---

## Feature 6 — Restricted Users Page

**Page**: `/settings/restricted`

| Column | Notes |
|--------|-------|
| Checkbox | For bulk selection |
| Avatar + Username | Linked to profile |
| Type | Blocked / Muted badge |
| Date | `createdAt` of restriction |
| Context note | If added |
| Topic hashtag | If added |

**Bulk actions** (appear in toolbar when rows are selected):
- **Undo restriction** — removes selected Block or Mute rows
- **Share as list** — opens `BlockListShareModal` (name field + public toggle)

**Shareable block lists:**
- `POST /api/block-lists` creates a `BlockList` with a random 12-char `slug` and `BlockListEntry` rows for selected users
- Public list URL: `/blocklist/[slug]` — viewable without login
- Other users can click "Import — block all" to mass-block the list's users (same bulk-block logic as Feature 4)
- `BlockList.importCount` incremented on each import

---

## Feature 7 — Camera-Only Mode

A user preference (`User.cameraOnlyMode`, default `false`) set in `/settings`.

**How it works:**
- At upload time, the client uses `exifr` (dynamic import) to extract EXIF from image files before upload
- `hasCamera = !!(parsed?.Make && parsed?.Model)`
- Videos always pass (`hasCamera = true`); status posts have no media (always pass)
- `hasCamera` and `mediaMetadata` are sent with `POST /api/posts` and persisted on the `Post` row

**Feed filter** (applied when `cameraOnlyMode = true`):
```
WHERE (hasCamera = true OR type = 'video' OR type = 'status')
```
Applied in both `GET /api/posts` (main feed) and `GET /api/feed/top`.

---

## Data Model (High-Level)

```
User
  id, email, username, displayName, avatarUrl, bio
  visibility (public | private)
  tier (basic | plus | creator | admin)
  cameraOnlyMode (boolean, default false)           ← new F7
  registrationPaidAt, renewalDueAt
  createdAt, updatedAt

Post
  id, authorId → User
  type (image | video | status)
  mediaKey (S3 object key), caption
  lat, lng (nullable)
  visibility (public | followers)
  likeCount (denormalized, updated on like)
  mediaMetadata (JSON, nullable)                    ← new F7
  hasCamera (boolean, default false)                ← new F7
  createdAt, deletedAt

Like
  id, userId → User, postId → Post, createdAt

Comment
  id, postId → Post, authorId → User
  body, commentLikeCount (denormalized)             ← commentLikeCount new F4
  createdAt, deletedAt

Reply                                               ← new F3
  id, commentId → Comment, authorId → User
  body, createdAt, deletedAt

CommentLike                                         ← new F4
  id, userId → User, commentId → Comment, createdAt

Follow
  id, followerId → User, followingId → User
  status (active | pending), createdAt

Mute
  id, muterId → User, mutedId → User
  contextNote (varchar 200, nullable)               ← new F5
  contextHashtag (varchar 100, nullable)            ← new F5
  visibleToTarget (boolean, default false)          ← new F5
  createdAt

Block
  id, blockerId → User, blockedId → User
  contextNote (varchar 200, nullable)               ← new F5
  contextHashtag (varchar 100, nullable)            ← new F5
  visibleToTarget (boolean, default false)          ← new F5
  createdAt

UserEvent (calendar interaction log)
  id, userId → User, eventType (followed | unfollowed | follow_requested |
    muted | blocked | liked_post)
  targetUserId → User (nullable)
  targetPostId → Post (nullable)
  createdAt

FeedDailyCount (daily post view tracking)
  id, userId → User, date, count

ViewExtension                                       ← new F1
  id, userId → User
  stripePaymentIntentId (unique)
  postsGranted (default 200), usedCount (default 0)
  expiresAt, createdAt

TemporaryProfileGrant                               ← new F2
  id, grantedById → User, grantedToId → User
  triggerCommentId → Comment (nullable)
  expiresAt, createdAt
  UNIQUE(grantedById, grantedToId)

BlockList                                           ← new F6
  id, ownerId → User
  name (varchar 100), slug (unique, 12-char random)
  isPublic (boolean, default true)
  importCount (default 0)
  createdAt, updatedAt

BlockListEntry                                      ← new F6
  id, blockListId → BlockList, blockedUserId → User
  createdAt
  UNIQUE(blockListId, blockedUserId)

TopFeedSnapshot (hourly computed)
  id, computedAt, postIds (JSONB ordered array)
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | ANY | NextAuth |
| `/api/stripe/checkout` | POST | $1/yr checkout session |
| `/api/stripe/view-extension` | POST | $1 one-time PaymentIntent for view extension *(new F1)* |
| `/api/stripe/webhook` | POST | Stripe events (extended for view extension) |
| `/api/posts` | GET, POST | Feed / create post (extended: `hasCamera`, `mediaMetadata`, camera-only filter) |
| `/api/posts/[id]` | GET, DELETE | Get / soft-delete post |
| `/api/posts/[id]/like` | POST, DELETE | Like / unlike |
| `/api/posts/[id]/comments` | GET, POST | List / add comment (triggers `TemporaryProfileGrant` on POST) |
| `/api/posts/[id]/comments/[commentId]/replies` | GET, POST | List / add reply *(new F3)* |
| `/api/posts/[id]/comments/[commentId]/replies/[replyId]` | DELETE | Soft-delete reply *(new F3)* |
| `/api/posts/presign` | POST | Get presigned S3 upload URL |
| `/api/feed/top` | GET | Today's top 100 posts (extended: camera-only filter) |
| `/api/feed/map` | GET | Geotagged posts in viewport |
| `/api/users/[username]` | GET | Public profile (uses `canViewProfile()` helper; returns `blockContext` if applicable) |
| `/api/users/[username]/posts` | GET | User's posts by day |
| `/api/users/[username]/calendar` | GET | Calendar events for a day |
| `/api/follow` | POST, DELETE | Follow / unfollow |
| `/api/follow/requests` | GET | Pending follow requests |
| `/api/follow/requests/[id]` | PATCH | Accept / decline |
| `/api/mute` | POST, DELETE | Mute / unmute (extended: context fields) |
| `/api/block` | POST, DELETE | Block / unblock (extended: context fields) |
| `/api/block/mass` | POST | Mass-block by source: `user_followers`, `post_likers`, `comment_likers` *(new F4)* |
| `/api/block-lists` | POST | Create shareable block list *(new F6)* |
| `/api/block-lists/[slug]` | GET | View public block list *(new F6)* |
| `/api/block-lists/[slug]/import` | POST | Import (mass-block) a block list *(new F6)* |
| `/api/block-lists/[id]` | DELETE | Delete own block list *(new F6)* |
| `/api/settings/restricted` | GET | List own blocks + mutes with context *(new F6)* |
| `/api/settings/restricted/bulk-undo` | POST | Bulk remove restrictions *(new F6)* |
| `/api/profile` | GET, PATCH | Own profile (extended: `cameraOnlyMode`) |
| `/api/cron/top-feed` | POST | Hourly top feed computation |
| `/api/cron/cleanup-grants` | GET | Daily cleanup of expired `TemporaryProfileGrant` rows *(new F2)* |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing / Top Feed (logged out) |
| `/signup` | Registration |
| `/login` | Login |
| `/subscribe` | Stripe $1/yr checkout |
| `/feed` | Main chronological feed |
| `/top` | Top 100 posts today |
| `/map` | Map of popular geotagged posts |
| `/post/new` | Create post |
| `/post/[id]` | Single post view (scroll-to-comment/reply via `?c=` and `?r=` params) |
| `/[username]` | Public profile |
| `/[username]/calendar` | Calendar view |
| `/settings` | Account settings, subscription, camera-only mode toggle |
| `/settings/restricted` | Restricted users table with bulk actions *(new F6)* |
| `/blocklist/[slug]` | Public shareable block list view *(new F6)* |
| `/admin` | Moderation queue |

---

## Monetisation

| Tier | Price | Feed limit | Upload |
|------|-------|------------|--------|
| Basic | $1/yr registration | 100 posts/day | 10 MB image, 200 MB video |
| Plus | $5/yr | 500 posts/day | 25 MB image, 500 MB video |
| Creator | $20/yr | Unlimited | 50 MB image, 2 GB video |
| **View Extension** | **$1 one-time** | **+200 posts, 7 days** | — |

---

## Acceptance Criteria (MVP)

- [ ] User can register, pay $1, and reach the main feed
- [ ] Main feed shows followed users' posts in strict chronological order
- [ ] Daily post cap enforced; message shown when limit reached
- [ ] Top Feed updates hourly with today's 100 most liked posts
- [ ] User can create image, video, and status posts with optional geotag
- [ ] Calendar shows own posts and interaction events for any past day
- [ ] Map shows today's popular geotagged posts in the viewport
- [ ] Follow / unfollow / mute / block all work and log to UserEvent
- [ ] Like and comment persist and display correctly
- [ ] View Extension: $1 purchase grants 200 extra posts for 7 days; stacks with further purchases *(F1)*
- [ ] Private profile is visible to users the owner follows and to commenters for 3 days *(F2)*
- [ ] Comments and replies have shareable deep-links that scroll to and highlight the target *(F3)*
- [ ] Mass-block by followers / post likers / comment likers works; respects 5,000 limit *(F4)*
- [ ] Mute/block context note and hashtag are stored; shown to target when `visibleToTarget = true` *(F5)*
- [ ] Restricted Users page shows all blocks/mutes with bulk undo and shareable block lists *(F6)*
- [ ] Camera-only mode filters out non-camera images from the main feed and Top Feed *(F7)*
