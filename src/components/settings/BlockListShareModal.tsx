"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface User {
  id: string;
  username: string;
  displayName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  users: User[];
  onCreated: (slug: string) => void;
}

export function BlockListShareModal({ open, onClose, users, onCreated }: Props) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/block-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isPublic, userIds: users.map((u) => u.id) }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to create list");
      return;
    }

    const data = await res.json();
    onCreated(data.slug);
  }

  return (
    <Modal open={open} onClose={onClose} title="Share as block list">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">{users.length} users will be included.</p>
        <Input
          label="List name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spam accounts"
          maxLength={100}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make list publicly viewable
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} loading={loading} disabled={!name.trim()} className="flex-1">
            Create list
          </Button>
        </div>
      </div>
    </Modal>
  );
}
