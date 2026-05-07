"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export function SubscribeButton(_props: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "basic" }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <Button onClick={handleClick} loading={loading} size="lg" className="w-full">
      Pay $1 and activate
    </Button>
  );
}
