import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const north = parseFloat(searchParams.get("north") ?? "90");
  const south = parseFloat(searchParams.get("south") ?? "-90");
  const east = parseFloat(searchParams.get("east") ?? "180");
  const west = parseFloat(searchParams.get("west") ?? "-180");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const posts = await prisma.post.findMany({
    where: {
      deletedAt: null,
      visibility: "public",
      lat: { not: null, gte: south, lte: north },
      lng: { not: null, gte: west, lte: east },
      createdAt: { gte: today },
    },
    orderBy: { likeCount: "desc" },
    take: 100,
    select: {
      id: true,
      lat: true,
      lng: true,
      likeCount: true,
      mediaKey: true,
      type: true,
      caption: true,
      author: { select: { username: true, displayName: true } },
    },
  });

  return NextResponse.json({ posts });
}
