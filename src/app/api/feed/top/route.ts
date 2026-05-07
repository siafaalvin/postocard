import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  // Read from latest snapshot
  const snapshot = await prisma.topFeedSnapshot.findFirst({
    orderBy: { computedAt: "desc" },
  });

  if (!snapshot) return NextResponse.json({ posts: [] });

  const postIds = snapshot.postIds as string[];

  const session = await getServerSession(authOptions);
  let cameraOnlyMode = false;
  if (session?.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cameraOnlyMode: true },
    });
    cameraOnlyMode = user?.cameraOnlyMode ?? false;
  }

  const posts = await prisma.post.findMany({
    where: {
      id: { in: postIds },
      deletedAt: null,
      ...(cameraOnlyMode
        ? { OR: [{ hasCamera: true }, { type: "video" }, { type: "status" }] }
        : {}),
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  // Restore snapshot order
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean);

  return NextResponse.json({ posts: ordered, computedAt: snapshot.computedAt });
}
