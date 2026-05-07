import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called hourly by a cron job — secured by a secret header
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const posts = await prisma.post.findMany({
    where: {
      createdAt: { gte: today },
      deletedAt: null,
      visibility: "public",
    },
    orderBy: { likeCount: "desc" },
    take: 100,
    select: { id: true },
  });

  await prisma.topFeedSnapshot.create({
    data: { postIds: posts.map((p) => p.id) },
  });

  return NextResponse.json({ computed: posts.length });
}
