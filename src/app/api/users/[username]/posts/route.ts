import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";
import { Prisma } from "@prisma/client";

interface Params { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day"); // YYYY-MM-DD

  const session = await getServerSession(authOptions);
  const viewerId = session?.user.id ?? null;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visible = await canViewProfile(user.id, viewerId);
  if (!visible) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let visibilityFilter: Prisma.PostWhereInput | undefined;

  if (viewerId === user.id) {
    // Owner sees all their own posts
    visibilityFilter = undefined;
  } else if (!viewerId) {
    // Unauthenticated — public only
    visibilityFilter = { visibility: "public" };
  } else {
    visibilityFilter = {
      OR: [
        { visibility: "public" },
        { visibility: "followers", author: { followers: { some: { followerId: viewerId, status: "active" } } } },
        { visibility: "following", author: { following: { some: { followingId: viewerId, status: "active" } } } },
        { visibility: "mentioned", mentions: { some: { userId: viewerId } } },
      ],
    };
  }

  const baseWhere: Prisma.PostWhereInput = {
    authorId: user.id,
    deletedAt: null,
    ...visibilityFilter,
  };

  if (day) {
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(`${day}T23:59:59.999Z`);
    baseWhere.createdAt = { gte: start, lte: end };
  }

  const posts = await prisma.post.findMany({
    where: baseWhere,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json(posts);
}
