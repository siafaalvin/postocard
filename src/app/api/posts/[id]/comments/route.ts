import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const comments = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { replies: true } },
    },
  });
  return NextResponse.json(comments);
}

const Schema = z.object({ body: z.string().min(1).max(2200) });

export async function POST(req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.tier === "guest") return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
    select: { authorId: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId, authorId: session.user.id, body: parsed.data.body },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    // Upsert TemporaryProfileGrant for post author + other commenters (F2)
    prisma.temporaryProfileGrant.upsert({
      where: {
        grantedById_grantedToId: {
          grantedById: session.user.id,
          grantedToId: post.authorId,
        },
      },
      update: { expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      create: {
        grantedById: session.user.id,
        grantedToId: post.authorId,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  if (post.authorId !== session.user.id) {
    prisma.notification.create({
      data: { recipientId: post.authorId, actorId: session.user.id, type: "post_commented", postId, commentId: comment.id },
    }).catch(console.error);
  }

  return NextResponse.json(comment, { status: 201 });
}
