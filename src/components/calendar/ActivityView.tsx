"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProfileUser {
  id: string;
  username: string;
  displayName: string;
}

interface Props {
  profileUser: ProfileUser;
  viewerId: string | null;
  isOwn: boolean;
  selectedDay?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function ActivityView({ profileUser, viewerId, isOwn, selectedDay }: Props) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<unknown[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  async function selectDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/${profileUser.username}/activity?day=${dateStr}`, { scroll: false });

    if (isOwn) {
      setDayLoading(true);
      const res = await fetch(`/api/users/${profileUser.username}/calendar?day=${dateStr}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setDayLoading(false);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const heading = isOwn ? "Activity" : "Interactions";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{heading}</h1>

      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-medium">{monthLabel}</span>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-xs font-medium text-neutral-400">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selectedDay === dateStr;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <button
              key={day}
              onClick={() => selectDay(day)}
              className={`rounded-lg py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                isSelected ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" :
                isToday ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Day events — only visible to profile owner */}
      {isOwn && selectedDay && (
        <div className="mt-6 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h2 className="mb-3 font-medium">{formatDate(selectedDay)}</h2>
          {dayLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-neutral-500">No activity this day.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(events as { id: string; eventType: string; targetUser?: { username: string } | null; targetPost?: { id: string; caption?: string | null } | null }[]).map((ev) => (
                <li key={ev.id} className="text-sm text-neutral-600 dark:text-neutral-400">
                  {ev.eventType.replace(/_/g, " ")}
                  {ev.targetUser && ` @${ev.targetUser.username}`}
                  {ev.targetPost && ` — "${ev.targetPost.caption?.slice(0, 30) ?? "post"}"`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
