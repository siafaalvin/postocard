import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({ targetUserId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { targetUserId } = parsed.data;
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { visibility: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = target.visibility === "private" ? "pending" : "active";

  const follow = await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
    update: {},
    create: { followerId: session.user.id, followingId: targetUserId, status },
  });

  const eventType = status === "pending" ? "follow_requested" : "followed";
  await prisma.userEvent.create({
    data: { userId: session.user.id, eventType, targetUserId },
  });

  if (status === "active") {
    prisma.notification.create({
      data: { recipientId: targetUserId, actorId: session.user.id, type: "new_follower" },
    }).catch(console.error);
  }

  return NextResponse.json(follow, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("targetUserId");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetUserId },
  });

  await prisma.userEvent.create({
    data: { userId: session.user.id, eventType: "unfollowed", targetUserId },
  });

  return new NextResponse(null, { status: 204 });
}
