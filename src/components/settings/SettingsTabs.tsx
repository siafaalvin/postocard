"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AdFeed } from "@/components/ads/AdFeed";
import { cn } from "@/lib/utils";

const TABS = ["Profile", "Ads"] as const;
type TabName = (typeof TABS)[number];
const TAB_PARAM: Record<TabName, string | null> = { Profile: null, Ads: "ads" };

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  visibility: string;
  tier: string;
  zipCode: string | null;
  konvoId: string | null;
  registrationPaidAt: Date | null;
  renewalDueAt: Date | null;
  alternateNames: { id: string; name: string; slot: number }[];
}

interface Props { user: User; }

export function SettingsTabs({ user }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const activeIndex = tabParam === "ads" ? 1 : 0;

  function changeTab(i: number) {
    const param = TAB_PARAM[TABS[i]];
    router.replace(param ? `/settings?tab=${param}` : "/settings", { scroll: false });
  }

  return (
    <div>
      <div className="mb-6 flex border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => changeTab(i)}
            className={cn(
              "relative mr-4 pb-3 text-sm font-medium transition-colors",
              activeIndex === i
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            {tab}
            {activeIndex === i && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-neutral-900 dark:bg-white" />
            )}
          </button>
        ))}
      </div>

      {activeIndex === 0 && <AccountSettings user={user} />}
      {activeIndex === 1 && <AdFeed />}
    </div>
  );
}
