import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";

interface Params { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day"); // YYYY-MM-DD

  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visible = await canViewProfile(user.id, session?.user.id ?? null);
  if (!visible) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where: Parameters<typeof prisma.post.findMany>[0]["where"] = {
    authorId: user.id,
    deletedAt: null,
    visibility: session?.user.id === user.id ? undefined : "public",
  };

  if (day) {
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(`${day}T23:59:59.999Z`);
    where.createdAt = { gte: start, lte: end };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json(posts);
}
