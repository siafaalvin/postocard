import Link from "next/link";
import { TopFeedList } from "@/components/feed/TopFeedList";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
          <span className="site-title text-xl">Postocard</span>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Social media the way it was.
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Chronological feeds. No algorithm. No ads. Just the people you follow, in order.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Join for $1/year
          </Link>
          <Link
            href="/top"
            className="rounded-lg border border-neutral-300 px-6 py-3 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Browse top posts
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          One-time $1/year registration. No recurring charges without your consent.
        </p>
      </section>

      {/* Top Feed preview */}
      <section className="mx-auto max-w-xl px-4 pb-16">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          Today&apos;s top posts
        </h2>
        <TopFeedList preview />
      </section>
    </div>
  );
}
