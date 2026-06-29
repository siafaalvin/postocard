"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Heart, MessageCircle } from "lucide-react";
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
}

export function MobileCarousel({ posts }: Props) {
  const [index, setIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startTime = useRef(0);

  const post = posts[index];
  const mediaSrc = post?.signedUrl || (post?.mediaKey ? `/api/media/${post.mediaKey}` : null);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startTime.current = Date.now();
    setSwiping(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffsetX(dx);
  }

  function onTouchEnd() {
    const velocity = Math.abs(offsetX) / (Date.now() - startTime.current);
    if (Math.abs(offsetX) > 80 || velocity > 0.5) {
      if (offsetX < 0 && index < posts.length - 1) setIndex(i => i + 1);
      if (offsetX > 0 && index > 0) setIndex(i => i - 1);
    }
    setOffsetX(0);
    setSwiping(false);
  }

  function handleTap() {
    setShowOverlay(prev => !prev);
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <p className="text-white/50">No posts to show</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden" onClick={handleTap}>
      {/* Post content - horizontal swipe */}
      <div
        className="w-full h-full"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {post.type === "image" && mediaSrc ? (
          <img src={mediaSrc} alt="" className="w-full h-full object-contain" draggable={false} />
        ) : post.type === "video" && mediaSrc ? (
          <video src={mediaSrc} className="w-full h-full object-contain" autoPlay muted loop playsInline />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8">
            <p className="text-2xl md:text-4xl font-medium text-center text-white leading-relaxed max-w-lg">
              {post.caption}
            </p>
          </div>
        )}
      </div>

      {/* Right-side overlay (shows on tap) */}
      {showOverlay && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-10" onClick={e => e.stopPropagation()}>
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-neutral-800 border-2 border-white flex items-center justify-center">
            <span className="text-white font-bold">{post.author.username.charAt(0).toUpperCase()}</span>
          </div>

          {/* Like */}
          <div className="flex flex-col items-center gap-0.5">
            <Heart size={26} className="text-white" />
            <span className="text-[10px] text-white">{post.likeCount}</span>
          </div>

          {/* Comment */}
          <button onClick={(e) => { e.stopPropagation(); setCommentPostId(post.id); }}>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle size={26} className="text-white" />
              <span className="text-[10px] text-white">0</span>
            </div>
          </button>
        </div>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {posts.slice(Math.max(0, index - 3), index + 4).map((p, i) => (
          <div
            key={p.id}
            className={`rounded-full transition-all ${p.id === post.id ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
          />
        ))}
      </div>

      {/* Comments overlay */}
      {commentPostId && (
        <LandscapeComments postId={commentPostId} onClose={() => setCommentPostId(null)} />
      )}
    </div>
  );
}
