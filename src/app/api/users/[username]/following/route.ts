import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const session = await getServerSession(authOptions);
  const viewerId = session?.user.id ?? null;

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const [cursorDate, cursorId] = cursorParam ? cursorParam.split("|") : [null, null];

  const profile = await prisma.user.findUnique({
    where: { username },
    select: { id: true, visibility: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (profile.visibility === "private" && viewerId !== profile.id) {
    const isFollower = viewerId
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: profile.id } },
          select: { status: true },
        })
      : null;
    if (!isFollower || isFollower.status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const follows = await prisma.follow.findMany({
    where: {
      followerId: profile.id,
      status: "active",
      ...(cursorDate
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorDate) } },
              ...(cursorId ? [{ createdAt: new Date(cursorDate), id: { lt: cursorId } }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    include: {
      following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const last = follows.length === 20 ? follows[follows.length - 1] : null;
  const nextCursor = last ? `${last.createdAt.toISOString()}|${last.id}` : null;

  return NextResponse.json({ users: follows.map((f) => f.following), nextCursor });
}
