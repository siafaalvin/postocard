"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

type PostType = "image" | "video" | "status";
type Visibility = "public" | "followers" | "following" | "mentioned";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export function PostForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PostType>("status");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [mentionedUsers, setMentionedUsers] = useState<UserResult[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const limit = type === "status" ? 250 : 2200;
  const remaining = limit - caption.length;
  const amberThreshold = type === "status" ? 50 : 100;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setType(f.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(f));
  }

  async function searchMentions(q: string) {
    setMentionQuery(q);
    if (!q.trim()) { setMentionResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setMentionResults(await res.json());
  }

  function addMention(user: UserResult) {
    if (mentionedUsers.find((u) => u.id === user.id)) return;
    if (mentionedUsers.length >= 20) return;
    setMentionedUsers((prev) => [...prev, user]);
    setMentionQuery("");
    setMentionResults([]);
  }

  function removeMention(id: string) {
    setMentionedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if ((type === "image" || type === "video") && !caption.trim()) {
      setError("Caption is required for image and video posts.");
      return;
    }
    if (type === "status" && caption.length > 250) {
      setError("Status updates are limited to 250 characters.");
      return;
    }
    if (visibility === "mentioned" && mentionedUsers.length === 0) {
      setError("Add at least one person to mention.");
      return;
    }

    setLoading(true);

    try {
      let mediaKey: string | undefined;
      let hasCamera = false;
      let mediaMetadata: Record<string, unknown> | undefined;

      if (file && type !== "status") {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const presignRes = await fetch("/api/posts/presign", {
          method: "POST",
          body: uploadForm,
        });

        if (!presignRes.ok) {
          const d = await presignRes.json();
          throw new Error(d.error ?? "Upload failed");
        }

        const { key } = await presignRes.json();
        mediaKey = key;

        if (type === "image") {
          const { default: exifr } = await import("exifr");
          const parsed = await exifr.parse(file).catch(() => null);
          hasCamera = !!(parsed?.Make && parsed?.Model);
          if (parsed) mediaMetadata = parsed as Record<string, unknown>;
        }

      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          mediaKey,
          caption,
          visibility,
          hasCamera,
          mediaMetadata,
          mentionedUserIds: visibility === "mentioned" ? mentionedUsers.map((u) => u.id) : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create post");
      }

      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const submitDisabled =
    (type !== "status" && !file) ||
    (type !== "status" && !caption.trim()) ||
    (visibility === "mentioned" && mentionedUsers.length === 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type selector */}
      <div className="flex rounded-xl border border-neutral-200 p-1 dark:border-neutral-800">
        {(["status", "image", "video"] as PostType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors",
              type === t
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Media upload */}
      {type !== "status" && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 py-8 text-sm text-neutral-500 hover:border-neutral-400 dark:border-neutral-700"
          >
            {preview ? (
              type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <video src={preview} className="max-h-48 rounded-lg" controls />
              )
            ) : (
              `Tap to select ${type}`
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={type === "image" ? "image/*" : "video/*"}
            onChange={handleFile}
            className="hidden"
          />
        </div>
      )}

      {/* Caption */}
      <div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={limit}
          placeholder={type === "status" ? "What's on your mind?" : "Caption (required)"}
          rows={4}
          className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-white"
        />
        <p className={cn("mt-1 text-right text-xs", remaining < amberThreshold ? "text-amber-500" : "text-neutral-400")}>
          {remaining}
        </p>
      </div>

      {/* Visibility */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Visibility</span>
        {(["public", "followers", "following", "mentioned"] as Visibility[]).map((v) => (
          <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm capitalize">
            <input
              type="radio"
              name="visibility"
              value={v}
              checked={visibility === v}
              onChange={() => setVisibility(v)}
            />
            {v}
          </label>
        ))}
      </div>

      {/* Mention list (only for "mentioned" visibility) */}
      {visibility === "mentioned" && (
        <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500">Mention up to 20 people</p>

          {/* Selected chips */}
          {mentionedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mentionedUsers.map((u) => (
                <span key={u.id} className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                  @{u.username}
                  <button type="button" onClick={() => removeMention(u.id)} className="ml-0.5 text-neutral-400 hover:text-neutral-900">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          {mentionedUsers.length < 20 && (
            <div className="relative">
              <input
                type="text"
                value={mentionQuery}
                onChange={(e) => searchMentions(e.target.value)}
                placeholder="Search by username or name…"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900"
              />
              {mentionResults.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
                  {mentionResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => addMention(u)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                        <span className="font-medium">{u.displayName}</span>
                        <span className="text-neutral-400">@{u.username}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" loading={loading} disabled={submitDisabled}>
        Post
      </Button>
    </form>
  );
}
