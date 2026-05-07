"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type PostType = "image" | "video" | "status";

export function PostForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PostType>("status");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setType(f.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let mediaKey: string | undefined;
      let hasCamera = false;
      let mediaMetadata: Record<string, unknown> | undefined;

      if (file && type !== "status") {
        // Get presigned URL
        const presignRes = await fetch("/api/posts/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        });

        if (!presignRes.ok) {
          const d = await presignRes.json();
          throw new Error(d.error ?? "Failed to get upload URL");
        }

        const { url, key } = await presignRes.json();
        mediaKey = key;

        // EXIF extraction for images (client-side, dynamic import)
        if (type === "image") {
          const { default: exifr } = await import("exifr");
          const parsed = await exifr.parse(file).catch(() => null);
          hasCamera = !!(parsed?.Make && parsed?.Model);
          if (parsed) mediaMetadata = parsed as Record<string, unknown>;
        }

        // Upload to S3
        await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, mediaKey, caption, visibility, hasCamera, mediaMetadata }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const remaining = 2200 - caption.length;

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
          maxLength={2200}
          placeholder={type === "status" ? "What's on your mind?" : "Caption (optional)"}
          rows={4}
          className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-white"
        />
        <p className={cn("mt-1 text-right text-xs", remaining < 100 ? "text-amber-500" : "text-neutral-400")}>
          {remaining}
        </p>
      </div>

      {/* Visibility */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Visibility</span>
        {(["public", "followers"] as const).map((v) => (
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        type="submit"
        loading={loading}
        disabled={type !== "status" && !file}
      >
        Post
      </Button>
    </form>
  );
}
