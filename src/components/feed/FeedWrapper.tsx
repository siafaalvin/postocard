"use client";

import { useRef, useState } from "react";
import { SeriesView } from "@/components/series/SeriesView";

const PULL_THRESHOLD = 80;
const PULL_MAX = 110;

interface Props { children: React.ReactNode; userId: string; }

export function FeedWrapper({ children, userId }: Props) {
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isVerticalRef = useRef<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    isVerticalRef.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = Math.abs(e.touches[0].clientX - startXRef.current);
    const dy = e.touches[0].clientY - startYRef.current;
    if (isVerticalRef.current === null && (dx > 6 || Math.abs(dy) > 6)) {
      isVerticalRef.current = Math.abs(dy) > dx;
    }
    if (!isVerticalRef.current) return; // horizontal swipe — let carousel handle it
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop > 2) return;
    if (dy > 0) {
      setPullY(Math.min(dy * 0.6, PULL_MAX));
    }
  }

  function onTouchEnd() {
    if (pullY >= PULL_THRESHOLD) {
      setSeriesOpen(true);
    }
    setPullY(0);
  }

  const indicatorOpacity = Math.max(0, (pullY - 20) / (PULL_THRESHOLD - 20));
  const indicatorScale = 0.8 + 0.2 * (pullY / PULL_THRESHOLD);

  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {pullY > 10 && !seriesOpen && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
          style={{ opacity: indicatorOpacity }}
        >
          <div
            className="mt-2 rounded-full bg-neutral-900/80 px-4 py-1.5 text-xs font-medium text-white backdrop-blur dark:bg-white/80 dark:text-neutral-900"
            style={{ transform: `scale(${Math.min(indicatorScale, 1)})` }}
          >
            ↓ Series
          </div>
        </div>
      )}

      {/* Feed content — translate down as user pulls */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY === 0 ? "transform 0.2s ease-out" : undefined,
        }}
      >
        {children}
      </div>

      {seriesOpen && (
        <SeriesView userId={userId} onClose={() => setSeriesOpen(false)} />
      )}
    </div>
  );
}
