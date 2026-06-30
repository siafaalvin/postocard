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

export default function LandscapeFeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [index, setIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);

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

  const post = posts[index];
  const mediaSrc = post?.signedUrl || (post?.mediaKey ? `/api/media/${post.mediaKey}` : null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    setOffsetX(e.touches[0].clientX - startX.current);
  }
  function onTouchEnd() {
    if (Math.abs(offsetX) > 60) {
      if (offsetX < 0 && index < posts.length - 1) setIndex(i => i + 1);
      if (offsetX > 0 && index > 0) setIndex(i => i - 1);
    }
    setOffsetX(0);
    setSwiping(false);
  }

  if (posts.length === 0) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><p className="text-white/50">Loading...</p></div>;
  }
  if (!post) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><p className="text-white/50">No more posts</p></div>;
  }

  return (
    <div
      className="fixed inset-0 bg-black z-[9999] touch-none select-none"
      style={{ width: "100dvw", height: "100dvh" }}
      onClick={() => setShowOverlay(p => !p)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Post strip - shows prev/current/next for smooth swipe */}
      <div
        className="absolute inset-0 flex"
        style={{
          width: `${posts.length * 100}%`,
          transform: `translateX(calc(-${index * (100 / posts.length)}% + ${offsetX}px))`,
          transition: swiping ? "none" : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {posts.map((p) => {
          const src = p.signedUrl || (p.mediaKey ? `/api/media/${p.mediaKey}` : null);
          return (
            <div key={p.id} className="h-full flex-shrink-0 flex items-center justify-center" style={{ width: `${100 / posts.length}%` }}>
              {p.type === "image" && src ? (
                <img src={src} alt="" className="w-full h-full object-contain" draggable={false} />
              ) : p.type === "video" && src ? (
                <video src={src} className="w-full h-full object-contain" autoPlay={false} muted loop playsInline />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 bg-neutral-900">
                  <p className="text-xl text-white text-center leading-relaxed max-w-md">{p.caption}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right overlay on tap */}
      {showOverlay && (
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
      )}

      {/* Progress */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
        {posts.slice(Math.max(0, index - 4), index + 5).map((p) => (
          <div key={p.id} className={`rounded-full ${p.id === post.id ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
}
