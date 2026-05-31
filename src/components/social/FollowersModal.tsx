"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Props {
  username: string;
  type: "followers" | "following";
  open: boolean;
  onClose: () => void;
}

export function FollowersModal({ username, type, open, onClose }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsers([]);
    setCursor(null);
    setHasMore(true);
    loadPage(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  async function loadPage(cur: string | null) {
    setLoading(true);
    const params = cur ? `?cursor=${cur}` : "";
    const res = await fetch(`/api/users/${username}/${type}${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setUsers((prev) => [...prev, ...(data.users ?? [])]);
    setCursor(data.nextCursor ?? null);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="max-h-[60vh] overflow-y-auto">
        {users.length === 0 && !loading && (
          <p className="py-6 text-center text-sm text-neutral-500">No {type} yet.</p>
        )}
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-1 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg transition-colors"
              >
                <Avatar src={u.avatarUrl} username={u.username} size="sm" />
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-xs text-neutral-500">@{u.username}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        )}
        {hasMore && !loading && (
          <button
            onClick={() => loadPage(cursor)}
            className="mt-2 w-full rounded-xl border border-neutral-200 py-2 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Load more
          </button>
        )}
      </div>
    </Modal>
  );
}
