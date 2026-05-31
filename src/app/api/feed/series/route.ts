import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedCapacity, incrementFeedCount } from "@/lib/feed";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const [cursorDate, cursorId] = cursorParam ? cursorParam.split("|") : [null, null];

  const capacity = await getFeedCapacity(session.user.id, session.user.tier);
  if (capacity.atCap) {
    return NextResponse.json({ posts: [], atCap: true });
  }

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id, status: "active" },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const limit = Math.min(PAGE_SIZE, capacity.remaining === Infinity ? PAGE_SIZE : capacity.remaining);

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: followingIds },
      deletedAt: null,
      type: { in: ["image", "video"] },
      OR: [
        { visibility: "public" },
        { visibility: "followers" },
        { visibility: "following", author: { following: { some: { followingId: session.user.id, status: "active" } } } },
        { visibility: "mentioned", mentions: { some: { userId: session.user.id } } },
      ],
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
    take: limit,
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (posts.length > 0) {
    await incrementFeedCount(session.user.id, posts.length);
  }

  const lastPost = posts.length === limit ? posts[posts.length - 1] : null;
  const nextCursor = lastPost ? `${lastPost.createdAt.toISOString()}|${lastPost.id}` : null;

  const { presignDownload } = await import("@/lib/storage");
  const postsWithUrls = await Promise.all(
    posts.map(async (post) => {
      let signedUrl: string | null = null;
      if (post.mediaKey) {
        if (post.mediaKey.startsWith("http")) {
          signedUrl = post.mediaKey;
        } else {
          try { signedUrl = await presignDownload(post.mediaKey); } catch { signedUrl = null; }
        }
      }
      return { ...post, signedUrl };
    })
  );

  return NextResponse.json({ posts: postsWithUrls, nextCursor, atCap: false });
}
