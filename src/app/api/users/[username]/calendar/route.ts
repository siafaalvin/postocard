import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ username: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day");

  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Calendar interaction log only visible to the owner
  if (!session || session.user.id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!day) return NextResponse.json({ error: "day required" }, { status: 400 });

  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);

  const events = await prisma.userEvent.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
    include: {
      targetUser: { select: { id: true, username: true, displayName: true } },
      targetPost: { select: { id: true, caption: true } },
    },
  });

  return NextResponse.json(events);
}
