"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface FlagAttribute {
  id: string;
  label: string;
  category: string;
}

interface FlagStatus {
  myFlags: { attributeId: string }[];
  publicFlags: { id: string; attributeId: string; flagCount: number; removalCount: number }[];
}

interface Props {
  targetUserId: string;
  currentStatus: FlagStatus | null;
  onClose: () => void;
  onChange: (updated: FlagStatus) => void;
}

export function FlagModal({ targetUserId, currentStatus, onClose, onChange }: Props) {
  const [grouped, setGrouped] = useState<Record<string, FlagAttribute[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetch("/api/flag-attributes")
      .then((r) => r.json())
      .then((data: Record<string, FlagAttribute[]>) => {
        setGrouped(data);
        const firstCategory = Object.keys(data)[0] ?? "";
        setSelectedCategory(firstCategory);
      });
  }, []);

  const myFlaggedIds = new Set(currentStatus?.myFlags.map((f) => f.attributeId) ?? []);
  const categories = Object.keys(grouped);
  const attributesInCategory = grouped[selectedCategory] ?? [];
  const alreadyFlagged = selectedAttributeId ? myFlaggedIds.has(selectedAttributeId) : false;

  async function handleSubmit() {
    if (!selectedAttributeId) return;
    setSaving(true);
    const res = await fetch(`/api/flags/users/${targetUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributeId: selectedAttributeId, note: note.trim() || undefined }),
    });
    if (res.ok) {
      const updated: FlagStatus = await fetch(`/api/flags/users/${targetUserId}`).then((r) => r.json());
      onChange(updated);
    }
    setSaving(false);
    onClose();
  }

  async function handleRemove() {
    if (!selectedAttributeId) return;
    setRemoving(true);
    const res = await fetch(`/api/flags/users/${targetUserId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributeId: selectedAttributeId }),
    });
    if (res.ok) {
      const updated: FlagStatus = await fetch(`/api/flags/users/${targetUserId}`).then((r) => r.json());
      onChange(updated);
    }
    setRemoving(false);
    onClose();
  }

  return (
    <Modal open title="Flag user" onClose={onClose}>
      <div className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedAttributeId(""); }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedCategory === cat
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Attribute selector */}
        {attributesInCategory.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Offense
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
              {attributesInCategory.map((attr) => {
                const isMine = myFlaggedIds.has(attr.id);
                return (
                  <button
                    key={attr.id}
                    onClick={() => setSelectedAttributeId(attr.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedAttributeId === attr.id
                        ? "bg-neutral-100 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    } ${isMine ? "text-yellow-600 dark:text-yellow-400" : ""}`}
                  >
                    {attr.label}
                    {isMine && <span className="ml-2 text-xs opacity-60">(flagged)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        {selectedAttributeId && !alreadyFlagged && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 100))}
              rows={2}
              placeholder="Briefly describe what happened…"
              className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:focus:border-neutral-500"
            />
            <p className="mt-0.5 text-right text-xs text-neutral-400">{note.length}/100</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {alreadyFlagged ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove flag"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!selectedAttributeId || saving}
            >
              {saving ? "Flagging…" : "Flag"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
