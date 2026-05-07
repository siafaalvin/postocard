import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.tier !== "admin") redirect("/feed");

  const [userCount, postCount, reportCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { deletedAt: null } }),
    Promise.resolve(0), // placeholder — reports model TBD
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total users", value: userCount },
          { label: "Active posts", value: postCount },
          { label: "Open reports", value: reportCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
