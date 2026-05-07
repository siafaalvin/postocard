"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Home, TrendingUp, Map, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/top", icon: TrendingUp, label: "Top" },
  { href: "/map", icon: Map, label: "Map" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/feed" className="text-lg font-bold tracking-tight">
          Postocard
        </Link>

        <nav className="flex items-center gap-1">
          {/* Feed / Top / Map — hidden on mobile, shown by BottomNav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={cn(
                  "rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  pathname === href && "bg-neutral-100 dark:bg-neutral-800"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
          </div>

          {session?.user && (
            <>
              <Link
                href={`/${session.user.username}`}
                aria-label="Profile"
                className="rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
                className="rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
