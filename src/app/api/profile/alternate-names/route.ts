import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SLOT_LIMITS: Record<string, number> = {
  plus: 1,
  creator: 2,
  moderator: 2,
  admin: 2,
};

const Schema = z.object({
  name: z.string().min(1).max(50),
  slot: z.union([z.literal(1), z.literal(2)]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maxSlots = SLOT_LIMITS[session.user.tier] ?? 0;
  if (maxSlots === 0) return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, slot } = parsed.data;

  if (slot > maxSlots) {
    return NextResponse.json({ error: "Slot not available on your tier" }, { status: 403 });
  }

  const altName = await prisma.userDisplayName.upsert({
    where: { userId_slot: { userId: session.user.id, slot } },
    update: { name },
    create: { userId: session.user.id, name, slot },
  });

  return NextResponse.json(altName, { status: 201 });
}
