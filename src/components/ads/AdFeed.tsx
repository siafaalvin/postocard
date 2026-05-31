"use client";

import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { ExternalLink, Archive } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  body: string;
  ctaUrl: string | null;
  imageUrl: string | null;
  source: string;
  read: boolean;
  createdAt: string;
}

export function AdFeed() {
  const fetchDone = useRef(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load(cursor?: string) {
    setLoading(true);
    const url = cursor ? `/api/ads?cursor=${cursor}` : "/api/ads";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setAds((prev) => {
        const existing = new Set(prev.map((a) => a.id));
        return [...prev, ...data.ads.filter((a: Ad) => !existing.has(a.id))];
      });
      setNextCursor(data.nextCursor);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (fetchDone.current) return;
    fetchDone.current = true;
    load();
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }

  async function archive(id: string) {
    await fetch(`/api/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    setAds((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => prev === id ? null : id);
    markRead(id);
  }

  if (!loading && ads.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <p className="text-sm">No ads yet — check back later.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      {ads.map((ad) => (
        <div key={ad.id} className="py-3">
          <button
            onClick={() => toggleExpand(ad.id)}
            className="flex w-full items-start gap-3 text-left"
          >
            {!ad.read && (
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
            )}
            <div className={`flex-1 ${ad.read ? "pl-5" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{ad.source}</span>
                <span className="text-xs text-neutral-400">{formatRelativeTime(ad.createdAt)}</span>
              </div>
              <p className="mt-0.5 font-medium text-sm">{ad.title}</p>
              {expandedId !== ad.id && (
                <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{ad.body}</p>
              )}
            </div>
          </button>

          {expandedId === ad.id && (
            <div className="mt-2 ml-5 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
              {ad.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.imageUrl} alt="" className="mb-3 w-full rounded-lg object-cover" />
              )}
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{ad.body}</p>
              <div className="mt-3 flex items-center gap-3">
                {ad.ctaUrl && (
                  <a
                    href={ad.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
                  >
                    Learn more <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => archive(ad.id)}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {nextCursor && (
        <button
          onClick={() => load(nextCursor)}
          disabled={loading}
          className="py-3 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-white"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
