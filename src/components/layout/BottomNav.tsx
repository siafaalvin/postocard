"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, TrendingUp, Map, PlusSquare, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/feed",      icon: Home,        label: "Feed" },
  { href: "/top",       icon: TrendingUp,  label: "Top" },
  { href: "/map",       icon: Map,         label: "Map" },
  { href: "/earnings",  icon: DollarSign,  label: "Earnings" },
  { href: "/post/new",  icon: PlusSquare,  label: "Post" },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(href: string) {
    if (href === "/feed") return pathname === "/feed" && !searchParams.get("tab");
    return pathname === href;
  }

  return (
    <nav data-bottomnav className="flex md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-neutral-200 bg-neutral-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      {TABS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
            isActive(href) && "text-neutral-900 dark:text-neutral-100"
          )}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
