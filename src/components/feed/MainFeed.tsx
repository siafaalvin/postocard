"use client";

import { useState, useEffect, useRef } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { useOrientation } from "@/components/landscape/useOrientation";
import { LandscapeCarousel } from "@/components/landscape/LandscapeCarousel";
import { cn } from "@/lib/utils";
import type { FeedCapacity } from "@/lib/feed";

type Filter = "all" | "camera" | "status";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",    label: "All" },
  { value: "camera", label: "Camera" },
  { value: "status", label: "Status" },
];

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  caption?: string | null;
  likeCount: number;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  _count: { likes: number; comments: number };
  signedUrl?: string | null;
}

interface Props {
  userId: string;
  initialCapacity: FeedCapacity;
}

export function MainFeed({ userId, initialCapacity }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const isLandscape = useOrientation();
  const [carouselMode, setCarouselMode] = useState(false);
  const showCarousel = isLandscape || carouselMode;
    const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [atCap, setAtCap] = useState(initialCapacity.atCap);
  const generationRef = useRef(0);

  async function fetchPosts(cur: string | null, f: Filter) {
    const gen = ++generationRef.current;
    setLoading(true);

    const params = new URLSearchParams();
    if (cur) params.set("cursor", cur);
    if (f !== "all") params.set("filter", f);

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();

    if (gen !== generationRef.current) return;

    if (data.atCap) {
      setAtCap(true);
      setHasMore(false);
    } else {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p: Post) => !existingIds.has(p.id))];
      });
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchPosts(null, "all");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function changeFilter(f: Filter) {
    if (f === filter) return;
    setFilter(f);
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    setAtCap(initialCapacity.atCap);
    fetchPosts(null, f);
  }

  function loadMore() {
    if (!loading && hasMore && !atCap) fetchPosts(cursor, filter);
  }

  return (
    <div>
      {/* Filter pill bar */}
      <div className="flex gap-2 border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => changeFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === value
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {posts.length === 0 && !loading && (
        <p className="py-12 text-center text-neutral-500">
          {filter === "all"
            ? "Follow some people to see their posts here."
            : "No posts match this filter."}
        </p>
      )}

      {!isLandscape && (
        <button
          onClick={() => setCarouselMode(!carouselMode)}
          className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-3 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700"
        >
          {carouselMode ? "⊞ Timeline View" : "▶ Carousel View"}
        </button>
      )}

      {showCarousel && posts.length > 0 && (
        <LandscapeCarousel posts={posts} userId={userId} />
      )}

      {!showCarousel && posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={userId} />
      ))}

      {loading && posts.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      )}

      {hasMore && !atCap && posts.length > 0 && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
