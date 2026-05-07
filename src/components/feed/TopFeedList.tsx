"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { useSession } from "next-auth/react";

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  caption?: string | null;
  likeCount: number;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  _count: { likes: number; comments: number };
}

export function TopFeedList({ preview = false }: { preview?: boolean }) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed/top")
      .then((r) => r.json())
      .then((data) => {
        setPosts(preview ? (data.posts ?? []).slice(0, 10) : data.posts ?? []);
      })
      .finally(() => setLoading(false));
  }, [preview]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="py-8 text-center text-neutral-500">No posts yet today.</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewerId={session?.user.id ?? null} />
      ))}
    </div>
  );
}
