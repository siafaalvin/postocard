import { prisma } from "@/lib/prisma";

const TIER_CAPS: Record<string, number> = {
  guest: 200,
  basic: 500,
  plus: 250,
  creator: Infinity,
  moderator: Infinity,
  admin: Infinity,
};

export interface FeedCapacity {
  baseCap: number;
  extensionExtra: number;
  totalCap: number;
  usedToday: number;
  remaining: number;
  atCap: boolean;
}

/**
 * Returns the remaining feed capacity for a user today.
 * totalCap = baseTierCap + SUM(postsGranted − usedCount) for active non-expired extensions.
 */
export async function getFeedCapacity(userId: string, tier: string): Promise<FeedCapacity> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [dailyCount, extensions] = await Promise.all([
    prisma.feedDailyCount.findUnique({
      where: { userId_date: { userId, date: today } },
      select: { count: true },
    }),
    prisma.viewExtension.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        // only extensions with remaining posts
      },
      select: { postsGranted: true, usedCount: true },
    }),
  ]);

  const baseCap = TIER_CAPS[tier] ?? TIER_CAPS.basic;
  const extensionExtra = extensions.reduce(
    (sum, ext) => sum + Math.max(0, ext.postsGranted - ext.usedCount),
    0
  );
  const totalCap = baseCap === Infinity ? Infinity : baseCap + extensionExtra;
  const usedToday = dailyCount?.count ?? 0;
  const remaining = totalCap === Infinity ? Infinity : Math.max(0, totalCap - usedToday);

  return {
    baseCap,
    extensionExtra,
    totalCap,
    usedToday,
    remaining,
    atCap: remaining === 0,
  };
}

/**
 * Increment the daily post-view count for a user, consuming extension slots FIFO.
 */
export async function incrementFeedCount(userId: string, count: number): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.feedDailyCount.upsert({
    where: { userId_date: { userId, date: today } },
    update: { count: { increment: count } },
    create: { userId, date: today, count },
  });

  // Consume view extension slots FIFO
  let remaining = count;
  const extensions = await prisma.viewExtension.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  for (const ext of extensions) {
    if (remaining <= 0) break;
    const available = ext.postsGranted - ext.usedCount;
    const consume = Math.min(available, remaining);
    await prisma.viewExtension.update({
      where: { id: ext.id },
      data: { usedCount: { increment: consume } },
    });
    remaining -= consume;
  }
}
