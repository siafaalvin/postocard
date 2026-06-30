import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeedCapacity } from "@/lib/feed";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const capacity = await getFeedCapacity(session.user.id, session.user.tier);
  return NextResponse.json({
    remaining: capacity.remaining === Infinity ? null : capacity.remaining,
    total: capacity.totalCap === Infinity ? null : capacity.totalCap,
    used: capacity.usedToday,
    atCap: capacity.atCap,
  });
}
