"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function NewPostFAB() {
  return (
    <Link
      href="/post/new"
      aria-label="New post"
      className="hidden md:flex fixed bottom-6 right-6 z-50 h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-transform hover:scale-105 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
