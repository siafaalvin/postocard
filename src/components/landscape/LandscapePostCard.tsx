"use client";

interface Post {
  id: string;
  type: string;
  mediaKey?: string | null;
  signedUrl?: string | null;
  caption?: string | null;
  author: { username: string; avatarUrl?: string | null };
}

export function LandscapePostCard({ post }: { post: Post }) {
  const mediaSrc = post.signedUrl || (post.mediaKey ? `/api/media/${post.mediaKey}` : null);

  if (post.type === "image" && mediaSrc) {
    return (
      <div className="w-full h-full relative bg-black">
        <img src={mediaSrc} alt={post.caption ?? ""} className="absolute inset-0 w-full h-full object-contain" />
      </div>
    );
  }

  if (post.type === "video" && mediaSrc) {
    return (
      <div className="w-full h-full relative bg-black">
        <video src={mediaSrc} className="absolute inset-0 w-full h-full object-contain" autoPlay muted loop playsInline />
      </div>
    );
  }

  // Text/status post - centered text on theme background
  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-[var(--background)]">
      <p className="text-2xl md:text-4xl font-medium text-center text-[var(--foreground)] leading-relaxed max-w-2xl">
        {post.caption}
      </p>
    </div>
  );
}
