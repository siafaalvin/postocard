"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  signedUrl?: string | null;
  caption?: string | null;
  likeCount: number;
  author: { username: string; avatarUrl?: string | null };
}

// Rotating background colors for text-only posts
const darkBgs = ["#403F3A", "#4B4A44", "#56544E", "#2B2A27"];
const lightBgs = ["#D7CEC1", "#DFD8CE", "#E7E2DA", "#EAE6DF"];

export default function LandscapeFeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [index, setIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const startX = useRef(0);
  const startTime = useRef(0);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Detect orientation - if portrait, go back to feed
  useEffect(() => {
    function check() {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isPortrait) router.replace("/feed");
    }
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 200));
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [router]);

  // Fetch posts
  useEffect(() => {
    fetch("/api/posts?limit=50&skipCount=true")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPosts(d); else if (d?.posts) setPosts(d.posts); else if (Array.isArray(d?.data)) setPosts(d.data); })
      .catch(() => {});
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startTime.current = Date.now();
    setSwiping(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    setOffsetX(e.touches[0].clientX - startX.current);
  }
  function onTouchEnd() {
    const velocity = Math.abs(offsetX) / (Date.now() - startTime.current);
    const threshold = velocity > 0.3 ? 30 : 60; // faster swipe = lower threshold
    if (Math.abs(offsetX) > threshold) {
      if (offsetX < 0 && index < posts.length - 1) setIndex(i => i + 1);
      if (offsetX > 0 && index > 0) setIndex(i => i - 1);
    }
    setOffsetX(0);
    setSwiping(false);
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ width: "100dvw", height: "100dvh" }}>
        <p className="text-white/50">Loading...</p>
      </div>
    );
  }

  const post = posts[index];
  if (!post) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ width: "100dvw", height: "100dvh" }}>
        <p className="text-white/50">No more posts</p>
      </div>
    );
  }

  const bgs = isDark ? darkBgs : lightBgs;
  const textColor = isDark ? "text-white" : "text-neutral-900";

  return (
    <div
      className="fixed inset-0 z-[9999] touch-none select-none overflow-hidden"
      style={{ width: "100dvw", height: "100dvh", background: "transparent" }}
      onClick={() => setShowOverlay(p => !p)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Full-width strip: each slide is 100vw. The entire strip translates. */}
      <div
        className="h-full flex will-change-transform"
        style={{
          width: `${posts.length * 100}vw`,
          transform: `translateX(calc(${-index * 100}vw + ${offsetX}px))`,
          transition: swiping ? "none" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {posts.map((p, i) => {
          const src = p.signedUrl || (p.mediaKey ? `/api/media/${p.mediaKey}` : null);
          const bg = (p.type === "image" || p.type === "video") && src ? "#000" : bgs[i % bgs.length];
          return (
            <div
              key={p.id}
              className="h-full flex-shrink-0 flex items-center justify-center relative"
              style={{ width: "100vw", backgroundColor: bg }}
            >
              {p.type === "image" && src ? (
                <img src={src} alt="" className="w-full h-full object-contain" draggable={false} />
              ) : p.type === "video" && src ? (
                <video src={src} className="w-full h-full object-contain" autoPlay={i === index} muted loop playsInline />
              ) : (
                <p className={`text-xl ${textColor} text-center leading-relaxed max-w-lg px-8`}>{p.caption}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay on tap */}
      {showOverlay && (
        <>
          {/* Navigation chevrons */}
          {index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {index < posts.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }} className="absolute right-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}

          {/* Right side actions */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{post.author.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex flex-col items-center">
              <Heart size={22} className="text-white" />
              <span className="text-[9px] text-white mt-0.5">{post.likeCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle size={22} className="text-white" />
              <span className="text-[9px] text-white mt-0.5">0</span>
            </div>
          </div>

          {/* Post counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/60 z-10 bg-black/30 px-2 py-0.5 rounded-full">
            {index + 1} / {posts.length}
          </div>
        </>
      )}
    </div>
  );
}
