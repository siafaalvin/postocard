"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

interface AltName {
  id: string;
  name: string;
  slot: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string | null;
  zipCode?: string | null;
  avatarUrl?: string | null;
  visibility: string;
  tier: string;
  registrationPaidAt?: Date | null;
  renewalDueAt?: Date | null;
  alternateNames?: AltName[];
}

const ALT_SLOT_LIMIT: Record<string, number> = {
  plus: 1,
  creator: 2,
  moderator: 2,
  admin: 2,
};

export function AccountSettings({ user }: { user: User }) {
  const [form, setForm] = useState({
    displayName: user.displayName,
    bio: user.bio ?? "",
    zipCode: user.zipCode ?? "",
    visibility: user.visibility as "public" | "private",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Alternate display names state
  const maxSlots = ALT_SLOT_LIMIT[user.tier] ?? 0;
  const [altNames, setAltNames] = useState<AltName[]>(user.alternateNames ?? []);
  const [altInputs, setAltInputs] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    (user.alternateNames ?? []).forEach((a) => { init[a.slot] = a.name; });
    return init;
  });
  const [altSaving, setAltSaving] = useState<Record<number, boolean>>({});

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
  }

  async function saveAlt(slot: number) {
    const name = altInputs[slot]?.trim();
    if (!name) return;
    setAltSaving((s) => ({ ...s, [slot]: true }));
    const res = await fetch("/api/profile/alternate-names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slot }),
    });
    if (res.ok) {
      const data = await res.json();
      setAltNames((prev) => {
        const next = prev.filter((a) => a.slot !== slot);
        return [...next, data].sort((a, b) => a.slot - b.slot);
      });
      setToastMsg("Alternate name saved!");
    }
    setAltSaving((s) => ({ ...s, [slot]: false }));
  }

  async function deleteAlt(slot: number) {
    await fetch(`/api/profile/alternate-names/${slot}`, { method: "DELETE" });
    setAltNames((prev) => prev.filter((a) => a.slot !== slot));
    setAltInputs((prev) => { const next = { ...prev }; delete next[slot]; return next; });
  }

  async function switchTo(name: string) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    if (res.ok) {
      setForm((f) => ({ ...f, displayName: name }));
      setToastMsg("Display name updated — refresh to see it in the navbar.");
    }
  }

  const [darkMode, setDarkMode] = useState(() => typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false);
  function toggleDarkMode() { const n = !darkMode; setDarkMode(n); document.documentElement.classList.toggle("dark", n); localStorage.setItem("postocard-theme", n ? "dark" : "light"); }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700 mb-4">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-neutral-500">Switch between light and dark theme</p>
          </div>
          <button type="button" onClick={toggleDarkMode} className={"px-3 py-1 rounded-full text-xs font-medium " + (darkMode ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-700")}>
            {darkMode ? "Dark" : "Light"}
          </button>
        </div>
        <Input label="Display name" value={form.displayName} onChange={set("displayName")} maxLength={50} />
        <Input label="Zip / Postal Code" value={form.zipCode} onChange={set("zipCode")} maxLength={10} placeholder="Not shown publicly" />
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Bio</label>
          <textarea
            value={form.bio}
            onChange={set("bio")}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Profile visibility
          </label>
          <select
            value={form.visibility}
            onChange={set("visibility")}
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
        <Button type="submit" loading={saving}>Save changes</Button>
      </form>

      {/* Alternate display names — Plus and above only */}
      {maxSlots > 0 && (
        <div className="border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <h2 className="mb-1 font-semibold">Alternate Display Names</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Save up to {maxSlots} alternate name{maxSlots > 1 ? "s" : ""}. Switch to use one as your active display name.
          </p>
          <div className="flex flex-col gap-3">
            {Array.from({ length: maxSlots }, (_, i) => i + 1).map((slot) => {
              const saved = altNames.find((a) => a.slot === slot);
              return (
                <div key={slot} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-500">Slot {slot}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={altInputs[slot] ?? ""}
                      onChange={(e) => setAltInputs((p) => ({ ...p, [slot]: e.target.value }))}
                      maxLength={50}
                      placeholder="Alternate name…"
                      className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-800 dark:bg-neutral-900"
                    />
                    <Button
                      type="button"
                      onClick={() => saveAlt(slot)}
                      loading={altSaving[slot]}
                      disabled={!altInputs[slot]?.trim()}
                    >
                      Save
                    </Button>
                    {saved && (
                      <>
                        <button
                          type="button"
                          onClick={() => switchTo(saved.name)}
                          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                        >
                          Switch to
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAlt(slot)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-100 pt-6 dark:border-neutral-800">
        <h2 className="mb-2 font-semibold">Account</h2>
        <p className="text-sm text-neutral-500">@{user.username} · {user.email}</p>
        <p className="mt-1 text-sm text-neutral-500">
          Tier: <span className="capitalize font-medium">{user.tier}</span>
          {user.renewalDueAt && (
            <> · renews {new Date(user.renewalDueAt).toLocaleDateString()}</>
          )}
        </p>
        <Link href="/settings/restricted" className="mt-3 block text-sm text-neutral-600 underline dark:text-neutral-400">
          Restricted users →
        </Link>
      </div>

      {(saved || toastMsg) && (
        <Toast message={toastMsg || "Saved!"} onDone={() => { setSaved(false); setToastMsg(""); }} />
      )}
    </div>
  );
}
