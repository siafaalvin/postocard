import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ slot: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slot } = await params;
  const slotNum = parseInt(slot, 10);
  if (isNaN(slotNum) || slotNum < 1 || slotNum > 2) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  await prisma.userDisplayName.deleteMany({
    where: { userId: session.user.id, slot: slotNum },
  });

  return new NextResponse(null, { status: 204 });
}
