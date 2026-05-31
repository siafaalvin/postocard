import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const allowedTiers = ["plus", "creator", "moderator", "admin"];
  if (!allowedTiers.includes(session.user.tier)) {
    redirect("/feed");
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="mb-3 text-2xl font-bold">Fantasy Earnings</h1>
      <p className="max-w-xs text-sm text-neutral-500">
        This feature is coming soon. Stay tuned for updates.
      </p>
    </div>
  );
}
