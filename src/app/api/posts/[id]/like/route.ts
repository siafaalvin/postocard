import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.like.upsert({
      where: { userId_postId: { userId: session.user.id, postId } },
      update: {},
      create: { userId: session.user.id, postId },
    }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    prisma.userEvent.create({
      data: { userId: session.user.id, eventType: "liked_post", targetPostId: postId },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: postId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });
  if (!existing) return new NextResponse(null, { status: 204 });

  await prisma.$transaction([
    prisma.like.delete({ where: { userId_postId: { userId: session.user.id, postId } } }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
