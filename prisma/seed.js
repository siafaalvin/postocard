// prisma/seed.js — test data: 100 users × 20 posts × 10 comments × 10 interactions
const { PrismaClient } = require('../node_modules/@prisma/client');
const bcrypt = require('../node_modules/bcryptjs');
const prisma = new PrismaClient();

// Deterministic LCG so results are reproducible
let _seed = 42;
function rand(max) {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed % max;
}
function sample(arr) { return arr[rand(arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FIRST = ['alex','blake','casey','dana','eden','finn','grey','harper','indra','jace','kira','lane','morgan','nova','onyx','parker','quinn','reese','sage','taylor','urban','vale','wren','xen','yara','zara','arlo','beau','clio','dex'];
const DISPLAY_FIRST = ['Alex','Blake','Casey','Dana','Eden','Finn','Grey','Harper','Indra','Jace','Kira','Lane','Morgan','Nova','Onyx','Parker','Quinn','Reese','Sage','Taylor','Urban','Vale','Wren','Xen','Yara','Zara','Arlo','Beau','Clio','Dex'];
const LAST = ['Smith','Jones','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Lee','Clark'];

const CAPTIONS = [
  'Beautiful day outside!','Just got back from the most amazing trip.','Morning coffee vibes',
  "Can't believe this view.",'Work hard, play harder.','Golden hour is everything.',
  'Weekend adventures incoming.','This place never gets old.','Living my best life.',
  'Nature is the best therapy.','New week, new goals.','Sunset chasing.',
  'Good vibes only.','Simple moments, big memories.','Embracing the chaos.',
  'Another day, another adventure.','City lights and late nights.','Catching up with old friends.',
  'Trying something new today.','This food is unreal.','Grateful for everything.',
  'Big things coming soon.','Just vibing.','Exploring hidden gems.',
  'Lost in the moment.','Making memories.','Life is good.',
  'On top of the world right now.','Weekend mode: activated.','This hits different.',
  'Needed this today.','Zero complaints.','Not all who wander are lost.',
  'Here for a good time.','Going places.','The best is yet to come.',
  'Obsessed with this spot.','Worth every step.','Moment of peace.',
  'Starting fresh.','Chasing the light.',
];

const COMMENT_BODIES = [
  'Love this!','So beautiful!','Amazing shot!','Goals!','This is everything.',
  'Wow, incredible!','Where is this?','I need to visit!','The vibes are immaculate.',
  'Fire 🔥','This is so wholesome.','Absolutely stunning.','You\'re killing it!',
  'Major inspo.','Living for this.','Perfect.','So jealous!','Stunning as always.',
  'Keep it up!','Best one yet.','The GOAT.','Need more of this.',
  'This made my day.','Iconic.','Unreal.','Blessed.','Love love love.',
  'Never gets old.','Chef\'s kiss.','Obsessed.',
];

const BIOS = [
  'Just here for the vibes.','Coffee addict. Dog lover.',
  'Exploring one city at a time.','Making memories daily.',
  'Creative at heart.','Chasing sunsets.','Fueled by curiosity.',
  'Live, laugh, post.','Building something cool.','Outdoor enthusiast.',
  null, null,
];

const GEOS = [
  { lat: 40.7128, lng: -74.0060 },   // NYC
  { lat: 34.0522, lng: -118.2437 },  // LA
  { lat: 51.5074, lng: -0.1278 },    // London
  { lat: 48.8566, lng: 2.3522 },     // Paris
  { lat: 35.6762, lng: 139.6503 },   // Tokyo
  { lat: -33.8688, lng: 151.2093 },  // Sydney
  { lat: 52.5200, lng: 13.4050 },    // Berlin
  { lat: 41.9028, lng: 12.4964 },    // Rome
  { lat: 37.7749, lng: -122.4194 },  // SF
  { lat: 25.2048, lng: 55.2708 },    // Dubai
  null, null, null, null, null, null, // ~60% posts have no geo
];

const TIERS = ['basic','basic','basic','basic','basic','basic','basic','plus','plus','creator'];
const POST_TYPES = ['status','status','image','image','image','video'];

const MS_DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function randomDate(maxDaysAgo = 30) {
  return new Date(NOW - rand(maxDaysAgo) * MS_DAY - rand(86400) * 1000);
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ── 1. Create 100 test users ──────────────────────────────────────────────
  console.log('Creating 100 users...');
  const usedUsernames = new Set(['salvin']);
  const usersData = [];

  for (let i = 0; i < 100; i++) {
    let username;
    let attempts = 0;
    do {
      username = `${sample(FIRST)}${rand(9999)}`;
      attempts++;
    } while (usedUsernames.has(username) && attempts < 200);
    usedUsernames.add(username);

    const firstIdx = rand(DISPLAY_FIRST.length);
    usersData.push({
      email: `testuser${i + 1}@postocard.test`,
      passwordHash,
      username,
      displayName: `${DISPLAY_FIRST[firstIdx]} ${sample(LAST)}`,
      bio: sample(BIOS),
      tier: sample(TIERS),
      visibility: rand(5) === 0 ? 'private' : 'public',
      cameraOnlyMode: rand(5) === 0,
      registrationPaidAt: new Date(),
      renewalDueAt: new Date(NOW + 365 * MS_DAY),
    });
  }

  await prisma.user.createMany({ data: usersData, skipDuplicates: true });

  const allUsers = await prisma.user.findMany({ select: { id: true, username: true } });
  const salvin = allUsers.find(u => u.username === 'salvin');
  const testUsers = allUsers.filter(u => u.username !== 'salvin');
  console.log(`  ✓ ${testUsers.length} test users`);

  // ── 2. Create 20 posts per user (+ 5 for salvin) ─────────────────────────
  console.log('Creating posts...');
  const postsData = [];

  for (const user of testUsers) {
    for (let p = 0; p < 20; p++) {
      const type = sample(POST_TYPES);
      const geo = sample(GEOS);
      const hasCamera = type === 'image' && rand(2) === 0;
      postsData.push({
        authorId: user.id,
        type,
        mediaKey: type !== 'status' ? `media/${user.id}/placeholder-${p}.${type === 'video' ? 'mp4' : 'jpg'}` : null,
        caption: sample(CAPTIONS),
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        visibility: rand(6) === 0 ? 'followers' : 'public',
        likeCount: 0,
        hasCamera,
        mediaMetadata: hasCamera ? { Make: 'Apple', Model: sample(['iPhone 14','iPhone 15 Pro','iPhone 13']), FocalLength: '24mm' } : null,
        createdAt: randomDate(30),
      });
    }
  }

  if (salvin) {
    for (let p = 0; p < 5; p++) {
      const type = sample(POST_TYPES);
      postsData.push({
        authorId: salvin.id,
        type,
        mediaKey: type !== 'status' ? `media/${salvin.id}/placeholder-${p}.jpg` : null,
        caption: sample(CAPTIONS),
        lat: sample(GEOS)?.lat ?? null,
        lng: sample(GEOS)?.lng ?? null,
        visibility: 'public',
        likeCount: 0,
        hasCamera: type === 'image',
        createdAt: randomDate(7),
      });
    }
  }

  await prisma.post.createMany({ data: postsData });
  const allPosts = await prisma.post.findMany({ select: { id: true, authorId: true } });
  console.log(`  ✓ ${allPosts.length} posts`);

  // ── 3. Follows: each user follows salvin + 4 random users ─────────────────
  console.log('Creating follows...');
  const followsData = [];
  const followEventsData = [];
  const followPairs = new Set();

  for (const user of testUsers) {
    const targets = salvin ? [salvin, ...shuffle(testUsers.filter(u => u.id !== user.id)).slice(0, 4)] : shuffle(testUsers.filter(u => u.id !== user.id)).slice(0, 5);
    for (const target of targets) {
      const key = `${user.id}|${target.id}`;
      if (!followPairs.has(key)) {
        followPairs.add(key);
        followsData.push({ followerId: user.id, followingId: target.id, status: 'active' });
        followEventsData.push({ userId: user.id, eventType: 'followed', targetUserId: target.id });
      }
    }
  }

  await prisma.follow.createMany({ data: followsData, skipDuplicates: true });
  await prisma.userEvent.createMany({ data: followEventsData });
  console.log(`  ✓ ${followsData.length} follows`);

  // ── 4. Likes: 5 likes per user on other users' posts ─────────────────────
  console.log('Creating likes...');
  const likesData = [];
  const likeEventsData = [];
  const likePairs = new Set();

  for (const user of testUsers) {
    const eligible = allPosts.filter(p => p.authorId !== user.id);
    for (const post of shuffle(eligible).slice(0, 5)) {
      const key = `${user.id}|${post.id}`;
      if (!likePairs.has(key)) {
        likePairs.add(key);
        likesData.push({ userId: user.id, postId: post.id });
        likeEventsData.push({ userId: user.id, eventType: 'liked_post', targetPostId: post.id });
      }
    }
  }

  await prisma.like.createMany({ data: likesData, skipDuplicates: true });
  await prisma.userEvent.createMany({ data: likeEventsData });

  // Sync likeCount
  await prisma.$executeRaw`
    UPDATE "Post" p
    SET "likeCount" = sub.cnt
    FROM (SELECT "postId", COUNT(*)::int AS cnt FROM "Like" GROUP BY "postId") sub
    WHERE p.id = sub."postId"
  `;
  console.log(`  ✓ ${likesData.length} likes`);

  // ── 5. Comments: 10 per user on other users' posts ────────────────────────
  console.log('Creating comments...');
  const commentsData = [];

  for (const user of testUsers) {
    const eligible = allPosts.filter(p => p.authorId !== user.id);
    for (const post of shuffle(eligible).slice(0, 10)) {
      commentsData.push({
        postId: post.id,
        authorId: user.id,
        body: sample(COMMENT_BODIES),
        createdAt: randomDate(30),
      });
    }
  }

  await prisma.comment.createMany({ data: commentsData });
  const allComments = await prisma.comment.findMany({ select: { id: true, authorId: true } });
  console.log(`  ✓ ${allComments.length} comments`);

  // ── 6. Replies: 2 per user on other users' comments ──────────────────────
  console.log('Creating replies...');
  const repliesData = [];

  for (const user of testUsers) {
    const eligible = allComments.filter(c => c.authorId !== user.id);
    for (const comment of shuffle(eligible).slice(0, 2)) {
      repliesData.push({
        commentId: comment.id,
        authorId: user.id,
        body: sample(COMMENT_BODIES),
        createdAt: randomDate(30),
      });
    }
  }

  await prisma.reply.createMany({ data: repliesData });
  console.log(`  ✓ ${repliesData.length} replies`);

  // ── 7. Comment likes: 2 per user ─────────────────────────────────────────
  console.log('Creating comment likes...');
  const commentLikesData = [];
  const commentLikePairs = new Set();

  for (const user of testUsers) {
    const eligible = allComments.filter(c => c.authorId !== user.id);
    for (const comment of shuffle(eligible).slice(0, 2)) {
      const key = `${user.id}|${comment.id}`;
      if (!commentLikePairs.has(key)) {
        commentLikePairs.add(key);
        commentLikesData.push({ userId: user.id, commentId: comment.id });
      }
    }
  }

  await prisma.commentLike.createMany({ data: commentLikesData, skipDuplicates: true });

  await prisma.$executeRaw`
    UPDATE "Comment" c
    SET "commentLikeCount" = sub.cnt
    FROM (SELECT "commentId", COUNT(*)::int AS cnt FROM "CommentLike" GROUP BY "commentId") sub
    WHERE c.id = sub."commentId"
  `;
  console.log(`  ✓ ${commentLikesData.length} comment likes`);

  // ── 8. TopFeedSnapshot ────────────────────────────────────────────────────
  const topPosts = await prisma.post.findMany({
    where: { deletedAt: null, visibility: 'public' },
    orderBy: { likeCount: 'desc' },
    take: 100,
    select: { id: true },
  });
  await prisma.topFeedSnapshot.create({
    data: { computedAt: new Date(), postIds: topPosts.map(p => p.id) },
  });
  console.log(`  ✓ TopFeedSnapshot (${topPosts.length} posts)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\nSeed complete:');
  console.log(`  Users:         ${testUsers.length}`);
  console.log(`  Posts:         ${allPosts.length}`);
  console.log(`  Follows:       ${followsData.length}`);
  console.log(`  Likes:         ${likesData.length}`);
  console.log(`  Comments:      ${allComments.length}`);
  console.log(`  Replies:       ${repliesData.length}`);
  console.log(`  Comment likes: ${commentLikesData.length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
