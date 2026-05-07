import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["block", "mute"]),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const blockIds = parsed.data.items.filter((i) => i.type === "block").map((i) => i.id);
  const muteIds = parsed.data.items.filter((i) => i.type === "mute").map((i) => i.id);

  await Promise.all([
    blockIds.length > 0
      ? prisma.block.deleteMany({ where: { id: { in: blockIds }, blockerId: session.user.id } })
      : Promise.resolve(),
    muteIds.length > 0
      ? prisma.mute.deleteMany({ where: { id: { in: muteIds }, muterId: session.user.id } })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ removed: parsed.data.items.length });
}
