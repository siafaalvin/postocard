import type { Metadata } from "next";
import { TopFeedList } from "@/components/feed/TopFeedList";

export const metadata: Metadata = { title: "Top posts" };

export default function TopPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Today&apos;s top 100</h1>
      <TopFeedList />
    </div>
  );
}
