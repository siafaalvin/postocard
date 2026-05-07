import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

const Schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const follow = await prisma.follow.findUnique({
    where: { id },
    select: { followingId: true, status: true },
  });

  if (!follow || follow.followingId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (follow.status !== "pending") {
    return NextResponse.json({ error: "Not a pending request" }, { status: 409 });
  }

  if (parsed.data.action === "accept") {
    await prisma.follow.update({ where: { id }, data: { status: "active" } });
  } else {
    await prisma.follow.delete({ where: { id } });
  }

  return new NextResponse(null, { status: 204 });
}
