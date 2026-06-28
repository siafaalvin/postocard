import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username || username.length < 3 || username.length > 30) {
    return NextResponse.json({ available: false, reason: "Must be 3-30 characters" });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ available: false, reason: "Only letters, numbers, and underscores" });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing, reason: existing ? "Already taken" : null });
}
