import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeedCapacity } from "@/lib/feed";
import { MainFeed } from "@/components/feed/MainFeed";
import { ViewExtensionBanner } from "@/components/feed/ViewExtensionBanner";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const capacity = await getFeedCapacity(session.user.id, session.user.tier);

  return (
    <div>
      {capacity.atCap && <ViewExtensionBanner />}
      <MainFeed initialCapacity={capacity} userId={session.user.id} />
    </div>
  );
}
