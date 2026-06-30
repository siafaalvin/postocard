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
    fetch("/api/posts?limit=50")
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
      {/* Post content */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.25s ease-out",
        }}
      >
        {post.type === "image" && mediaSrc ? (
          <img src={mediaSrc} alt="" className="w-full h-full object-contain" draggable={false} />
        ) : post.type === "video" && mediaSrc ? (
          <video src={mediaSrc} className="w-full h-full object-contain" autoPlay muted loop playsInline />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6">
            <p className="text-xl text-white text-center leading-relaxed">{post.caption}</p>
          </div>
        )}
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
