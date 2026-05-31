import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Notifications</h1>
      <NotificationFeed />
    </div>
  );
}
