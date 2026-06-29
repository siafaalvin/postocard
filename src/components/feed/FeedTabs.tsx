"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainFeed } from "@/components/feed/MainFeed";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";
import { LocalFeedPage } from "@/components/feed/LocalFeedPage";
import { ViewExtensionBanner } from "@/components/feed/ViewExtensionBanner";
import type { FeedCapacity } from "@/lib/feed";
import { cn } from "@/lib/utils";

const TABS = ["Main", "Activity", "Local"] as const;
type TabName = (typeof TABS)[number];
const TAB_PARAM: Record<TabName, string | null> = { Main: null, Activity: "activity", Local: "local" };

interface Props {
  userId: string;
  tier: string;
  initialCapacity: FeedCapacity;
}

export function FeedTabs({ userId, tier, initialCapacity }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const initialIndex = tabParam === "activity" ? 1 : tabParam === "local" ? 2 : 0;

  const [active, setActive] = useState(initialIndex);
  // Track which panels have been visited so we lazy-mount their content
  const [visited, setVisited] = useState(() => new Set([initialIndex]));
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  function changeTab(i: number) {
    setActive(i);
    setVisited((v) => new Set([...v, i]));
    const param = TAB_PARAM[TABS[i]];
    const next = param ? `/feed?tab=${param}` : "/feed";
    router.replace(next, { scroll: false });
  }

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontal.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);
    if (isHorizontal.current === null && (Math.abs(dx) > 6 || dy > 6)) {
      isHorizontal.current = Math.abs(dx) > dy;
    }
    if (isHorizontal.current) setDragX(dx);
  }

  function onTouchEnd() {
    if (isHorizontal.current) {
      if (dragX < -50 && active < TABS.length - 1) changeTab(active + 1);
      else if (dragX > 50 && active > 0) changeTab(active - 1);
    }
    setDragX(0);
    isHorizontal.current = null;
  }

  const dragPct = typeof window !== "undefined" ? (dragX / window.innerWidth) * 100 : 0;
  const translateX = -(active * 100) + dragPct;

  return (
    <div>
      {/* Tab bar — sticky under navbar */}
      <div data-feedtabs="" className="sticky top-14 z-40 flex border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => changeTab(i)}
            className={cn(
              "relative flex-1 py-2.5 text-sm font-medium transition-colors",
              active === i
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            {tab}
            {active === i && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-neutral-900 dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* Carousel panels */}
      <div className="overflow-hidden">
        <div
          className="flex w-full"
          style={{
            transform: `translateX(${translateX}%)`,
            transition: dragX === 0 ? "transform 0.25s ease" : "none",
            willChange: "transform",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Panel 0 — Main feed */}
          <div className="w-full flex-shrink-0 min-w-0">
            {initialCapacity.atCap && <ViewExtensionBanner />}
            <MainFeed initialCapacity={initialCapacity} userId={userId} />
          </div>

          {/* Panel 1 — Activity (notifications) — lazy mounted */}
          <div className="w-full flex-shrink-0 min-w-0">
            {visited.has(1) && <NotificationFeed />}
          </div>

          {/* Panel 2 — Local feed — lazy mounted */}
          <div className="w-full flex-shrink-0 min-w-0">
            {visited.has(2) && <LocalFeedPage userId={userId} tier={tier} />}
          </div>
        </div>
      </div>
    </div>
  );
}
