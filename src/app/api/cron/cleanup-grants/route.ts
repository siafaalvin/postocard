import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Also clean up old FeedDailyCount records (older than 7 days)
// Views reset daily at midnight EST — old records are just clutter.

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
      // Clean old view counts (older than 7 days)
  await prisma.feedDailyCount.deleteMany({
    where: { date: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  }).catch(() => {});

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.temporaryProfileGrant.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

    // Clean old view counts (older than 7 days)
  await prisma.feedDailyCount.deleteMany({
    where: { date: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  }).catch(() => {});

  return NextResponse.json({ deleted: result.count });
}
