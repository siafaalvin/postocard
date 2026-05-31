import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";
import { ActivityView } from "@/components/calendar/ActivityView";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ day?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}'s activity` };
}

export default async function ActivityPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { day } = await searchParams;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true },
  });

  if (!user) notFound();

  const viewerId = session?.user.id ?? null;
  const visible = await canViewProfile(user.id, viewerId);
  if (!visible) notFound();

  const isOwn = viewerId === user.id;

  return (
    <ActivityView
      profileUser={user}
      viewerId={viewerId}
      isOwn={isOwn}
      selectedDay={day}
    />
  );
}
