/**
 * Postocard — extra test users seed
 *
 * Creates 50 additional test accounts, each with 2–4 posts.
 * All accounts use password: Password123!
 *
 * Relationships to salvin (salvinsherman@gmail.com):
 *   Users  1–20  follow salvin     (salvin's followers)
 *   Users 21–30  salvin follows    (salvin's following)
 *   Users 46–50  salvin blocks     (5 blocked)
 *
 * Safe to re-run — users are upserted, posts/follows/blocks skip duplicates.
 */

declare const Bun: {
  password: { hash(pw: string, opts: { algorithm: 'bcrypt'; cost: number }): Promise<string> }
}

import {
  PrismaClient,
  UserTier,
  UserVisibility,
  PostType,
  PostVisibility,
  FollowStatus,
} from '@prisma/client'

const prisma = new PrismaClient()
const daysAgo  = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const daysFrom = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const iphoneExif  = { Make: 'Apple',   Model: 'iPhone 15 Pro',      DateTime: '2026:05:01 09:14:00' }
const samsungExif = { Make: 'Samsung', Model: 'Galaxy S24 Ultra',   DateTime: '2026:05:02 14:45:00' }

// ─── 50 test users ────────────────────────────────────────────────────────────

const USERS = [
  { username: 'j_chen',     displayName: 'James Chen',       bio: 'Software developer and weekend hiker.' },
  { username: 'sofia_b',    displayName: 'Sofia Barros',     bio: 'Lisbon → NYC. Food and travel.' },
  { username: 'marcus_t',   displayName: 'Marcus Thompson',  bio: 'Music producer. Coffee addict.' },
  { username: 'priya_k',    displayName: 'Priya Kapoor',     bio: 'Architect. Plant parent.' },
  { username: 'luca_r',     displayName: 'Luca Russo',       bio: 'Chef and food blogger. Milan → Chicago.' },
  { username: 'amara_d',    displayName: 'Amara Diallo',     bio: 'Illustrator and visual artist.' },
  { username: 'noah_s',     displayName: 'Noah Sullivan',    bio: 'Surfer. Outdoor enthusiast.' },
  { username: 'yuki_m',     displayName: 'Yuki Matsuda',     bio: 'Fashion photographer. Tokyo vibes.' },
  { username: 'elena_v',    displayName: 'Elena Vasquez',    bio: 'UX designer. Dog mom.' },
  { username: 'kai_l',      displayName: 'Kai Liu',          bio: 'Filmmaker. Storyteller.' },
  { username: 'anya_p',     displayName: 'Anya Petrov',      bio: 'Dancer. Choreographer.' },
  { username: 'felix_h',    displayName: 'Felix Hartmann',   bio: 'Cyclist. Data nerd.' },
  { username: 'zoe_w',      displayName: 'Zoe Williams',     bio: 'Writer. Bookworm.' },
  { username: 'omar_f',     displayName: 'Omar Farouk',      bio: 'Street photographer. Cairo → London.' },
  { username: 'isla_m',     displayName: 'Isla Mackenzie',   bio: 'Veterinarian. Animal lover.' },
  { username: 'ravi_s',     displayName: 'Ravi Sharma',      bio: 'Startup founder. Cricket fan.' },
  { username: 'nadia_k',    displayName: 'Nadia Kowalski',   bio: 'Environmental scientist.' },
  { username: 'theo_b',     displayName: 'Theo Brennan',     bio: 'Musician. Vinyl collector.' },
  { username: 'chloe_t',    displayName: 'Chloe Tan',        bio: 'Content creator. Singapore.' },
  { username: 'max_v',      displayName: 'Max Volkov',       bio: 'Rock climber. Adventure seeker.' },
  { username: 'layla_a',    displayName: 'Layla Ahmed',      bio: 'Journalist. Middle East correspondent.' },
  { username: 'finn_o',     displayName: 'Finn O\'Brien',    bio: 'Bartender. Cocktail enthusiast.' },
  { username: 'mia_c',      displayName: 'Mia Chen',         bio: 'Graphic designer. Typography nerd.' },
  { username: 'alex_r',     displayName: 'Alex Rivera',      bio: 'Personal trainer. Nutrition coach.' },
  { username: 'jade_n',     displayName: 'Jade Nguyen',      bio: 'Florist. Nature lover.' },
  { username: 'sam_k',      displayName: 'Sam Kowalski',     bio: 'Software engineer. Gaming.' },
  { username: 'lily_p',     displayName: 'Lily Park',        bio: 'Pastry chef. Seoul born.' },
  { username: 'ethan_m',    displayName: 'Ethan Moore',      bio: 'Architect. City walker.' },
  { username: 'nina_s',     displayName: 'Nina Santos',      bio: 'Marine biologist. Ocean advocate.' },
  { username: 'ryan_c',     displayName: 'Ryan Cole',        bio: 'Photographer. Mountains.' },
  { username: 'ava_j',      displayName: 'Ava Johnson',      bio: 'Yoga instructor. Wellness.' },
  { username: 'leo_w',      displayName: 'Leo Walsh',        bio: 'Musician. Guitar player.' },
  { username: 'sara_h',     displayName: 'Sara Hassan',      bio: 'Food photographer. Recipe developer.' },
  { username: 'jake_b',     displayName: 'Jake Benson',      bio: 'Skateboarder. Street artist.' },
  { username: 'ruby_t',     displayName: 'Ruby Torres',      bio: 'Fashion designer. Colour obsessed.' },
  { username: 'ben_a',      displayName: 'Ben Adams',        bio: 'Cyclist. Coffee roaster.' },
  { username: 'maya_c',     displayName: 'Maya Clark',       bio: 'Teacher. Storyteller.' },
  { username: 'tom_l',      displayName: 'Tom Liu',          bio: 'Video game developer. Anime fan.' },
  { username: 'grace_m',    displayName: 'Grace Martinez',   bio: 'Florist. Garden lover.' },
  { username: 'jack_s',     displayName: 'Jack Stevens',     bio: 'Journalist. Current affairs.' },
  { username: 'hana_y',     displayName: 'Hana Yamamoto',    bio: 'Fashion photographer. Tokyo.' },
  { username: 'dan_b',      displayName: 'Dan Brown',        bio: 'Stand-up comedian. NYC nights.' },
  { username: 'emma_w',     displayName: 'Emma Wilson',      bio: 'Interior designer. Minimalist.' },
  { username: 'chris_n',    displayName: 'Chris Nguyen',     bio: 'Chef. Street food explorer.' },
  { username: 'lia_r',      displayName: 'Lia Rossi',        bio: 'Ballet dancer. Rome → Paris.' },
  { username: 'mike_d',     displayName: 'Mike Davis',       bio: 'Podcast host. Sports fan.' },
  { username: 'kate_b',     displayName: 'Kate Bailey',      bio: 'Nutritionist. Runner.' },
  { username: 'aaron_t',    displayName: 'Aaron Thompson',   bio: 'Music journalist. Record collector.' },
  { username: 'sophie_m',   displayName: 'Sophie Müller',    bio: 'Product designer. Berlin.' },
  { username: 'david_k',    displayName: 'David Kim',        bio: 'Documentary filmmaker. Storyteller.' },
]

// ─── Post content pool ────────────────────────────────────────────────────────

const STATUS_CAPTIONS = [
  'Some days you just need a good playlist and nowhere to be.',
  'Slow mornings are underrated.',
  'The best conversations happen after midnight.',
  'Trying something new every week. This week: sourdough.',
  'Reminder that rest is productive.',
  'City walks cure everything.',
  'Working on something I\'m actually excited about for once.',
  'Three coffees deep and still not sure what day it is.',
  'If you know a good book recommendation, drop it below.',
  'The light at 7am is a different kind of magic.',
  'Less scrolling, more doing. Starting now.',
  'Neighbourhood has a new spot. Going twice this week probably.',
  'Finally finished the project I\'ve been putting off for months.',
  'The best part of travel is coming home to your own bed.',
  'Hot take: Tuesday is the most productive day of the week.',
]

const IMAGE_POSTS: { caption: string; key: string; camera: boolean; exif: object | null }[] = [
  { caption: 'Golden hour never disappoints.',                                  key: 'placeholder/{u}/sunset.jpg',        camera: true,  exif: iphoneExif },
  { caption: 'Found this little place on the corner. Worth every penny.',       key: 'placeholder/{u}/cafe.jpg',          camera: true,  exif: samsungExif },
  { caption: 'Morning run views. Almost makes the 6am alarm worth it.',         key: 'placeholder/{u}/morning-run.jpg',   camera: true,  exif: iphoneExif },
  { caption: 'The colour palette of this city will never stop surprising me.',  key: 'placeholder/{u}/cityscape.jpg',     camera: true,  exif: samsungExif },
  { caption: 'Weekend market. Got way too much cheese again.',                  key: 'placeholder/{u}/market.jpg',        camera: false, exif: null },
  { caption: 'Desk setup, finally happy with it.',                              key: 'placeholder/{u}/desk.jpg',          camera: false, exif: null },
  { caption: 'After three hours of hiking, this was the reward.',               key: 'placeholder/{u}/hike-view.jpg',     camera: true,  exif: iphoneExif },
  { caption: 'The meal that made me finally understand why people love this.',  key: 'placeholder/{u}/food.jpg',          camera: true,  exif: samsungExif },
  { caption: 'Street art you almost miss if you\'re not paying attention.',     key: 'placeholder/{u}/street-art.jpg',    camera: true,  exif: iphoneExif },
  { caption: 'Film photography is making me slow down. In a good way.',         key: 'placeholder/{u}/film-shot.jpg',     camera: true,  exif: samsungExif },
]

// posts per user: cycles 2 → 3 → 2 → 4 → 2 → 3 → ...
const POST_COUNTS = [2, 3, 2, 4, 2, 3]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding extra test users…\n')

  const salvin = await prisma.user.findUnique({ where: { email: 'salvinsherman@gmail.com' } })
  if (!salvin) throw new Error('salvin account not found — run `bun prisma/seed.ts` first')

  const pw = await Bun.password.hash('Password123!', { algorithm: 'bcrypt', cost: 10 })

  // ── Upsert 50 users ──────────────────────────────────────────────────────

  const users = await Promise.all(
    USERS.map((u, i) =>
      prisma.user.upsert({
        where: { email: `${u.username}@test.com` },
        update: {
          passwordHash: pw,
          username: u.username,
          displayName: u.displayName,
          bio: u.bio,
          visibility: UserVisibility.public,
          tier: UserTier.basic,
          registrationPaidAt: daysAgo(180 - i * 3),
          renewalDueAt: daysFrom(185 + i * 3),
        },
        create: {
          email: `${u.username}@test.com`,
          passwordHash: pw,
          username: u.username,
          displayName: u.displayName,
          bio: u.bio,
          visibility: UserVisibility.public,
          tier: UserTier.basic,
          registrationPaidAt: daysAgo(180 - i * 3),
          renewalDueAt: daysFrom(185 + i * 3),
        },
      })
    )
  )

  console.log(`✓ Upserted ${users.length} users`)

  // ── Posts (skip existing by checking count first) ─────────────────────────

  let postCount = 0
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const existing = await prisma.post.count({ where: { authorId: user.id } })
    if (existing > 0) continue // already seeded for this user

    const n = POST_COUNTS[i % POST_COUNTS.length]
    const postData = []

    for (let p = 0; p < n; p++) {
      const useImage = p % 3 !== 2 // 2 in 3 posts are images, 1 in 3 is status
      if (useImage) {
        const img = IMAGE_POSTS[p % IMAGE_POSTS.length]
        postData.push({
          authorId: user.id,
          type: PostType.image,
          mediaKey: img.key.replace('{u}', user.username),
          caption: img.caption,
          visibility: PostVisibility.public,
          likeCount: 0,
          hasCamera: img.camera,
          mediaMetadata: img.exif ?? undefined,
          createdAt: daysAgo((i % 14) + p + 1),
        })
      } else {
        postData.push({
          authorId: user.id,
          type: PostType.status,
          caption: STATUS_CAPTIONS[(i + p) % STATUS_CAPTIONS.length],
          visibility: PostVisibility.public,
          likeCount: 0,
          createdAt: daysAgo((i % 14) + p + 1),
        })
      }
    }

    await prisma.post.createMany({ data: postData })
    postCount += postData.length
  }

  console.log(`✓ Created ${postCount} posts`)

  // ── Follows: users[0–19] → salvin (they follow salvin) ────────────────────

  await prisma.follow.createMany({
    data: users.slice(0, 20).map(u => ({
      followerId: u.id,
      followingId: salvin.id,
      status: FollowStatus.active,
      createdAt: daysAgo(30),
    })),
    skipDuplicates: true,
  })

  console.log(`✓ Created 20 followers for salvin`)

  // ── Follows: salvin → users[20–29] ────────────────────────────────────────

  await prisma.follow.createMany({
    data: users.slice(20, 30).map(u => ({
      followerId: salvin.id,
      followingId: u.id,
      status: FollowStatus.active,
      createdAt: daysAgo(20),
    })),
    skipDuplicates: true,
  })

  console.log(`✓ Created 10 accounts salvin is following`)

  // ── Blocks: salvin blocks users[45–49] ────────────────────────────────────

  await prisma.block.createMany({
    data: users.slice(45, 50).map(u => ({
      blockerId: salvin.id,
      blockedId: u.id,
      createdAt: daysAgo(5),
    })),
    skipDuplicates: true,
  })

  console.log(`✓ Created 5 blocks for salvin`)

  // ─────────────────────────────────────────────────────────────────────────
  console.log(`
✅ Extra users seed complete

All 50 accounts use password: Password123!
Email format: {username}@test.com

Salvin's social graph (new):
  Followers  users 1–20  (j_chen → max_v)
  Following  users 21–30 (layla_a → ryan_c)
  Blocked    users 46–50 (mike_d → david_k)
  `)
}

main().catch(console.error).finally(() => prisma.$disconnect())
