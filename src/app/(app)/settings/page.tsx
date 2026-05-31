import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      visibility: true,
      tier: true,
      zipCode: true,
      konvoId: true,
      registrationPaidAt: true,
      renewalDueAt: true,
      alternateNames: { select: { id: true, name: true, slot: true }, orderBy: { slot: "asc" } },
    },
  });

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Settings</h1>
      <SettingsTabs user={user} />
    </div>
  );
}
