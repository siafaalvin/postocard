import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string; commentId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;
  const replies = await prisma.reply.findMany({
    where: { commentId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return NextResponse.json(replies);
}

const Schema = z.object({ body: z.string().min(1).max(2200) });

export async function POST(req: NextRequest, { params }: Params) {
  const { commentId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.tier === "guest") return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: { authorId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = await prisma.reply.create({
    data: { commentId, authorId: session.user.id, body: parsed.data.body },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  if (comment.authorId !== session.user.id) {
    prisma.notification.create({
      data: { recipientId: comment.authorId, actorId: session.user.id, type: "comment_replied", commentId, replyId: reply.id },
    }).catch(console.error);
  }

  return NextResponse.json(reply, { status: 201 });
}
