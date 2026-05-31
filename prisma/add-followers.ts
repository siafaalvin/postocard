declare const Bun: {
  password: { hash(pw: string, opts: { algorithm: "bcrypt"; cost: number }): Promise<string> }
}

import { PrismaClient, UserTier, UserVisibility, FollowStatus } from "@prisma/client";

const prisma = new PrismaClient();

const FOLLOWER_NAMES = [
  { username: "marco_r",    displayName: "Marco Rivera" },
  { username: "jess_k",     displayName: "Jessica Kim" },
  { username: "tomh",       displayName: "Tom Huang" },
  { username: "priya_n",    displayName: "Priya Nair" },
  { username: "luca_m",     displayName: "Luca Moretti" },
  { username: "sarahj",     displayName: "Sarah Johnson" },
  { username: "devlin_g",   displayName: "Devon Glover" },
  { username: "amirah_s",   displayName: "Amirah Sato" },
  { username: "benwood",    displayName: "Ben Woodward" },
  { username: "claire_p",   displayName: "Claire Petit" },
  { username: "ozzy_b",     displayName: "Oscar Brennan" },
  { username: "nadia_v",    displayName: "Nadia Volkov" },
  { username: "kai_t",      displayName: "Kai Tanaka" },
  { username: "elspeth_m",  displayName: "Elspeth Moore" },
  { username: "rafi_a",     displayName: "Rafael Abreu" },
  { username: "sienna_d",   displayName: "Sienna Durant" },
  { username: "jakub_w",    displayName: "Jakub Wiśniewski" },
  { username: "layla_f",    displayName: "Layla Farooq" },
  { username: "cormac_h",   displayName: "Cormac Hayes" },
  { username: "ting_x",     displayName: "Ting Xu" },
];

async function main() {
  const target = await prisma.user.findUnique({ where: { username: "salvin" } });
  if (!target) {
    console.error("❌ User @salvin not found. Make sure this account exists before running this script.");
    process.exit(1);
  }
  console.log(`✓ Found @salvin (id: ${target.id})`);

  const pw = await Bun.password.hash("Password123!", { algorithm: "bcrypt", cost: 10 });
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  let created = 0;
  for (let i = 0; i < FOLLOWER_NAMES.length; i++) {
    const { username, displayName } = FOLLOWER_NAMES[i];
    const email = `${username}@test.com`;

    const follower = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: pw,
        username,
        displayName,
        visibility: UserVisibility.public,
        tier: UserTier.basic,
      },
    });

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: follower.id, followingId: target.id } },
      update: {},
      create: {
        followerId: follower.id,
        followingId: target.id,
        status: FollowStatus.active,
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
      },
    });

    created++;
  }

  console.log(`✓ Added ${created} followers to @salvin`);
  console.log(`\nAll follower accounts use password: Password123!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
