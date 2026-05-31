import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WEEKS_BACK = 12;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - WEEKS_BACK * 7 * 24 * 60 * 60 * 1000);
  const userId = session.user.id;

  const [follows, blocks, mutes, flags] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.block.findMany({
      where: { blockerId: userId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mute.findMany({
      where: { muterId: userId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        muted: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFlag.findMany({
      where: { placerId: userId, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        flaggedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attribute: { select: { label: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ follows, blocks, mutes, flags });
}
