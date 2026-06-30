"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" loading={loading}>
        Pay $1
      </Button>
    </form>
  );
}

export function ViewExtensionBanner() {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  async function openModal() {
    const res = await fetch("/api/stripe/view-extension", { method: "POST" });
    const data = await res.json();
    setClientSecret(data.clientSecret);
    setOpen(true);
  }

  if (paid) {
    return (
      <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
        200 more posts unlocked for 7 days!
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You&apos;ve seen all your posts today.
        </p>
        <Button size="sm" onClick={openModal}>
          200 more for $1
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="View 200 more posts — $1">
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => { setOpen(false); setPaid(true); }} />
          </Elements>
        )}
      </Modal>
    </>
  );
}
