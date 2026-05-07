// Bun global — available at runtime when executed with `bun run`
declare const Bun: {
  password: {
    hash(password: string, options: { algorithm: 'bcrypt'; cost: number }): Promise<string>
  }
}

/**
 * Postocard — local development seed
 *
 * Test accounts (password: Password123! for all)
 * ─────────────────────────────────────────────────────────────────────────────
 * admin     admin tier    public   admin@postocard.app
 * alice     basic tier    public   alice@test.com    ← at daily cap; has active ViewExtension
 * bob       plus  tier    public   bob@test.com      ← blocked eve with visible context; owns blocklist
 * carol     basic tier    private  carol@test.com    ← follows alice (Rule 4: alice can see her profile)
 * dave      basic tier    private  dave@test.com     ← commented on alice's post (alice has 3-day temp grant)
 * eve       basic tier    public   eve@test.com      ← muted by alice; blocked by bob
 *
 * Feature test scenarios covered
 * ─────────────────────────────────────────────────────────────────────────────
 * F1  alice is at her 100-post cap with an active ViewExtension (50/200 used, expires in 6 days)
 * F2  carol (private) follows alice → alice can view carol's profile (Rule 4)
 *     dave  (private) commented on alice's post → alice has a TemporaryProfileGrant (expires 2 days)
 * F3  bob's comment on alice's post has a shareable link; alice's reply beneath it also does
 * F4  bob has 2 followers (carol, eve) — test mass-block by user_followers
 *     alice's post has 2 likes (bob, carol) — test mass-block by post_likers
 * F5  bob blocked eve: note "Spam content", hashtag "spam", visibleToTarget: true
 *     alice muted eve: no context
 * F6  RestrictedUsersTable: alice has 1 mute, bob has 1 block
 *     bob's public BlockList "Spam Accounts" contains eve
 * F7  Posts with hasCamera: true (iPhone/Samsung EXIF) and false (screenshots) spread across feed
 */

import {
  PrismaClient,
  UserTier,
  UserVisibility,
  PostType,
  PostVisibility,
  FollowStatus,
  EventType,
  FlagType,
} from '@prisma/client'

const prisma = new PrismaClient()

// Today at midnight UTC — matches @db.Date storage
const TODAY = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

// Sample EXIF payloads for camera-only mode testing
const iphoneExif = { Make: 'Apple', Model: 'iPhone 15 Pro', DateTime: '2026:05:05 10:30:00' }
const samsungExif = { Make: 'Samsung', Model: 'Galaxy S24 Ultra', DateTime: '2026:05:04 14:15:00' }
const screenshotMeta = {} // no Make/Model → hasCamera: false

// NYC-area coordinates for geotagged posts
const nyc = { lat: 40.7128, lng: -74.006 }
const brooklyn = { lat: 40.6782, lng: -73.9442 }
const manhattan = { lat: 40.758, lng: -73.9855 }

// ─────────────────────────────────────────────────────────────────────────────

async function teardown() {
  // Delete in safe reverse-dependency order; User cascade handles most rows
  await prisma.$transaction([
    prisma.flagRemovalPayment.deleteMany(),
    prisma.publicFlag.deleteMany(),
    prisma.userFlag.deleteMany(),
    prisma.flagAttribute.deleteMany(),
    prisma.topFeedSnapshot.deleteMany(),
    prisma.blockListEntry.deleteMany(),
    prisma.blockList.deleteMany(),
    prisma.viewExtension.deleteMany(),
    prisma.temporaryProfileGrant.deleteMany(),
    prisma.userEvent.deleteMany(),
    prisma.feedDailyCount.deleteMany(),
    prisma.commentLike.deleteMany(),
    prisma.reply.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.like.deleteMany(),
    prisma.block.deleteMany(),
    prisma.mute.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.post.deleteMany(),
    // Users are intentionally preserved — real accounts survive re-seeds
  ])
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Postocard...\n')

  await teardown()

  const pw = await Bun.password.hash('Password123!', { algorithm: 'bcrypt', cost: 10 })

  // ── Users ──────────────────────────────────────────────────────────────────

  const [admin, alice, bob, carol, dave, eve] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@postocard.app' },
      update: { passwordHash: pw, username: 'admin', displayName: 'Postocard Admin', bio: 'Platform admin account.', visibility: UserVisibility.public, tier: UserTier.admin, registrationPaidAt: daysAgo(90), renewalDueAt: daysFromNow(275) },
      create: { email: 'admin@postocard.app', passwordHash: pw, username: 'admin', displayName: 'Postocard Admin', bio: 'Platform admin account.', visibility: UserVisibility.public, tier: UserTier.admin, registrationPaidAt: daysAgo(90), renewalDueAt: daysFromNow(275) },
    }),
    prisma.user.upsert({
      where: { email: 'alice@test.com' },
      update: { passwordHash: pw, username: 'alice', displayName: 'Alice Pearce', bio: 'Street photographer based in NYC.', visibility: UserVisibility.public, tier: UserTier.basic, cameraOnlyMode: true, registrationPaidAt: daysAgo(30), renewalDueAt: daysFromNow(335) },
      create: { email: 'alice@test.com', passwordHash: pw, username: 'alice', displayName: 'Alice Pearce', bio: 'Street photographer based in NYC.', visibility: UserVisibility.public, tier: UserTier.basic, cameraOnlyMode: true, registrationPaidAt: daysAgo(30), renewalDueAt: daysFromNow(335) },
    }),
    prisma.user.upsert({
      where: { email: 'bob@test.com' },
      update: { passwordHash: pw, username: 'bob', displayName: 'Bob Morrow', bio: 'Travel and food photography.', visibility: UserVisibility.public, tier: UserTier.plus, registrationPaidAt: daysAgo(60), renewalDueAt: daysFromNow(305) },
      create: { email: 'bob@test.com', passwordHash: pw, username: 'bob', displayName: 'Bob Morrow', bio: 'Travel and food photography.', visibility: UserVisibility.public, tier: UserTier.plus, registrationPaidAt: daysAgo(60), renewalDueAt: daysFromNow(305) },
    }),
    prisma.user.upsert({
      where: { email: 'carol@test.com' },
      update: { passwordHash: pw, username: 'carol', displayName: 'Carol Kim', bio: 'Just here for the vibes.', visibility: UserVisibility.private, tier: UserTier.basic, registrationPaidAt: daysAgo(15), renewalDueAt: daysFromNow(350) },
      create: { email: 'carol@test.com', passwordHash: pw, username: 'carol', displayName: 'Carol Kim', bio: 'Just here for the vibes.', visibility: UserVisibility.private, tier: UserTier.basic, registrationPaidAt: daysAgo(15), renewalDueAt: daysFromNow(350) },
    }),
    prisma.user.upsert({
      where: { email: 'dave@test.com' },
      update: { passwordHash: pw, username: 'dave', displayName: 'Dave Rivera', bio: '', visibility: UserVisibility.private, tier: UserTier.basic, registrationPaidAt: daysAgo(10), renewalDueAt: daysFromNow(355) },
      create: { email: 'dave@test.com', passwordHash: pw, username: 'dave', displayName: 'Dave Rivera', bio: '', visibility: UserVisibility.private, tier: UserTier.basic, registrationPaidAt: daysAgo(10), renewalDueAt: daysFromNow(355) },
    }),
    prisma.user.upsert({
      where: { email: 'eve@test.com' },
      update: { passwordHash: pw, username: 'eve', displayName: 'Eve Santos', bio: 'Content creator ✨', visibility: UserVisibility.public, tier: UserTier.basic, registrationPaidAt: daysAgo(5), renewalDueAt: daysFromNow(360) },
      create: { email: 'eve@test.com', passwordHash: pw, username: 'eve', displayName: 'Eve Santos', bio: 'Content creator ✨', visibility: UserVisibility.public, tier: UserTier.basic, registrationPaidAt: daysAgo(5), renewalDueAt: daysFromNow(360) },
    }),
  ])

  console.log(`✓ Created ${6} users`)

  // ── Posts ──────────────────────────────────────────────────────────────────
  // likeCount is set upfront to match the Like rows we create below

  // admin
  const postAdm1 = await prisma.post.create({
    data: {
      authorId: admin.id,
      type: PostType.status,
      caption: 'Welcome to Postocard 🎉 Chronological feeds, no algorithm.',
      visibility: PostVisibility.public,
      createdAt: daysAgo(7),
    },
  })

  // alice — mix of camera/screenshot/status for F7
  const [postA1, postA2, postA3] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: alice.id,
        type: PostType.image,
        mediaKey: 'posts/alice/brooklyn-bridge.jpg',
        caption: 'Golden hour at the Brooklyn Bridge. One of those shots you wait all year for.',
        ...nyc,
        visibility: PostVisibility.public,
        likeCount: 2,
        mediaMetadata: iphoneExif,
        hasCamera: true,
        createdAt: daysAgo(2),
      },
    }),
    prisma.post.create({
      data: {
        authorId: alice.id,
        type: PostType.image,
        mediaKey: 'posts/alice/screenshot-inspo.jpg',
        caption: 'Saved this color palette from a design blog.',
        visibility: PostVisibility.public,
        likeCount: 0,
        mediaMetadata: screenshotMeta,
        hasCamera: false, // screenshot — filtered out by camera-only mode
        createdAt: daysAgo(1),
      },
    }),
    prisma.post.create({
      data: {
        authorId: alice.id,
        type: PostType.status,
        caption: 'Anyone else think 8am light is criminally underrated?',
        visibility: PostVisibility.public,
        likeCount: 0,
        createdAt: daysAgo(1),
      },
    }),
  ])

  // bob — most-liked posts for TopFeedSnapshot
  const [postB1, postB2, postB3, postB4] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: bob.id,
        type: PostType.image,
        mediaKey: 'posts/bob/central-park-fall.jpg',
        caption: 'Central Park in peak autumn. No filter.',
        ...manhattan,
        visibility: PostVisibility.public,
        likeCount: 4, // alice, carol, dave, eve
        mediaMetadata: samsungExif,
        hasCamera: true,
        createdAt: daysAgo(1),
      },
    }),
    prisma.post.create({
      data: {
        authorId: bob.id,
        type: PostType.image,
        mediaKey: 'posts/bob/ramen-spot.jpg',
        caption: 'Found this tiny ramen place on the Lower East Side. Broth was unreal.',
        visibility: PostVisibility.public,
        likeCount: 1, // alice
        mediaMetadata: samsungExif,
        hasCamera: true,
        createdAt: daysAgo(3),
      },
    }),
    prisma.post.create({
      data: {
        authorId: bob.id,
        type: PostType.video,
        mediaKey: 'posts/bob/timelapse-sunset.mp4',
        caption: 'Rooftop timelapse — 45 minutes compressed to 15 seconds.',
        visibility: PostVisibility.public,
        likeCount: 0,
        hasCamera: true, // videos always pass camera-only filter
        createdAt: daysAgo(4),
      },
    }),
    prisma.post.create({
      data: {
        authorId: bob.id,
        type: PostType.image,
        mediaKey: 'posts/bob/notes-screenshot.jpg',
        caption: 'My packing list for the Tokyo trip.',
        visibility: PostVisibility.followers,
        likeCount: 0,
        mediaMetadata: screenshotMeta,
        hasCamera: false, // screenshot, also followers-only
        createdAt: daysAgo(5),
      },
    }),
  ])

  // carol — private user, public post
  const [postC1, postC2] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: carol.id,
        type: PostType.image,
        mediaKey: 'posts/carol/coffee-morning.jpg',
        caption: 'Morning ritual.',
        ...brooklyn,
        visibility: PostVisibility.public,
        likeCount: 1, // alice
        mediaMetadata: iphoneExif,
        hasCamera: true,
        createdAt: daysAgo(1),
      },
    }),
    prisma.post.create({
      data: {
        authorId: carol.id,
        type: PostType.status,
        caption: 'Really loving this quiet lately.',
        visibility: PostVisibility.public,
        likeCount: 0,
        createdAt: daysAgo(3),
      },
    }),
  ])

  // dave — private user
  const [postD1, postD2] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: dave.id,
        type: PostType.status,
        caption: 'Long day. Good book. Perfect evening.',
        visibility: PostVisibility.public,
        likeCount: 0,
        createdAt: daysAgo(2),
      },
    }),
    prisma.post.create({
      data: {
        authorId: dave.id,
        type: PostType.image,
        mediaKey: 'posts/dave/bookshelf.jpg',
        caption: 'Current TBR pile.',
        visibility: PostVisibility.public,
        likeCount: 0,
        mediaMetadata: iphoneExif,
        hasCamera: true,
        createdAt: daysAgo(6),
      },
    }),
  ])

  // eve
  const [postE1, postE2] = await Promise.all([
    prisma.post.create({
      data: {
        authorId: eve.id,
        type: PostType.image,
        mediaKey: 'posts/eve/hudson-yards.jpg',
        caption: 'The Vessel at golden hour. NYC never gets old.',
        lat: 40.7535,
        lng: -74.0027,
        visibility: PostVisibility.public,
        likeCount: 1, // alice
        mediaMetadata: iphoneExif,
        hasCamera: true,
        createdAt: daysAgo(1),
      },
    }),
    prisma.post.create({
      data: {
        authorId: eve.id,
        type: PostType.status,
        caption: 'Collab DMs open! 💌',
        visibility: PostVisibility.public,
        likeCount: 0,
        createdAt: daysAgo(2),
      },
    }),
  ])

  const postCount = 1 + 3 + 4 + 2 + 2 + 2
  console.log(`✓ Created ${postCount} posts`)

  // ── Follows ────────────────────────────────────────────────────────────────

  await prisma.follow.createMany({
    data: [
      // alice ↔ bob (mutual)
      { followerId: alice.id, followingId: bob.id, status: FollowStatus.active, createdAt: daysAgo(25) },
      { followerId: bob.id, followingId: alice.id, status: FollowStatus.active, createdAt: daysAgo(25) },
      // carol follows alice — F2 Rule 4: alice can view carol's private profile
      { followerId: carol.id, followingId: alice.id, status: FollowStatus.active, createdAt: daysAgo(10) },
      // alice → carol: pending (carol is private)
      { followerId: alice.id, followingId: carol.id, status: FollowStatus.pending, createdAt: daysAgo(3) },
      // dave follows bob
      { followerId: dave.id, followingId: bob.id, status: FollowStatus.active, createdAt: daysAgo(8) },
      // eve follows bob — included in mass-block-followers test (F4)
      { followerId: eve.id, followingId: bob.id, status: FollowStatus.active, createdAt: daysAgo(4) },
    ],
  })

  console.log(`✓ Created follows`)

  // ── Likes ──────────────────────────────────────────────────────────────────

  await prisma.like.createMany({
    data: [
      // alice's post 1 (likeCount: 2)
      { userId: bob.id,   postId: postA1.id, createdAt: daysAgo(2) },
      { userId: carol.id, postId: postA1.id, createdAt: daysAgo(1) },
      // bob's post 1 (likeCount: 4) — good for mass-block-by-post-likers test (F4)
      { userId: alice.id, postId: postB1.id, createdAt: daysAgo(1) },
      { userId: carol.id, postId: postB1.id, createdAt: daysAgo(1) },
      { userId: dave.id,  postId: postB1.id, createdAt: daysAgo(1) },
      { userId: eve.id,   postId: postB1.id, createdAt: daysAgo(1) },
      // bob's post 2 (likeCount: 1)
      { userId: alice.id, postId: postB2.id, createdAt: daysAgo(3) },
      // carol's post 1 (likeCount: 1)
      { userId: alice.id, postId: postC1.id, createdAt: daysAgo(1) },
      // eve's post 1 (likeCount: 1)
      { userId: alice.id, postId: postE1.id, createdAt: daysAgo(1) },
    ],
  })

  console.log(`✓ Created likes`)

  // ── Comments ───────────────────────────────────────────────────────────────

  const [comB_onA1, comD_onA1, comA_onB1] = await Promise.all([
    // bob comments on alice's post 1 — F3: shareable link + reply target
    prisma.comment.create({
      data: {
        postId: postA1.id,
        authorId: bob.id,
        body: 'The light here is absolutely perfect. What time did you shoot this?',
        commentLikeCount: 1,
        createdAt: daysAgo(2),
      },
    }),
    // dave (private) comments on alice's post 1 — F2: triggers TemporaryProfileGrant for alice
    prisma.comment.create({
      data: {
        postId: postA1.id,
        authorId: dave.id,
        body: 'This is stunning 🙌',
        commentLikeCount: 0,
        createdAt: daysAgo(1),
      },
    }),
    // alice comments on bob's post 1
    prisma.comment.create({
      data: {
        postId: postB1.id,
        authorId: alice.id,
        body: 'The colour on those leaves! Central Park never disappoints.',
        commentLikeCount: 0,
        createdAt: daysAgo(1),
      },
    }),
  ])

  console.log(`✓ Created comments`)

  // ── Replies ────────────────────────────────────────────────────────────────
  // F3: alice replies to bob's comment on her post — tests reply shareable link

  const replyA_onComB = await prisma.reply.create({
    data: {
      commentId: comB_onA1.id,
      authorId: alice.id,
      body: 'Around 6:15am! Alarm at 5:30 was worth it 😅',
      createdAt: daysAgo(2),
    },
  })

  console.log(`✓ Created replies`)

  // ── Comment Likes ──────────────────────────────────────────────────────────
  // F4: alice likes bob's comment — enables mass-block-by-comment-likers test

  await prisma.commentLike.create({
    data: {
      userId: alice.id,
      commentId: comB_onA1.id,
      createdAt: daysAgo(2),
    },
  })

  console.log(`✓ Created comment likes`)

  // ── Mute & Block ──────────────────────────────────────────────────────────

  await Promise.all([
    // alice mutes eve — no context (F5: base case)
    prisma.mute.create({
      data: {
        muterId: alice.id,
        mutedId: eve.id,
        createdAt: daysAgo(2),
      },
    }),
    // bob blocks eve with visible context — F5: full context test
    prisma.block.create({
      data: {
        blockerId: bob.id,
        blockedId: eve.id,
        contextNote: 'Repeatedly posted spam and unsolicited promo content.',
        contextHashtag: 'spam',
        visibleToTarget: true,
        createdAt: daysAgo(1),
      },
    }),
  ])

  console.log(`✓ Created mute + block`)

  // ── User Events (calendar) ────────────────────────────────────────────────

  await prisma.userEvent.createMany({
    data: [
      { userId: alice.id, eventType: EventType.followed,    targetUserId: bob.id,   createdAt: daysAgo(25) },
      { userId: alice.id, eventType: EventType.liked_post,  targetPostId: postB1.id, createdAt: daysAgo(1) },
      { userId: alice.id, eventType: EventType.muted,       targetUserId: eve.id,   createdAt: daysAgo(2) },
      { userId: bob.id,   eventType: EventType.followed,    targetUserId: alice.id,  createdAt: daysAgo(25) },
      { userId: bob.id,   eventType: EventType.blocked,     targetUserId: eve.id,    createdAt: daysAgo(1) },
      { userId: carol.id, eventType: EventType.followed,    targetUserId: alice.id,  createdAt: daysAgo(10) },
      { userId: alice.id, eventType: EventType.follow_requested, targetUserId: carol.id, createdAt: daysAgo(3) },
    ],
  })

  console.log(`✓ Created user events`)

  // ── Feed Daily Counts ─────────────────────────────────────────────────────

  await prisma.feedDailyCount.createMany({
    data: [
      // alice is at her basic-tier cap (100/day) — ViewExtensionBanner should appear (F1)
      { userId: alice.id, date: TODAY, count: 100 },
      // bob has consumed 50 of his 500 plus-tier posts
      { userId: bob.id,   date: TODAY, count: 50 },
    ],
  })

  console.log(`✓ Created feed daily counts`)

  // ── View Extension ────────────────────────────────────────────────────────
  // F1: alice paid $1 to extend her feed; 50 of 200 extra posts used, 6 days left

  await prisma.viewExtension.create({
    data: {
      userId: alice.id,
      stripePaymentIntentId: 'pi_seed_alice_ext_001',
      postsGranted: 200,
      usedCount: 50,
      expiresAt: daysFromNow(6),
    },
  })

  console.log(`✓ Created view extension`)

  // ── Temporary Profile Grants ──────────────────────────────────────────────
  // F2: dave (private) commented on alice's post → alice can view dave's profile for 3 days

  await prisma.temporaryProfileGrant.create({
    data: {
      grantedById: dave.id,
      grantedToId: alice.id,
      triggerCommentId: comD_onA1.id,
      expiresAt: daysFromNow(2),
    },
  })

  console.log(`✓ Created temporary profile grant`)

  // ── Block List ────────────────────────────────────────────────────────────
  // F6: bob's public block list — shareable at /blocklist/spam-accounts-bob

  const blockList = await prisma.blockList.create({
    data: {
      ownerId: bob.id,
      name: 'Spam Accounts',
      slug: 'spamaccountsbob', // 16 chars, unique
      isPublic: true,
      entries: {
        create: [{ blockedUserId: eve.id }],
      },
    },
  })

  console.log(`✓ Created block list (slug: ${blockList.slug})`)

  // ── Flag Attributes ───────────────────────────────────────────────────────
  // F8: 85 red-flag offense attributes across 13 categories

  const flagCategories: { category: string; labels: string[] }[] = [
    {
      category: 'Harassment & Targeted Abuse',
      labels: [
        'Persistent unwanted messages or DMs',
        'Comment-bombing (flooding posts with abusive comments)',
        'Tagging a person in abusive or humiliating content',
        'Coordinated mass reporting to get an account suspended',
        'Brigading (organised group attacks on a specific user)',
      ],
    },
    {
      category: 'Impersonation & Fake Accounts',
      labels: [
        'Finstas / fake profiles used to mock or ruin a reputation',
        'Pose-as-you accounts (pretending to be the victim)',
        'Deepfake or manipulated media used to embarrass',
        'Account hijacking and posting harmful content as the victim',
      ],
    },
    {
      category: 'Unwanted Sexual Content & Shaming',
      labels: [
        'Non-consensual sharing of intimate images (revenge porn)',
        'Slut-shaming or public humiliation about sexual history',
        'Unwanted sexualised comments or emoji reactions',
        'Sexual extortion (sextortion) via DMs',
      ],
    },
    {
      category: 'Hate Speech & Discrimination',
      labels: [
        'Racist, xenophobic or ethnic slurs',
        'Homophobic, biphobic or transphobic attacks',
        'Religious hate and antisemitic/islamophobic content',
        'Ableist insults and mockery of disabilities',
      ],
    },
    {
      category: 'Threats & Intimidation',
      labels: [
        'Death threats or threats of physical harm',
        'Threats to share private information (blackmail)',
        'Wishes of violence, disease or assault',
        'Menacing imagery (weapons, gore sent to intimidate)',
      ],
    },
    {
      category: 'Doxxing & Privacy Violations',
      labels: [
        'Publishing home address, phone number or workplace',
        'Leaking private conversations or images',
        'Sharing family members\' details to escalate harassment',
        'Real-time location exposure (outing someone\'s whereabouts)',
      ],
    },
    {
      category: 'Body Shaming & Appearance-Based Attacks',
      labels: [
        'Insults about weight, skin, height or facial features',
        'Photoshopping images to mock someone\'s body',
        'Rating or ranking people\'s looks to degrade them',
        'Eating-disorder shaming or pro-ana trolling',
      ],
    },
    {
      category: 'Exclusion & Social Sabotage',
      labels: [
        'Purposefully excluding someone from group chats or events',
        'Spreading rumours to destroy friendships or relationships',
        'Creating hate pages or "exposed" accounts',
        'Gaslighting through public comments and stories',
      ],
    },
    {
      category: 'Trolling & Provocation',
      labels: [
        'Baiting emotional reactions with inflammatory posts',
        'Posting deliberately offensive memes or captions',
        'Derailing conversations to provoke anger',
        'Sealioning (bad-faith demands for endless debate)',
      ],
    },
    {
      category: 'Cyberstalking & Obsessive Monitoring',
      labels: [
        'Creating multiple accounts to bypass blocks',
        'Repeatedly watching/commenting under posts and replies to unsettle',
        'Monitoring a person\'s likes, follows and location tags',
        'Turning up in real life after online-only contact',
      ],
    },
    {
      category: 'Manipulation & Emotional Abuse',
      labels: [
        'Gaslighting by editing/deleting comments to confuse',
        'Love-bombing followed by public humiliation',
        'Forcing someone to post proof of loyalty or secrets',
        'Using suicide-baiting or self-harm encouragement',
      ],
    },
    {
      category: 'Encouraging Self-Harm & Suicide',
      labels: [
        'Telling someone to kill themselves ("kys" comments or imagery)',
        'Posts glorifying self-harm directed at an individual',
        'Sharing methods or dares via posted content, public replies, or DMs',
        'Targeting vulnerable users with self-harm instructions',
      ],
    },
    {
      category: 'Content Theft & Lack of Attribution',
      labels: [
        'Reposting art, photos, videos or audio without credit',
        'Removing watermarks, cropping out tags or altering metadata',
        'Claiming another person\'s work as your own',
        'Monetising stolen content (prints, merch, ads, brand deals)',
        'Using music, writing or creative concepts without permission',
        'Harassing creators who ask for credit or take-downs',
        'Deliberately refusing to tag or name the original artist',
      ],
    },
  ]

  const flagAttributeData = flagCategories.flatMap(({ category, labels }) =>
    labels.map((label) => ({ label, category, type: FlagType.red }))
  )

  await prisma.flagAttribute.createMany({ data: flagAttributeData })
  console.log(`✓ Created ${flagAttributeData.length} flag attributes`)

  // ── Top Feed Snapshot ──────────────────────────────────────────────────────
  // Hourly computed list — ordered by likeCount descending (b1: 4, a1: 2, c1: 1, e1: 1)

  await prisma.topFeedSnapshot.create({
    data: {
      computedAt: new Date(),
      postIds: [postB1.id, postA1.id, postC1.id, postE1.id],
    },
  })

  console.log(`✓ Created top feed snapshot`)

  // ─────────────────────────────────────────────────────────────────────────
  console.log(`
✅ Seed complete

Test accounts (password: Password123!)
  admin   admin@postocard.app   admin tier
  alice   alice@test.com        basic — at feed cap, has ViewExtension
  bob     bob@test.com          plus  — has blocked eve
  carol   carol@test.com        basic — private profile (follows alice)
  dave    dave@test.com         basic — private profile (alice has temp grant)
  eve     eve@test.com          basic — muted by alice, blocked by bob

Feature test URLs (once dev server is running)
  /blocklist/${blockList.slug}            → bob's shareable block list
  /post/${postA1.id}?c=${comB_onA1.id}    → deep-link to bob's comment
  /post/${postA1.id}?c=${comB_onA1.id}&r=${replyA_onComB.id}  → deep-link to alice's reply
  `)
}

main().catch(console.error).finally(() => prisma.$disconnect())
