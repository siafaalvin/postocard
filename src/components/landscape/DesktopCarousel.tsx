"use client";
import { createPortal } from "react-dom";
import { useState, useRef, useCallback, useEffect } from "react";
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

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
  onClose: () => void;
}

export function DesktopCarousel({ posts, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const post = posts[index];
  const mediaSrc = post?.signedUrl || (post?.mediaKey ? `/api/media/${post.mediaKey}` : null);

  function next() { setIndex(i => Math.min(i + 1, posts.length - 1)); setDragX(0); }
  function prev() { setIndex(i => Math.max(i - 1, 0)); setDragX(0); }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
    // Show controls on any movement
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  function onPointerUp() {
    if (Math.abs(dragX) > 100) {
      if (dragX < 0) next(); else prev();
    }
    setDragX(0);
    setDragging(false);
  }

  function onMouseMove() {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!post) return null;

  const content = (
    <div
      ref={containerRef}
      className="fixed top-[60px] left-0 right-0 bottom-0 z-[100] bg-black cursor-grab active:cursor-grabbing select-none"
      onMouseMove={onMouseMove}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Dual view: media left, text right */}
      <div
        className="w-full h-full flex transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${dragX * 0.3}px)` }}
      >
        {/* Left panel: media or colored bg */}
        <div className="w-1/2 h-full flex items-center justify-center bg-neutral-900 overflow-hidden">
          {post.type === "image" && mediaSrc ? (
            <img src={mediaSrc} alt="" className="max-w-full max-h-full object-contain" draggable={false} />
          ) : post.type === "video" && mediaSrc ? (
            <video src={mediaSrc} className="max-w-full max-h-full object-contain" autoPlay muted loop playsInline />
          ) : (
            <div className="p-12 flex items-center justify-center">
              <p className="text-3xl font-medium text-white text-center leading-relaxed">{post.caption}</p>
            </div>
          )}
        </div>

        {/* Right panel: metadata + text */}
        <div className="w-1/2 h-full flex flex-col justify-center px-12 bg-[var(--background)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center font-bold text-sm">
              {post.author.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm">{post.author.username}</span>
          </div>
          {post.caption && post.type !== "status" && (
            <p className="text-lg leading-relaxed text-[var(--foreground)]">{post.caption}</p>
          )}
          {post.type === "status" && (
            <p className="text-2xl font-medium leading-relaxed text-[var(--foreground)]">{post.caption}</p>
          )}
          <div className="flex items-center gap-4 mt-8 text-neutral-500">
            <span className="flex items-center gap-1"><Heart size={18} /> {post.likeCount}</span>
          </div>
          <p className="text-xs text-neutral-400 mt-4">{index + 1} / {posts.length}</p>
        </div>
      </div>

      {/* Controls - visible on mouse move */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Close */}
        <button onClick={onClose} className="pointer-events-auto absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
          <X size={20} />
        </button>

        {/* Nav arrows */}
        {index > 0 && (
          <button onClick={prev} className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
            <ChevronLeft size={24} />
          </button>
        )}
        {index < posts.length - 1 && (
          <button onClick={next} className="pointer-events-auto absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return content;
  return createPortal(content, document.body);
}
