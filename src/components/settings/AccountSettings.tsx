"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  visibility: string;
  tier: string;
  cameraOnlyMode: boolean;
  registrationPaidAt?: Date | null;
  renewalDueAt?: Date | null;
}

export function AccountSettings({ user }: { user: User }) {
  const [form, setForm] = useState({
    displayName: user.displayName,
    bio: user.bio ?? "",
    visibility: user.visibility as "public" | "private",
    cameraOnlyMode: user.cameraOnlyMode,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <h2 className="font-semibold">Profile</h2>
        <Input label="Display name" value={form.displayName} onChange={set("displayName")} maxLength={50} />
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
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.cameraOnlyMode}
            onChange={(e) => setForm((f) => ({ ...f, cameraOnlyMode: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          <span className="text-sm">Camera-only mode — hide posts without camera EXIF data</span>
        </label>
        <Button type="submit" loading={saving}>Save changes</Button>
      </form>

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

      {saved && <Toast message="Saved!" onDone={() => setSaved(false)} />}
    </div>
  );
}
