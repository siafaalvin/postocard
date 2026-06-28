"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Generate suggestion from session email
  useEffect(() => {
    if (session?.user?.email) {
      const base = session.user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
      setSuggestion(base);
    }
  }, [session]);

  // Debounced availability check
  useEffect(() => {
    if (username.length < 3) { setAvailable(null); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setAvailable(data.available);
      setReason(data.reason || "");
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = useCallback(async () => {
    if (!available || !username) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save");
        setSaving(false);
        return;
      }
      await update(); // refresh session
      router.push("/feed");
    } catch {
      setError("Something went wrong");
      setSaving(false);
    }
  }, [available, username, router, update]);

  const useSuggestion = () => setUsername(suggestion);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl">Welcome to Postocard</h1>
          <p className="mt-2 text-neutral-500 text-sm">Choose your username — this is how others will find you.</p>
        </div>

        {/* Suggestion */}
        {suggestion && username !== suggestion && (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Suggested:</p>
              <p className="font-medium">@{suggestion}</p>
            </div>
            <button onClick={useSuggestion} className="text-sm font-medium text-[#C84B31]">Use this</button>
          </div>
        )}

        {/* Username input */}
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))}
              placeholder="your_username"
              className="w-full pl-8 pr-10 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C84B31]"
            />
            {username.length >= 3 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                {available === true && "✅"}
                {available === false && "❌"}
                {available === null && ""}
              </span>
            )}
          </div>
          {reason && <p className="text-xs text-red-500 mt-1">{reason}</p>}
          <p className="text-xs text-neutral-400 mt-1">3-30 characters. Letters, numbers, underscores only.</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!available || saving}
          className="w-full py-3 rounded-lg font-medium text-white bg-[#C84B31] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        {/* Skip — use suggestion */}
        {suggestion && (
          <button
            onClick={() => { setUsername(suggestion); setTimeout(handleSave, 100); }}
            className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
          >
            Skip — use @{suggestion}
          </button>
        )}
      </div>
    </div>
  );
}
