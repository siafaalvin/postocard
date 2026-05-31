import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PAGE_SIZE = 20;

// GET — paginated ad inbox for the authenticated user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const countOnly = searchParams.get("count") === "1";

  if (countOnly) {
    const count = await prisma.adDelivery.count({
      where: { userId: session.user.id, read: false, archivedAt: null },
    });
    return NextResponse.json({ count });
  }

  const ads = await prisma.adDelivery.findMany({
    where: {
      userId: session.user.id,
      archivedAt: null,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      body: true,
      ctaUrl: true,
      imageUrl: true,
      source: true,
      read: true,
      createdAt: true,
    },
  });

  const nextCursor = ads.length === PAGE_SIZE ? ads[ads.length - 1].id : null;
  return NextResponse.json({ ads, nextCursor });
}

// POST — BubblAds delivery endpoint (API-key authenticated)
const DeliverSchema = z.object({
  userId:   z.string(),
  title:    z.string().min(1).max(200),
  body:     z.string().min(1).max(2000),
  ctaUrl:   z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  source:   z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey || apiKey !== process.env.BUBBLADS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = DeliverSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId, title, body: adBody, ctaUrl, imageUrl, source } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ad = await prisma.adDelivery.create({
    data: { userId, title, body: adBody, ctaUrl, imageUrl, source: source ?? "bubblads" },
    select: { id: true },
  });

  return NextResponse.json(ad, { status: 201 });
}
