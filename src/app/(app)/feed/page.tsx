import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeedCapacity } from "@/lib/feed";
import { FeedWrapper } from "@/components/feed/FeedWrapper";
import { FeedTabs } from "@/components/feed/FeedTabs";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const capacity = await getFeedCapacity(session.user.id, session.user.tier);

  return (
    <FeedWrapper userId={session.user.id}>
      <FeedTabs userId={session.user.id} tier={session.user.tier} initialCapacity={capacity} />
    </FeedWrapper>
  );
}
