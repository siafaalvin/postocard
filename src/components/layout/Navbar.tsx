"use client";

import Link from "next/link";
import { ViewCounter } from "@/components/layout/ViewCounter";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { Home, TrendingUp, Map, Bell, User, Settings, LogOut, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/feed",  icon: Home,       label: "Feed" },
  { href: "/top",   icon: TrendingUp, label: "Top" },
  { href: "/map",   icon: Map,        label: "Map" },
];

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    async function fetchCount() {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) { const d = await res.json(); setUnreadCount(d.count ?? 0); }
    }
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [session?.user]);

  useEffect(() => {
    if (pathname === "/feed" && searchParams.get("tab") === "activity") setUnreadCount(0);
  }, [pathname, searchParams]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [menuOpen]);

  const activityActive = pathname === "/feed" && searchParams.get("tab") === "activity";

  return (
    <header data-navbar className="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/feed" className="site-title text-lg">
          Postocard
        </Link>

        <div className="flex items-center gap-2">
                  <nav className="flex items-center gap-1">
          {/* Feed / Top / Map — desktop only */}
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
              {/* Activity bell */}
              <Link
                href="/feed?tab=activity"
                aria-label="Activity"
                className={cn(
                  "relative rounded-lg p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  activityActive && "bg-neutral-100 dark:bg-neutral-800"
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Avatar menu */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                  className="ml-1 rounded-full ring-2 ring-transparent transition-all hover:ring-neutral-300 dark:hover:ring-neutral-600 focus-visible:outline-none focus-visible:ring-neutral-400"
                >
                  <Avatar
                    src={session.user.avatarUrl ?? null}
                    username={session.user.username ?? "user"}
                    size="sm"
                  />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
                    {/* User info header */}
                    <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                      <p className="truncate text-sm font-semibold">
                        {session.user.displayName ?? session.user.username}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        @{session.user.username}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href={`/${session.user.username}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <User className="h-4 w-4 text-neutral-500" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <Settings className="h-4 w-4 text-neutral-500" />
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-neutral-100 py-1 dark:border-neutral-800">
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        <RefreshCw className="h-4 w-4 text-neutral-500" />
                        Switch accounts
                      </button>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
        </div>
      </div>
    </header>
  );
}
