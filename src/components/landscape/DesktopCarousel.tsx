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
      {/* Left half: sliding strip of posts */}
      <div className="w-1/2 h-full relative overflow-hidden">
        <div
          className="h-full flex will-change-transform"
          style={{
            width: `${posts.length * 100}%`,
            transform: `translateX(calc(${-index * (100 / posts.length)}% + ${dragX * 0.5}px))`,
            transition: dragging ? "none" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {posts.map((p, i) => {
            const src = p.signedUrl || (p.mediaKey ? `/api/media/${p.mediaKey}` : null);
            const darkBgs = ["#403F3A", "#4B4A44", "#56544E", "#2B2A27"];
            const lightBgs = ["#D7CEC1", "#DFD8CE", "#E7E2DA", "#EAE6DF"];
            const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
            const bgs = isDark ? darkBgs : lightBgs;
            const bg = (p.type === "image" || p.type === "video") && src ? "#000" : bgs[i % bgs.length];
            return (
              <div key={p.id} className="h-full flex-shrink-0 relative flex items-center justify-center" style={{ width: `${100 / posts.length}%`, backgroundColor: bg }}>
                {p.type === "image" && src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                ) : p.type === "video" && src ? (
                  <video src={src} className="w-full h-full object-cover" autoPlay={i === index} muted loop playsInline />
                ) : (
                  <p className={`text-3xl font-medium text-center leading-relaxed px-12 ${isDark ? "text-white" : "text-neutral-900"}`}>{p.caption}</p>
                )}
                {/* Caption overlay on media */}
                {p.caption && p.type !== "status" && (p.type === "image" || p.type === "video") && (
                  <div className="absolute bottom-16 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-sm leading-relaxed line-clamp-3">{p.caption}</p>
                  </div>
                )}
                {/* Avatar bottom-right */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{p.author.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-white text-xs font-medium drop-shadow">{p.author.username}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right half: comments panel (static, doesn't slide) */}
      <div className="w-1/2 h-full flex flex-col bg-[var(--background)] border-l border-neutral-200 dark:border-neutral-800">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Comments</h3>
          <span className="text-xs text-neutral-400">{index + 1} / {posts.length}</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-neutral-400 text-sm text-center">No comments yet &mdash; be the first.</p>
        </div>
        <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <input placeholder="Add a comment..." className="w-full px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm outline-none placeholder-neutral-400" onClick={e => e.stopPropagation()} />
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
