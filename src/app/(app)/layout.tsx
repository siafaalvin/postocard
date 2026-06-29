export const dynamic = "force-dynamic";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NewPostFAB } from "@/components/layout/NewPostFAB";
import { LandscapeShell } from "@/components/landscape/LandscapeShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <LandscapeShell><div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-6 pb-20 md:pb-6"><OnboardingGuard>{children}</OnboardingGuard></main>
      <BottomNav />
      <NewPostFAB />
    </div></LandscapeShell>
  );
}
