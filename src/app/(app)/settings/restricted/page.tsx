import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RestrictedUsersTable } from "@/components/settings/RestrictedUsersTable";

export const metadata: Metadata = { title: "Restricted users" };

export default async function RestrictedPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [blocks, mutes] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId: session.user.id },
      include: {
        blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mute.findMany({
      where: { muterId: session.user.id },
      include: {
        muted: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows = [
    ...blocks.map((b) => ({
      id: b.id,
      type: "block" as const,
      user: b.blocked,
      contextNote: b.contextNote,
      contextHashtag: b.contextHashtag,
      createdAt: b.createdAt,
    })),
    ...mutes.map((m) => ({
      id: m.id,
      type: "mute" as const,
      user: m.muted,
      contextNote: m.contextNote,
      contextHashtag: m.contextHashtag,
      createdAt: m.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Restricted users</h1>
      <RestrictedUsersTable rows={rows} />
    </div>
  );
}
