import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";

interface Params { params: Promise<{ username: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      visibility: true,
      tier: true,
      createdAt: true,
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
          followers: { where: { status: "active" } },
          following: { where: { status: "active" } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewerId = session?.user.id ?? null;
  const visible = await canViewProfile(user.id, viewerId);
  if (!visible) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Block context (F5)
  let blockContext = null;
  if (viewerId) {
    const block = await prisma.block.findFirst({
      where: { blockerId: user.id, blockedId: viewerId, visibleToTarget: true },
      select: { contextNote: true, contextHashtag: true },
    });
    if (block) blockContext = { note: block.contextNote, hashtag: block.contextHashtag };
  }

  return NextResponse.json({ ...user, blockContext });
}
