import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const blockedIds = await prisma.block.findMany({
    where: { blockerId: session.user.id },
    select: { blockedId: true },
  });
  const excludeIds = [session.user.id, ...blockedIds.map((b) => b.blockedId)];

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      OR: [
        { username: { startsWith: q, mode: "insensitive" } },
        { displayName: { startsWith: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    take: 10,
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}
