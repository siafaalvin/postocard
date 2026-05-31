"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/utils";

interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  caption?: string | null;
  likeCount: number;
  createdAt: Date | string;
  author: Author;
  _count?: { likes: number; comments: number };
}

interface Comment {
  id: string;
  body: string;
  commentLikeCount: number;
  createdAt: string;
  author: Author;
  _count: { replies: number };
}

interface Props {
  post: Post;
  viewerId: string | null;
}

export function PostDetail({ post, viewerId }: Props) {
  const searchParams = useSearchParams();
  const targetCommentId = searchParams.get("c");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [copied, setCopied] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then(setComments);
  }, [post.id]);

  useEffect(() => {
    if (!targetCommentId || comments.length === 0) return;
    setTimeout(() => {
      commentRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [targetCommentId, comments]);

  async function toggleLike() {
    if (!viewerId) return;
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post.id}/like`, { method });
    if (res.ok) {
      setLiked((l) => !l);
      setLikeCount((c) => c + (liked ? -1 : 1));
    }
  }

  async function submitComment() {
    if (!newComment.trim() || !viewerId) return;
    setSubmitting(true);
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setNewComment("");
    }
    setSubmitting(false);
  }

  return (
    <div>
      {/* Author header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/${post.author.username}`}>
          <Avatar src={post.author.avatarUrl} username={post.author.username} size="lg" />
        </Link>
        <div>
          <Link href={`/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.displayName}
          </Link>
          <p className="text-sm text-neutral-500">@{post.author.username} · {formatRelativeTime(post.createdAt)}</p>
        </div>
      </div>

      {/* Media */}
      {post.type === "image" && (
        <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Image src={`/api/media/${post.mediaKey}`} alt={post.caption ?? ""} fill className="object-cover" sizes="100vw" />
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <p className="mb-4 text-sm leading-relaxed whitespace-pre-wrap">{post.caption}</p>
      )}

      {/* Actions */}
      <div className="mb-6 flex items-center gap-4 text-neutral-500">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm">
          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <span className="flex items-center gap-1.5 text-sm">
          <MessageCircle className="h-5 w-5" />
          <span>{comments.length}</span>
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); }}
          className="flex items-center gap-1.5 text-sm"
        >
          <Link2 className="h-5 w-5" />
        </button>
      </div>

      {/* Comments */}
      <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
        {comments.map((c) => {
          const isTarget = c.id === targetCommentId;
          return (
            <div
              key={c.id}
              ref={isTarget ? commentRef : undefined}
              id={`c-${c.id}`}
              className={`mb-4 rounded-xl p-3 transition-colors ${isTarget ? "ring-2 ring-amber-400" : ""}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <Avatar src={c.author.avatarUrl} username={c.author.username} size="sm" />
                <Link href={`/${c.author.username}`} className="text-sm font-semibold hover:underline">
                  {c.author.username}
                </Link>
                <span className="text-xs text-neutral-400">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="ml-9 text-sm">{c.body}</p>
              <div className="ml-9 mt-1 flex items-center gap-3">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/post/${post.id}?c=${c.id}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                  }}
                  className="flex items-center text-neutral-400 hover:text-neutral-700"
                >
                  <Link2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment box */}
      {viewerId && (
        <div className="mt-4 flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900"
          />
          <Button onClick={submitComment} loading={submitting} disabled={!newComment.trim()}>
            Post
          </Button>
        </div>
      )}

      {copied && <Toast message="Link copied!" onDone={() => setCopied(false)} />}
    </div>
  );
}
