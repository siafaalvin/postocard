"use client";
import { useState, useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  author: { username: string };
  createdAt: string;
}

interface Props {
  postId: string;
  onClose: () => void;
}

export function LandscapeComments({ postId, onClose }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setComments(d); })
      .catch(() => {});
  }, [postId]);

  async function submitReply() {
    if (!reply.trim()) return;
    setSending(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setReply("");
    }
    setSending(false);
  }

  function handleReplyFocus() {
    if (isMobile) {
      setShowRotatePrompt(true);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      {/* Blur background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Comment carousel */}
      <div className="relative z-40 w-full max-w-lg h-[70vh] flex flex-col bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <h3 className="text-white font-semibold text-sm">Comments</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Comments scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-white/50 text-sm text-center py-8">No comments yet</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="snap-center">
              <p className="text-white text-sm">
                <span className="font-semibold">{c.author.username}</span>{" "}
                {c.text}
              </p>
            </div>
          ))}
        </div>

        {/* Reply field - desktop only in landscape, mobile shows rotate prompt */}
        {!isMobile ? (
          <div className="border-t border-white/20 px-4 py-3 flex gap-2">
            <input
              ref={inputRef}
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitReply()}
              placeholder="Add a comment..."
              className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 placeholder-white/40 outline-none"
            />
            <button onClick={submitReply} disabled={sending || !reply.trim()} className="text-sm font-semibold text-white disabled:opacity-40">
              Post
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRotatePrompt(true)}
            className="border-t border-white/20 px-4 py-3 text-sm text-white/60 text-center"
          >
            Tap to reply...
          </button>
        )}
      </div>

      {/* Rotate prompt for mobile */}
      {showRotatePrompt && isMobile && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4" onClick={() => setShowRotatePrompt(false)}>
          <RotateCcw size={48} className="text-white animate-pulse" />
          <p className="text-white text-lg font-medium">Rotate to portrait to reply</p>
          <p className="text-white/60 text-sm">The keyboard and text field will appear in portrait mode</p>
        </div>
      )}
    </div>
  );
}
