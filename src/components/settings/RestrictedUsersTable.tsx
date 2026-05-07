"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { BlockListShareModal } from "@/components/settings/BlockListShareModal";
import { Toast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

interface RestrictionRow {
  id: string;
  type: "block" | "mute";
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  contextNote?: string | null;
  contextHashtag?: string | null;
  createdAt: Date;
}

export function RestrictedUsersTable({ rows }: { rows: RestrictionRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localRows, setLocalRows] = useState(rows);
  const [undoing, setUndoing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState("");

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === localRows.length) setSelected(new Set());
    else setSelected(new Set(localRows.map((r) => r.id)));
  }

  async function bulkUndo() {
    setUndoing(true);
    const items = localRows
      .filter((r) => selected.has(r.id))
      .map((r) => ({ id: r.id, type: r.type }));

    const res = await fetch("/api/settings/restricted/bulk-undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (res.ok) {
      setLocalRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      setToast("Restrictions removed");
    }
    setUndoing(false);
  }

  const selectedRows = localRows.filter((r) => selected.has(r.id));

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <span className="flex-1 text-sm text-neutral-600 dark:text-neutral-400">
            {selected.size} selected
          </span>
          <Button size="sm" variant="danger" onClick={bulkUndo} loading={undoing}>
            Undo restriction
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
            Share as list
          </Button>
        </div>
      )}

      {localRows.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">No restricted users.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selected.size === localRows.length} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {localRows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${row.user.username}`} className="flex items-center gap-2 hover:underline">
                      <Avatar src={row.user.avatarUrl} username={row.user.username} size="sm" />
                      <div>
                        <p className="font-medium">{row.user.displayName}</p>
                        <p className="text-xs text-neutral-500">@{row.user.username}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.type === "block"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {row.contextNote && <span>{row.contextNote}</span>}
                    {row.contextHashtag && (
                      <span className="ml-1 text-neutral-400">#{row.contextHashtag}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BlockListShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        users={selectedRows.map((r) => r.user)}
        onCreated={(slug) => { setToast(`List created — /blocklist/${slug}`); setShareOpen(false); }}
      />

      {toast && <Toast message={toast} onDone={() => setToast("")} duration={3000} />}
    </div>
  );
}
