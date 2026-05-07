"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const REMOVAL_PRICES = [100, 1000, 10000, 100000];

function getRemovalPrice(removalCount: number) { return REMOVAL_PRICES[removalCount] ?? 0; }
function isRemovable(removalCount: number) { return removalCount < 4; }

function formatCents(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100).toLocaleString()}`;
  if (cents >= 100) return `$${cents / 100}`;
  return `${cents}¢`;
}

interface PublicFlag {
  id: string;
  attributeId: string;
  flagCount: number;
  removalCount: number;
  attribute: { label: string; category: string };
}

interface Props {
  flags: PublicFlag[];
  onClose: () => void;
}

export function PublicFlagRemovalModal({ flags, onClose }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(flag: PublicFlag) {
    setProcessingId(flag.id);
    setError(null);

    const res = await fetch(`/api/flags/${flag.id}/remove`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Payment failed");
      setProcessingId(null);
      return;
    }

    // clientSecret returned — connect to @stripe/react-stripe-js confirmPayment here
    console.info("Flag removal PaymentIntent created:", data.clientSecret);
    alert(`Payment required: ${formatCents(data.amountCents)}. Connect Stripe Payment Element to complete.`);
    setProcessingId(null);
  }

  return (
    <Modal open title="Your public flags" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          These flags are visible to all users. You can pay to remove them.
        </p>

        {flags.map((flag) => {
          const removable = isRemovable(flag.removalCount);
          const price = getRemovalPrice(flag.removalCount);

          return (
            <div
              key={flag.id}
              className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
            >
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                {flag.attribute.category}
              </p>
              <p className="mt-0.5 text-sm font-medium">{flag.attribute.label}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {flag.flagCount} user{flag.flagCount !== 1 ? "s" : ""} flagged this
              </p>

              <div className="mt-2">
                {removable ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={processingId === flag.id}
                    onClick={() => handleRemove(flag)}
                  >
                    {processingId === flag.id
                      ? "Processing…"
                      : `Remove for ${formatCents(price)}`}
                  </Button>
                ) : (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    Permanent — cannot be removed
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
