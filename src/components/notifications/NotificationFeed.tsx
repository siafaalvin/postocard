"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

// ─── Received notification types ──────────────────────────────────────────────

interface UserRef {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface NotificationItem {
  id: string;
  type: "new_follower" | "post_liked" | "post_commented" | "comment_replied";
  read: boolean;
  createdAt: string;
  actor: UserRef;
  post?: { id: string; caption?: string | null } | null;
  comment?: { id: string } | null;
}

// ─── Own activity types ────────────────────────────────────────────────────────

interface FollowRow      { id: string; createdAt: string; user: UserRef; }
interface RestrictionRow { id: string; createdAt: string; kind: "block" | "mute"; user: UserRef; }
interface ReportRow      { id: string; createdAt: string; user: UserRef; label: string; }

interface WeekGroup {
  key: string;
  label: string;
  follows: FollowRow[];
  restrictions: RestrictionRow[];
  reports: ReportRow[];
}

// ─── Week utilities ───────────────────────────────────────────────────────────

function isoWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow); // shift to Thursday of ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function weekStartDate(weekKey: string): Date {
  const [yr, wk] = weekKey.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(yr, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  return new Date(Date.UTC(yr, 0, 4 - dow + 1 + (wk - 1) * 7));
}

function toWeekLabel(weekKey: string): string {
  const now = new Date();
  if (weekKey === isoWeekKey(now.toISOString())) return "This week";
  const last = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (weekKey === isoWeekKey(last.toISOString())) return "Last week";
  const mon = weekStartDate(weekKey);
  return `Week of ${mon.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

// ─── Summary text ─────────────────────────────────────────────────────────────

function summarize(items: { user: { id: string; username: string } }[], verb: string, wLabel: string): string {
  // Deduplicate by user id (multiple flags can target same user)
  const seen = new Set<string>();
  const unique = items.filter((i) => !seen.has(i.user.id) && seen.add(i.user.id));

  const timeSuffix =
    wLabel === "This week" ? "this week"
    : wLabel === "Last week" ? "last week"
    : `the ${wLabel.toLowerCase()}`; // "the week of May 5"

  const names = unique.map((i) => `@${i.user.username}`);
  if (names.length === 1) return `You ${verb} ${names[0]} ${timeSuffix}`;
  if (names.length === 2) return `You ${verb} ${names[0]} and ${names[1]} ${timeSuffix}`;
  return `You ${verb} ${names[0]}, ${names[1]}, and ${names.length - 2} more ${timeSuffix}`;
}

// ─── Accordion row ────────────────────────────────────────────────────────────

function AccordionRow({
  summary,
  expandable,
  expanded,
  onToggle,
  children,
}: {
  summary: string;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-700 dark:text-neutral-300",
          expandable && "cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
        )}
      >
        <span className="flex-1">{summary}</span>
        {expandable && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
            : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
        )}
      </button>
      {expanded && (
        <ul className="space-y-1 pb-2 pl-8 pr-4">
          {children}
        </ul>
      )}
    </div>
  );
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function notificationText(n: NotificationItem): string {
  switch (n.type) {
    case "new_follower":    return "started following you";
    case "post_liked":      return "liked your post";
    case "post_commented":  return "commented on your post";
    case "comment_replied": return "replied to your comment";
  }
}

function notificationHref(n: NotificationItem): string {
  if (n.type === "new_follower") return `/${n.actor.username}`;
  if (n.post) {
    if (n.comment) return `/post/${n.post.id}?c=${n.comment.id}`;
    return `/post/${n.post.id}`;
  }
  return "#";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationFeed() {
  // Received notifications
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Own activity
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const initialFetchDone = useRef(false);

  async function loadNotifications(cur: string | null = null) {
    if (loading) return;
    setLoading(true);
    const params = cur ? `?cursor=${cur}` : "";
    const res = await fetch(`/api/notifications${params}`);
    const data = await res.json();
    setItems((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      return [...prev, ...(data.notifications ?? []).filter((n: NotificationItem) => !ids.has(n.id))];
    });
    setCursor(data.nextCursor ?? null);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }

  async function loadOwnActivity() {
    const res = await fetch("/api/activity/own");
    if (!res.ok) return;
    const data = await res.json();

    const map = new Map<string, WeekGroup>();

    function getWeek(dateStr: string): WeekGroup {
      const key = isoWeekKey(dateStr);
      if (!map.has(key)) map.set(key, { key, label: toWeekLabel(key), follows: [], restrictions: [], reports: [] });
      return map.get(key)!;
    }

    for (const f of (data.follows ?? [])) {
      getWeek(f.createdAt).follows.push({ id: f.id, createdAt: f.createdAt, user: f.following });
    }
    for (const b of (data.blocks ?? [])) {
      getWeek(b.createdAt).restrictions.push({ id: b.id, createdAt: b.createdAt, kind: "block", user: b.blocked });
    }
    for (const m of (data.mutes ?? [])) {
      getWeek(m.createdAt).restrictions.push({ id: m.id, createdAt: m.createdAt, kind: "mute", user: m.muted });
    }
    for (const r of (data.flags ?? [])) {
      getWeek(r.createdAt).reports.push({ id: r.id, createdAt: r.createdAt, user: r.flaggedUser, label: r.attribute.label });
    }

    // Sort restrictions within each week newest-first
    for (const g of map.values()) {
      g.restrictions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    setWeekGroups(
      Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key))
    );
  }

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    loadNotifications();
    loadOwnActivity();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleKey(k: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  const hasOwnActivity = weekGroups.some(
    (g) => g.follows.length || g.restrictions.length || g.reports.length
  );

  return (
    <div>
      {/* ── Your activity ──────────────────────────────────────────────── */}
      {hasOwnActivity && (
        <section className="mb-4">
          <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Your activity
          </h2>

          {weekGroups.map((week) => {
            const hasContent = week.follows.length || week.restrictions.length || week.reports.length;
            if (!hasContent) return null;

            // Unique user counts for expandable check
            const uniqueReportUsers = new Set(week.reports.map((r) => r.user.id)).size;

            return (
              <div
                key={week.key}
                className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <p className="px-4 pb-0.5 pt-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {week.label}
                </p>

                {/* Followed */}
                {week.follows.length > 0 && (
                  <AccordionRow
                    summary={summarize(week.follows, "followed", week.label)}
                    expandable={week.follows.length > 1}
                    expanded={expanded.has(`${week.key}:follow`)}
                    onToggle={() => toggleKey(`${week.key}:follow`)}
                  >
                    {week.follows.map((f) => (
                      <li key={f.id} className="flex items-center gap-2.5 py-1">
                        <Avatar src={f.user.avatarUrl} username={f.user.username} size="sm" />
                        <Link href={`/${f.user.username}`} className="text-sm font-medium hover:underline">
                          @{f.user.username}
                        </Link>
                        <span className="ml-auto flex-shrink-0 text-xs text-neutral-400">{shortDate(f.createdAt)}</span>
                      </li>
                    ))}
                  </AccordionRow>
                )}

                {/* Restricted (blocks + mutes combined) */}
                {week.restrictions.length > 0 && (
                  <AccordionRow
                    summary={summarize(week.restrictions, "restricted", week.label)}
                    expandable={week.restrictions.length > 1}
                    expanded={expanded.has(`${week.key}:restrict`)}
                    onToggle={() => toggleKey(`${week.key}:restrict`)}
                  >
                    {week.restrictions.map((r) => (
                      <li key={r.id} className="flex items-center gap-2.5 py-1">
                        <Avatar src={r.user.avatarUrl} username={r.user.username} size="sm" />
                        <Link href={`/${r.user.username}`} className="text-sm font-medium hover:underline">
                          @{r.user.username}
                        </Link>
                        <span className="text-xs capitalize text-neutral-400">{r.kind}ed</span>
                        <span className="ml-auto flex-shrink-0 text-xs text-neutral-400">{shortDate(r.createdAt)}</span>
                      </li>
                    ))}
                  </AccordionRow>
                )}

                {/* Reported (flags placed on users) */}
                {week.reports.length > 0 && (
                  <AccordionRow
                    summary={summarize(week.reports, "reported", week.label)}
                    expandable={uniqueReportUsers > 1}
                    expanded={expanded.has(`${week.key}:report`)}
                    onToggle={() => toggleKey(`${week.key}:report`)}
                  >
                    {week.reports.map((r) => (
                      <li key={r.id} className="flex items-center gap-2.5 py-1">
                        <Avatar src={r.user.avatarUrl} username={r.user.username} size="sm" />
                        <Link href={`/${r.user.username}`} className="text-sm font-medium hover:underline">
                          @{r.user.username}
                        </Link>
                        <span className="truncate text-xs text-neutral-400">{r.label}</span>
                        <span className="ml-auto flex-shrink-0 text-xs text-neutral-400">{shortDate(r.createdAt)}</span>
                      </li>
                    ))}
                  </AccordionRow>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ── Received notifications ─────────────────────────────────────── */}
      <section>
        <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Notifications
        </h2>

        {items.length === 0 && !loading && (
          <p className="py-10 text-center text-sm text-neutral-500">No notifications yet.</p>
        )}

        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((n) => (
            <li key={n.id} className={!n.read ? "bg-neutral-50 dark:bg-neutral-900/50" : ""}>
              <Link
                href={notificationHref(n)}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Avatar src={n.actor.avatarUrl} username={n.actor.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{n.actor.displayName}</span>
                    {" "}{notificationText(n)}
                  </p>
                  {n.post?.caption && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      &ldquo;{n.post.caption.slice(0, 60)}&rdquo;
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {loading && (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => loadNotifications(cursor)}
            className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Load more
          </button>
        )}
      </section>
    </div>
  );
}
