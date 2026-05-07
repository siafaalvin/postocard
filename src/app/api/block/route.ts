import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyBlock } from "@/lib/block";
import { z } from "zod";

const Schema = z.object({
  targetUserId: z.string(),
  contextNote: z.string().max(200).optional(),
  contextHashtag: z.string().max(100).optional(),
  visibleToTarget: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { targetUserId, contextNote, contextHashtag, visibleToTarget } = parsed.data;

  await applyBlock({
    blockerId: session.user.id,
    blockedId: targetUserId,
    contextNote,
    contextHashtag,
    visibleToTarget,
  });

  await prisma.userEvent.create({
    data: { userId: session.user.id, eventType: "blocked", targetUserId },
  });

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("targetUserId");
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

  await prisma.block.deleteMany({
    where: { blockerId: session.user.id, blockedId: targetUserId },
  });

  return new NextResponse(null, { status: 204 });
}
