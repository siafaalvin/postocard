"use client";
import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";

interface Props {
  author: { username: string; avatarUrl?: string | null };
  likeCount: number;
  commentCount: number;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
}

export function LandscapeOverlay({ author, likeCount, commentCount, liked, onLike, onComment }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="absolute inset-0 z-10" onClick={() => setVisible(!visible)}>
      {visible && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 animate-in fade-in duration-200">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-white overflow-hidden">
            {author.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {author.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Like */}
          <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-1">
            <Heart size={28} className={liked ? "fill-red-500 text-red-500" : "text-white"} />
            <span className="text-xs text-white font-medium">{likeCount}</span>
          </button>

          {/* Comment */}
          <button onClick={(e) => { e.stopPropagation(); onComment(); }} className="flex flex-col items-center gap-1">
            <MessageCircle size={28} className="text-white" />
            <span className="text-xs text-white font-medium">{commentCount}</span>
          </button>
        </div>
      )}
    </div>
  );
}
