"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "@/components/feed/PostCard";
import type { FeedCapacity } from "@/lib/feed";

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [atCap, setAtCap] = useState(initialCapacity.atCap);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || atCap) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/posts?${params}`);
    const data = await res.json();

    if (data.atCap) {
      setAtCap(true);
      setHasMore(false);
    } else {
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    }

    setLoading(false);
  }, [loading, hasMore, atCap, cursor]);

  useEffect(() => {
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (posts.length === 0 && !loading) {
    return (
      <p className="py-12 text-center text-neutral-500">
        Follow some people to see their posts here.
      </p>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={userId} />
      ))}

      {hasMore && !atCap && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}

      {loading && posts.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
      )}
    </div>
  );
}
