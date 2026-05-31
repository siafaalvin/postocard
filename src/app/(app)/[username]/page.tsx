import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";
import { ProfileView } from "@/components/social/ProfileView";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, username: true },
  });
  if (!user) return { title: "User not found" };
  return { title: `${user.displayName} (@${user.username})` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      konvoId: true,
      visibility: true,
      tier: true,
      createdAt: true,
      _count: {
        select: {
          posts: { where: { deletedAt: null } },
          followers: { where: { status: "active" } },
          following: { where: { status: "active" } },
        },
      },
    },
  });

  if (!user) notFound();

  const viewerId = session?.user.id ?? null;
  const visible = await canViewProfile(user.id, viewerId);
  if (!visible) notFound();

  // Check block context if applicable
  let blockContext: { note: string | null; hashtag: string | null } | null = null;
  if (viewerId) {
    const block = await prisma.block.findFirst({
      where: { blockerId: user.id, blockedId: viewerId, visibleToTarget: true },
      select: { contextNote: true, contextHashtag: true },
    });
    if (block) blockContext = { note: block.contextNote, hashtag: block.contextHashtag };
  }

  return <ProfileView user={user} viewerId={viewerId} blockContext={blockContext} />;
}
