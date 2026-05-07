"use client";

import { useState, useEffect } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlagModal } from "./FlagModal";

interface FlagStatus {
  myFlags: { attributeId: string }[];
  publicFlags: { id: string; attributeId: string; flagCount: number; removalCount: number }[];
}

interface FlagIconProps {
  targetUserId: string;
  viewerId: string | null;
}

export function FlagIcon({ targetUserId, viewerId }: FlagIconProps) {
  const [status, setStatus] = useState<FlagStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!viewerId || viewerId === targetUserId) return;
    fetch(`/api/flags/users/${targetUserId}`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
  }, [viewerId, targetUserId]);

  // Don't render for own profile or unauthenticated
  if (!viewerId || viewerId === targetUserId) return null;

  const isFlaggedByMe = (status?.myFlags.length ?? 0) > 0;
  const hasPublicFlag = (status?.publicFlags.length ?? 0) > 0;

  function handleFlagChange(updated: FlagStatus) {
    setStatus(updated);
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Flag user"
        title={
          hasPublicFlag
            ? "This user has public flags"
            : isFlaggedByMe
            ? "You have flagged this user"
            : "Flag this user"
        }
        className={cn(
          "rounded p-0.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
          isFlaggedByMe && "text-yellow-500",
          hasPublicFlag && "text-red-600 dark:text-red-500"
        )}
      >
        <Flag
          className="h-3.5 w-3.5"
          fill={isFlaggedByMe || hasPublicFlag ? "currentColor" : "none"}
        />
      </button>

      {modalOpen && (
        <FlagModal
          targetUserId={targetUserId}
          currentStatus={status}
          onClose={() => setModalOpen(false)}
          onChange={handleFlagChange}
        />
      )}
    </>
  );
}
