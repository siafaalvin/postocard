"use client";

import { useEffect, useRef, useState } from "react";

interface MapPost {
  id: string;
  lat: number;
  lng: number;
  likeCount: number;
  caption?: string | null;
  type: string;
  author: { username: string; displayName: string };
}

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<MapPost[]>([]);
  const [selected, setSelected] = useState<MapPost | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let mapInstance: { remove: () => void } | null = null;

    async function initMap() {
      const maplibre = await import("maplibre-gl");
      // CSS loaded via link tag in layout

      if (!mapRef.current) return;

      const map = new maplibre.Map({
        container: mapRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [0, 20],
        zoom: 2,
      });

      mapInstance = map;

      map.on("load", () => {
        setMapLoaded(true);
      });

      map.on("moveend", async () => {
        const bounds = map.getBounds();
        const params = new URLSearchParams({
          north: String(bounds.getNorth()),
          south: String(bounds.getSouth()),
          east: String(bounds.getEast()),
          west: String(bounds.getWest()),
        });
        const res = await fetch(`/api/feed/map?${params}`);
        const data = await res.json();
        setPosts(data.posts ?? []);
      });
    }

    initMap();
    return () => mapInstance?.remove();
  }, []);

  return (
    <div className="relative h-[calc(100vh-64px)] w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* Simple post markers overlay — full MapLibre marker API requires more setup */}
      {posts.slice(0, 5).length > 0 && (
        <div className="absolute left-4 top-4 z-10 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl bg-white/90 p-2 text-xs shadow dark:bg-neutral-900/90">
          <p className="font-medium">{posts.length} posts in view</p>
          {posts.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="truncate text-left text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
            >
              @{p.author.username}: {p.caption ?? p.type}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="absolute bottom-4 left-1/2 z-10 w-72 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900">
          <p className="font-semibold">@{selected.author.username}</p>
          {selected.caption && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{selected.caption}</p>}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-neutral-500">♥ {selected.likeCount}</span>
            <a href={`/post/${selected.id}`} className="text-blue-500 hover:underline">View post</a>
          </div>
          <button onClick={() => setSelected(null)} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-900">×</button>
        </div>
      )}
    </div>
  );
}
