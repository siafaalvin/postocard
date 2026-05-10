import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedCapacity, incrementFeedCount } from "@/lib/feed";
import { z } from "zod";

const PAGE_SIZE = 20;

const CreatePostSchema = z.object({
  type: z.enum(["image", "video", "status"]),
  mediaKey: z.string().optional(),
  caption: z.string().max(2200).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  visibility: z.enum(["public", "followers"]).default("public"),
  hasCamera: z.boolean().default(false),
  mediaMetadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  // cursor encodes "ISO_DATE|cuid" so ties on createdAt are broken by id
  const [cursorDate, cursorId] = cursorParam ? cursorParam.split("|") : [null, null];

  const capacity = await getFeedCapacity(session.user.id, session.user.tier);
  if (capacity.atCap) {
    return NextResponse.json({ posts: [], atCap: true, remaining: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cameraOnlyMode: true },
  });

  // Get followed user IDs
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
      ...(user?.cameraOnlyMode
        ? { OR: [{ hasCamera: true }, { type: "video" }, { type: "status" }] }
        : {}),
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

  // Resolve signed URLs: pass through full URLs directly (dev placeholders), presign S3 keys otherwise
  const { presignDownload } = await import("@/lib/storage");
  const postsWithUrls = await Promise.all(
    posts.map(async (post) => {
      let signedUrl: string | null = null;
      if (post.mediaKey) {
        if (post.mediaKey.startsWith("https://") || post.mediaKey.startsWith("http://")) {
          signedUrl = post.mediaKey;
        } else {
          try {
            signedUrl = await presignDownload(post.mediaKey);
          } catch {
            signedUrl = null;
          }
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, mediaKey, caption, lat, lng, visibility, hasCamera, mediaMetadata } = parsed.data;

  if (type !== "status" && !mediaKey) {
    return NextResponse.json({ error: "mediaKey required for image/video posts" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      type,
      mediaKey,
      caption,
      lat,
      lng,
      visibility,
      hasCamera,
      mediaMetadata: mediaMetadata ?? undefined,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
