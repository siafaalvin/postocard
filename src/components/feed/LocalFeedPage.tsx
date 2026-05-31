"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LocateFixed, Plus, Trash2, Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SavedFeed { id: string; name: string; lat: number; lng: number; radiusKm: number; slot: number; }

interface Post {
  id: string; type: string; mediaKey?: string | null; caption?: string | null;
  likeCount: number; createdAt: string; signedUrl?: string | null;
  author: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  _count: { likes: number; comments: number };
}

const ALLOWED_TIERS = new Set(["plus", "creator", "moderator", "admin"]);

export function LocalFeedPage({ userId, tier }: { userId: string; tier: string }) {
  const canSaveFeeds = ALLOWED_TIERS.has(tier);
  const [savedFeeds, setSavedFeeds] = useState<SavedFeed[]>([]);
  const [activeTab, setActiveTab] = useState<"nearby" | string>("nearby");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", lat: "", lng: "", radiusKm: "25" });
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    fetch("/api/feed/locations").then(r => r.ok ? r.json() : []).then(setSavedFeeds);
  }, []);

  function requestLocation() {
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Location access denied. Enable it in browser settings.")
    );
  }

  async function addFeed() {
    const lat = parseFloat(addForm.lat), lng = parseFloat(addForm.lng);
    if (!addForm.name.trim() || isNaN(lat) || isNaN(lng)) return;
    setAddSaving(true);
    const nextSlot = (savedFeeds[savedFeeds.length - 1]?.slot ?? 0) + 1;
    const res = await fetch("/api/feed/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addForm.name.trim(), lat, lng, radiusKm: parseFloat(addForm.radiusKm) || 25, slot: nextSlot }),
    });
    if (res.ok) {
      const feed = await res.json();
      setSavedFeeds(prev => [...prev, feed]);
      setAddForm({ name: "", lat: "", lng: "", radiusKm: "25" });
      setShowAddForm(false);
    }
    setAddSaving(false);
  }

  async function deleteFeed(id: string) {
    await fetch(`/api/feed/locations/${id}`, { method: "DELETE" });
    setSavedFeeds(prev => prev.filter(f => f.id !== id));
    if (activeTab === id) setActiveTab("nearby");
  }

  const activeFeed = activeTab === "nearby" ? null : savedFeeds.find(f => f.id === activeTab);
  const feedCoords = activeFeed ? { lat: activeFeed.lat, lng: activeFeed.lng } : coords;
  const feedRadius = activeFeed?.radiusKm ?? 25;

  return (
    <div>
      {/* Tab row */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("nearby")}
          className={cn("flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "nearby"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
          )}
        >
          <LocateFixed className="h-3.5 w-3.5" /> Nearby
        </button>
        {savedFeeds.map(feed => (
          <div key={feed.id} className="flex flex-shrink-0 items-center gap-1">
            <button
              onClick={() => setActiveTab(feed.id)}
              className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === feed.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
              )}
            >
              {feed.name}
            </button>
            <button onClick={() => deleteFeed(feed.id)} className="text-neutral-300 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {canSaveFeeds && savedFeeds.length < 10 && (
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex flex-shrink-0 items-center gap-1 rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-400 hover:border-neutral-500 dark:border-neutral-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add feed
          </button>
        )}
      </div>

      {/* Add feed form */}
      {showAddForm && (
        <div className="mb-4 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="mb-2 text-xs font-medium text-neutral-500">New location feed</p>
          <div className="flex flex-col gap-2">
            <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (e.g. Downtown)" maxLength={100}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900" />
            <div className="flex gap-2">
              <input value={addForm.lat} onChange={e => setAddForm(f => ({ ...f, lat: e.target.value }))} placeholder="Latitude" type="number"
                className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900" />
              <input value={addForm.lng} onChange={e => setAddForm(f => ({ ...f, lng: e.target.value }))} placeholder="Longitude" type="number"
                className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500 w-16">Radius {addForm.radiusKm} km</label>
              <input type="range" min={5} max={500} value={addForm.radiusKm}
                onChange={e => setAddForm(f => ({ ...f, radiusKm: e.target.value }))} className="flex-1" />
            </div>
            <button onClick={() => {
              if (coords) setAddForm(f => ({ ...f, lat: String(coords.lat), lng: String(coords.lng) }));
              else requestLocation();
            }} className="text-left text-xs text-blue-500 hover:underline">
              Use my current location
            </button>
            <Button onClick={addFeed} loading={addSaving} disabled={!addForm.name.trim() || !addForm.lat || !addForm.lng}>
              Save feed
            </Button>
          </div>
        </div>
      )}

      {/* Nearby tab content */}
      {activeTab === "nearby" && !feedCoords && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <LocateFixed className="h-8 w-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">See geotagged posts near you.</p>
          {geoError && <p className="text-xs text-red-500">{geoError}</p>}
          <Button onClick={requestLocation}>Use my location</Button>
        </div>
      )}

      {feedCoords && <LocalFeed lat={feedCoords.lat} lng={feedCoords.lng} radiusKm={feedRadius} userId={userId} key={`${feedCoords.lat},${feedCoords.lng}`} />}
    </div>
  );
}

function LocalFeed({ lat, lng, radiusKm, userId }: { lat: number; lng: number; radiusKm: number; userId: string }) {
  const fetchDone = useRef(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [atCap, setAtCap] = useState(false);

  async function load(cur?: string | null) {
    if (loading || atCap) return;
    setLoading(true);
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
    if (cur) params.set("cursor", cur);
    const res = await fetch(`/api/feed/local?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (data.atCap) { setAtCap(true); setHasMore(false); }
      else {
        setPosts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...data.posts.filter((p: Post) => !ids.has(p.id))];
        });
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (fetchDone.current) return;
    fetchDone.current = true;
    load(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && posts.length === 0) {
    return <p className="py-12 text-center text-sm text-neutral-500">No geotagged posts found nearby.</p>;
  }

  return (
    <div>
      {posts.map(post => (
        <article key={post.id} className="border-b border-neutral-100 py-4 dark:border-neutral-800">
          <div className="mb-3 flex items-center gap-2">
            <Link href={`/${post.author.username}`}>
              <Avatar src={post.author.avatarUrl} username={post.author.username} size="sm" />
            </Link>
            <div>
              <Link href={`/${post.author.username}`} className="text-sm font-semibold hover:underline">{post.author.displayName}</Link>
              <p className="text-xs text-neutral-400">@{post.author.username} · {formatRelativeTime(post.createdAt)}</p>
            </div>
          </div>
          {post.signedUrl && post.type === "image" && (
            <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <Image src={post.signedUrl} alt={post.caption ?? ""} fill className="object-cover" sizes="100vw" />
            </div>
          )}
          {post.caption && <p className="mb-2 text-sm leading-relaxed whitespace-pre-wrap">{post.caption}</p>}
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{post._count.likes}</span>
            <Link href={`/post/${post.id}`} className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />{post._count.comments}
            </Link>
          </div>
        </article>
      ))}
      {hasMore && !atCap && (
        <button onClick={() => load(cursor)} disabled={loading}
          className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
