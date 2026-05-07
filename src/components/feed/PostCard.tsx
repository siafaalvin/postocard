"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Link2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Toast } from "@/components/ui/Toast";
import { FlagIcon } from "@/components/flags/FlagIcon";
import { formatRelativeTime } from "@/lib/utils";

interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface PostCardProps {
  post: {
    id: string;
    type: string;
    mediaKey?: string | null;
    caption?: string | null;
    likeCount: number;
    createdAt: string | Date;
    author: Author;
    _count?: { likes: number; comments: number };
    signedUrl?: string | null;
  };
  viewerId?: string | null;
}

export function PostCard({ post, viewerId }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [copied, setCopied] = useState(false);

  async function toggleLike() {
    if (!viewerId) return;
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post.id}/like`, { method });
    if (res.ok) {
      setLiked((l) => !l);
      setLikeCount((c) => c + (liked ? -1 : 1));
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
  }

  return (
    <article className="border-b border-neutral-100 py-4 dark:border-neutral-800">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} username={post.author.username} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/${post.author.username}`} className="font-semibold hover:underline truncate">
              {post.author.displayName}
            </Link>
            <FlagIcon targetUserId={post.author.id} viewerId={viewerId ?? null} />
          </div>
          <p className="text-xs text-neutral-500">
            @{post.author.username} · {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Media */}
      {post.type === "image" && post.signedUrl && (
        <Link href={`/post/${post.id}`}>
          <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Image src={post.signedUrl} alt={post.caption ?? ""} fill className="object-cover" sizes="100vw" />
          </div>
        </Link>
      )}

      {post.type === "video" && post.signedUrl && (
        <video
          src={post.signedUrl}
          controls
          muted
          playsInline
          className="mb-3 w-full rounded-xl bg-black"
        />
      )}

      {/* Caption */}
      {post.caption && (
        <p className="mb-3 text-sm leading-relaxed whitespace-pre-wrap">
          <Link href={`/${post.author.username}`} className="font-semibold">
            {post.author.username}
          </Link>{" "}
          {post.caption}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 text-neutral-500">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1 text-sm hover:text-neutral-900 dark:hover:text-white"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1 text-sm hover:text-neutral-900 dark:hover:text-white"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post._count?.comments ?? 0}</span>
        </Link>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 text-sm hover:text-neutral-900 dark:hover:text-white"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>

      {copied && <Toast message="Copied!" onDone={() => setCopied(false)} />}
    </article>
  );
}
