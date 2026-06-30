"use client";
import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

export function ViewCounter() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    async function fetch_remaining() {
      try {
        const res = await fetch("/api/feed/remaining");
        if (res.ok) {
          const data = await res.json();
          setRemaining(data.remaining);
          setTotal(data.total);
        }
      } catch {}
    }
    fetch_remaining();
    // Refresh every 30 seconds
    const interval = setInterval(fetch_remaining, 30000);
    return () => clearInterval(interval);
  }, []);

  // Don't show for unlimited (creator/admin) tiers
  if (remaining === null) return null;

  const pct = total ? Math.round((remaining / total) * 100) : 100;
  const color = pct > 50 ? "text-green-600" : pct > 20 ? "text-amber-500" : "text-red-500";

  return (
    <div className={`flex items-center gap-1 text-[10px] font-medium ${color}`} title={`${remaining} of ${total} views remaining today`}>
      <Eye size={12} />
      <span>{remaining}</span>
    </div>
  );
}
