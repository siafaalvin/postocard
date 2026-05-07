import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ replyId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { replyId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reply = await prisma.reply.findUnique({ where: { id: replyId }, select: { authorId: true } });
  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.tier === "admin";
  if (reply.authorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.reply.update({ where: { id: replyId }, data: { deletedAt: new Date() } });
  return new NextResponse(null, { status: 204 });
}
