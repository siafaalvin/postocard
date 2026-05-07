import type { Metadata } from "next";
import { SubscribeButton } from "@/components/auth/SubscribeButton";

export const metadata: Metadata = { title: "Subscribe" };

export default function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-bold">Activate your account</h1>
        <p className="mb-8 text-neutral-500">
          Pay $1 once per year to access Postocard. No auto-renewal without permission.
        </p>
        <SubscribeButton searchParams={searchParams} />
      </div>
    </div>
  );
}
