"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

interface Entry {
  id: string;
  blockedUser: { id: string; username: string; displayName: string; avatarUrl?: string | null };
}

interface Props {
  slug: string;
  entries: Entry[];
}

export function BlockListImportCard({ slug, entries }: Props) {
  const { data: session } = useSession();
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  async function handleImport() {
    if (!session) return;
    setImporting(true);

    const res = await fetch(`/api/block-lists/${slug}/import`, { method: "POST" });
    const data = await res.json();

    setImporting(false);
    setDone(true);
    setToast(`Blocked ${data.blocked} users`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        {entries.slice(0, 20).map((entry) => (
          <div key={entry.id} className="flex items-center gap-2">
            <Avatar
              src={entry.blockedUser.avatarUrl}
              username={entry.blockedUser.username}
              size="sm"
            />
            <Link href={`/${entry.blockedUser.username}`} className="text-sm hover:underline">
              {entry.blockedUser.displayName}{" "}
              <span className="text-neutral-500">@{entry.blockedUser.username}</span>
            </Link>
          </div>
        ))}
        {entries.length > 20 && (
          <p className="text-sm text-neutral-500">…and {entries.length - 20} more</p>
        )}
      </div>

      {session ? (
        <Button onClick={handleImport} loading={importing} disabled={done} variant="danger">
          {done ? "Imported" : `Block all ${entries.length} users`}
        </Button>
      ) : (
        <Link href="/login">
          <Button variant="secondary">Log in to import</Button>
        </Link>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
