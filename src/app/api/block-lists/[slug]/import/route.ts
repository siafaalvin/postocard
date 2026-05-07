import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { massBlock } from "@/lib/block";

interface Params { params: Promise<{ slug: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await prisma.blockList.findUnique({
    where: { slug, isPublic: true },
    include: { entries: { select: { blockedUserId: true } } },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userIds = list.entries.map((e) => e.blockedUserId);

  // Use massBlock logic — re-use existing block service
  let blocked = 0;
  for (const userId of userIds) {
    if (userId === session.user.id) continue;
    try {
      await prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: userId } },
        update: {},
        create: { blockerId: session.user.id, blockedId: userId },
      });
      blocked++;
    } catch {
      // skip duplicates
    }
  }

  await prisma.blockList.update({ where: { slug }, data: { importCount: { increment: 1 } } });

  return NextResponse.json({ blocked });
}
