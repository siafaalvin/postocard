"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Heart, MessageCircle, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Toast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/utils";

interface Author { id: string; username: string; displayName: string; avatarUrl?: string | null; }
interface Post {
  id: string; type: string; mediaKey?: string | null; caption?: string | null;
  likeCount: number; createdAt: string; signedUrl?: string | null;
  author: Author; _count: { likes: number; comments: number };
}

interface Props { onClose: () => void; userId: string; }

export function SeriesView({ onClose, userId }: Props) {
  const fetchDone = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const current = posts[index];

  const loadMore = useCallback(async (cur?: string | null) => {
    setLoading(true);
    const url = cur ? `/api/feed/series?cursor=${cur}` : "/api/feed/series";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...data.posts.filter((p: Post) => !ids.has(p.id))];
      });
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (fetchDone.current) return;
    fetchDone.current = true;
    loadMore(null);
  }, [loadMore]);

  // Fetch next batch when nearing end
  useEffect(() => {
    if (posts.length > 0 && index >= posts.length - 5 && cursor) {
      loadMore(cursor);
    }
  }, [index, posts.length, cursor, loadMore]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex(i => Math.min(i + 1, posts.length - 1));
      if (e.key === "ArrowLeft")  setIndex(i => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, posts.length]);

  // Auto-reset video when post changes
  useEffect(() => {
    videoRef.current?.load();
  }, [index]);

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) setIndex(i => Math.max(i - 1, 0));
    else          setIndex(i => Math.min(i + 1, posts.length - 1));
  }

  async function toggleLike() {
    if (!current) return;
    const isLiked = liked[current.id];
    await fetch(`/api/posts/${current.id}/like`, { method: isLiked ? "DELETE" : "POST" });
    setLiked(l => ({ ...l, [current.id]: !isLiked }));
  }

  if (loading && posts.length === 0) {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-neutral-400">No posts in series.</p>
        <button onClick={onClose} className="text-sm underline">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-60 bg-black select-none" style={{ zIndex: 60 }}>
      {/* Progress bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex gap-0.5 p-2">
        {posts.map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= index ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-8 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        <Link href={`/${current.author.username}`} onClick={onClose} className="flex items-center gap-2">
          <Avatar src={current.author.avatarUrl} username={current.author.username} size="sm" />
          <div>
            <p className="text-sm font-semibold text-white">{current.author.displayName}</p>
            <p className="text-xs text-white/70">{formatRelativeTime(current.createdAt)}</p>
          </div>
        </Link>
        <button onClick={onClose} className="rounded-full bg-black/40 p-2 text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Media — tappable to advance */}
      <div className="absolute inset-0" onClick={handleTap}>
        {current.signedUrl && current.type === "image" && (
          <Image src={current.signedUrl} alt={current.caption ?? ""} fill className="object-cover" sizes="100vw" priority />
        )}
        {current.signedUrl && current.type === "video" && (
          <video
            ref={videoRef}
            src={current.signedUrl}
            className="h-full w-full object-cover"
            autoPlay playsInline muted
            onEnded={() => setIndex(i => Math.min(i + 1, posts.length - 1))}
          />
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-4 pb-10 pt-16 bg-gradient-to-t from-black/70 to-transparent">
        {current.caption && (
          <p className="mb-3 text-sm text-white/90 line-clamp-3 whitespace-pre-wrap">{current.caption}</p>
        )}
        <div className="flex items-center gap-5">
          <button onClick={toggleLike} className="flex flex-col items-center gap-0.5">
            <Heart className={`h-6 w-6 ${liked[current.id] ? "fill-red-400 text-red-400" : "text-white"}`} />
            <span className="text-xs text-white/80">{current._count.likes + (liked[current.id] ? 1 : 0)}</span>
          </button>
          <Link href={`/post/${current.id}`} onClick={onClose} className="flex flex-col items-center gap-0.5">
            <MessageCircle className="h-6 w-6 text-white" />
            <span className="text-xs text-white/80">{current._count.comments}</span>
          </Link>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${current.id}`); setCopied(true); }}>
            <Link2 className="h-6 w-6 text-white" />
          </button>

          {/* Author avatars of remaining users */}
          <div className="ml-auto flex gap-1 overflow-hidden">
            {Array.from(new Map(posts.slice(index + 1, index + 6).map(p => [p.author.id, p.author])).values()).map(author => (
              <button key={author.id} onClick={() => {
                const idx = posts.findIndex((p, i) => i > index && p.author.id === author.id);
                if (idx !== -1) setIndex(idx);
              }}>
                <Avatar src={author.avatarUrl} username={author.username} size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {copied && <Toast message="Link copied!" onDone={() => setCopied(false)} />}
    </div>
  );
}
