"use client";
import { useState } from "react";
import { LandscapePostCard } from "./LandscapePostCard";
import { LandscapeOverlay } from "./LandscapeOverlay";
import { LandscapeComments } from "./LandscapeComments";

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  signedUrl?: string | null;
  caption?: string | null;
  likeCount: number;
  liked?: boolean;
  author: { username: string; avatarUrl?: string | null };
}

interface Props {
  posts: Post[];
  userId: string;
}

export function LandscapeCarousel({ posts, userId }: Props) {
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  async function toggleLike(postId: string) {
    const isLiked = likes[postId] ?? false;
    setLikes(prev => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + (isLiked ? -1 : 1) }));
    await fetch(`/api/posts/${postId}/like`, { method: isLiked ? "DELETE" : "POST" }).catch(() => {});
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto snap-y snap-mandatory" style={{WebkitOverflowScrolling: "touch"}}>
      {posts.map(post => (
        <div key={post.id} className="w-screen h-[100dvh] snap-center relative flex-shrink-0">
          <LandscapePostCard post={post} />
          <LandscapeOverlay
            author={post.author}
            likeCount={likeCounts[post.id] ?? post.likeCount}
            commentCount={0}
            liked={likes[post.id] ?? post.liked ?? false}
            onLike={() => toggleLike(post.id)}
            onComment={() => setCommentPostId(post.id)}
          />
          {commentPostId === post.id && (
            <LandscapeComments postId={post.id} onClose={() => setCommentPostId(null)} />
          )}
        </div>
      ))}
    </div>
  );
}
