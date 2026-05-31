import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const [cursorDate, cursorId] = cursorParam ? cursorParam.split("|") : [null, null];

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: session.user.id,
      ...(cursorDate
        ? {
            OR: [
              { createdAt: { lt: new Date(cursorDate) } },
              ...(cursorId ? [{ createdAt: new Date(cursorDate), id: { lt: cursorId } }] : []),
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    include: {
      actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      post: { select: { id: true, caption: true } },
      comment: { select: { id: true } },
    },
  });

  // Mark all returned notifications as read (fire-and-forget)
  if (notifications.length > 0) {
    prisma.notification.updateMany({
      where: { id: { in: notifications.map((n) => n.id) } },
      data: { read: true },
    }).catch(console.error);
  }

  const last = notifications.length === 20 ? notifications[notifications.length - 1] : null;
  const nextCursor = last ? `${last.createdAt.toISOString()}|${last.id}` : null;

  return NextResponse.json({ notifications, nextCursor });
}
