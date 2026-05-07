import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const list = await prisma.blockList.findUnique({
    where: { slug, isPublic: true },
    include: {
      owner: { select: { username: true, displayName: true } },
      entries: {
        include: {
          blockedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await prisma.blockList.findUnique({ where: { slug }, select: { ownerId: true } });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.blockList.delete({ where: { slug } });
  return new NextResponse(null, { status: 204 });
}
