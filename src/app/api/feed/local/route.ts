import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedCapacity, incrementFeedCount } from "@/lib/feed";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusKm = parseFloat(searchParams.get("radiusKm") ?? "25");
  const cursorParam = searchParams.get("cursor");
  const [cursorDate, cursorId] = cursorParam ? cursorParam.split("|") : [null, null];

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const capacity = await getFeedCapacity(session.user.id, session.user.tier);
  if (capacity.atCap) {
    return NextResponse.json({ posts: [], atCap: true, remaining: 0 });
  }

  // Convert radius to bounding box
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const north = lat + latDelta;
  const south = lat - latDelta;
  const east = lng + lngDelta;
  const west = lng - lngDelta;

  const limit = Math.min(PAGE_SIZE, capacity.remaining === Infinity ? PAGE_SIZE : capacity.remaining);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      visibility: "public",
      type: { not: "status" },
      lat: { gte: south, lte: north },
      lng: { gte: west, lte: east },
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

  return NextResponse.json({
    posts: postsWithUrls,
    nextCursor,
    remaining: capacity.remaining === Infinity ? null : capacity.remaining - posts.length,
    atCap: false,
  });
}
