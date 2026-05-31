import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params { params: Promise<{ id: string }> }

const Schema = z.object({
  read:     z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ad = await prisma.adDelivery.findUnique({ where: { id }, select: { userId: true } });
  if (!ad || ad.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.adDelivery.update({
    where: { id },
    data: {
      ...(parsed.data.read !== undefined ? { read: parsed.data.read } : {}),
      ...(parsed.data.archived ? { archivedAt: new Date() } : {}),
    },
    select: { id: true, read: true, archivedAt: true },
  });

  return NextResponse.json(updated);
}
