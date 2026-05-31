import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ALLOWED_TIERS = new Set(["plus", "creator", "moderator", "admin"]);
const MAX_SLOTS = 10;

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feeds = await prisma.savedLocationFeed.findMany({
    where: { userId: session.user.id },
    orderBy: { slot: "asc" },
  });

  return NextResponse.json(feeds);
}

const CreateSchema = z.object({
  name:     z.string().min(1).max(100),
  lat:      z.number().min(-90).max(90),
  lng:      z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(500).optional(),
  slot:     z.number().int().min(1).max(MAX_SLOTS),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ALLOWED_TIERS.has(session.user.tier)) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, lat, lng, radiusKm, slot } = parsed.data;

  const feed = await prisma.savedLocationFeed.upsert({
    where: { userId_slot: { userId: session.user.id, slot } },
    update: { name, lat, lng, radiusKm: radiusKm ?? 25 },
    create: { userId: session.user.id, name, lat, lng, radiusKm: radiusKm ?? 25, slot },
  });

  return NextResponse.json(feed, { status: 201 });
}
