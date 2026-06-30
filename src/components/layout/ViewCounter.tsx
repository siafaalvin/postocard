"use client";
import { useState, useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";

export function ViewCounter() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const prevRemaining = useRef<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [atCap, setAtCap] = useState(false);

  useEffect(() => {
    async function fetchRemaining() {
      try {
        const res = await fetch("/api/feed/remaining");
        if (res.ok) {
          const data = await res.json();
          if (prevRemaining.current !== null && data.remaining !== prevRemaining.current) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 600);
          }
          prevRemaining.current = data.remaining;
          setRemaining(data.remaining);
          setTotal(data.total);
          setAtCap(data.atCap);
        }
      } catch {}
    }
    fetchRemaining();
    const interval = setInterval(fetchRemaining, 30000);
    return () => clearInterval(interval);
  }, []);

  const [showUpgrade, setShowUpgrade] = useState(false);

  if (remaining === null && !atCap) return null;

  const pct = total ? Math.round(((remaining ?? 0) / total) * 100) : 100;
  const color = pct > 50 ? "text-green-600" : pct > 20 ? "text-amber-500" : "text-red-500";

  // Full viewport overlay when at cap
  if (atCap) {
    return (
      <div className="fixed inset-0 top-[60px] z-[90] flex items-center justify-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
        <div className="text-center space-y-4 p-6 max-w-sm">
          <Eye size={40} className="mx-auto text-neutral-400" />
          <h2 className="text-xl font-bold">Daily view limit reached</h2>
          <p className="text-sm text-neutral-500">You\u2019ve used all your views for today. Come back tomorrow or upgrade for more.</p>
          <div className="flex flex-col gap-2">
            <Link href="/subscribe" className="block w-full py-3 rounded-lg bg-[#C84B31] text-white font-medium text-sm text-center">
              Buy more views
            </Link>
            <Link href="/subscribe" className="block w-full py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-sm text-center">
              Upgrade account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Counter badge above FAB
  return (
    <>
      <button onClick={() => setShowUpgrade(true)} className={"fixed bottom-24 right-5 z-[60] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-medium transition-all duration-300 " + color + (animating ? " scale-125 animate-wiggle" : "")} title={`${remaining} of ${total} views remaining`}>
        <Eye size={12} />
        <span>{remaining}</span>
      </button>

      {showUpgrade && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowUpgrade(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUpgrade(false)} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 text-lg">\u2715</button>
            <div className="text-center">
              <Eye size={32} className="mx-auto text-neutral-400 mb-2" />
              <h3 className="font-bold text-lg">{remaining} views remaining</h3>
              <p className="text-sm text-neutral-500 mt-1">You have {remaining} of {total} daily views left.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/subscribe" className="block w-full py-3 rounded-lg bg-[#C84B31] text-white font-medium text-sm text-center">Buy more views</Link>
              <Link href="/subscribe" className="block w-full py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-sm text-center">Upgrade account</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
