import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlockListImportCard } from "@/components/settings/BlockListImportCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = await prisma.blockList.findUnique({
    where: { slug, isPublic: true },
    select: { name: true },
  });
  return { title: list ? `Block list: ${list.name}` : "Not found" };
}

export default async function BlockListPage({ params }: Props) {
  const { slug } = await params;

  const list = await prisma.blockList.findUnique({
    where: { slug, isPublic: true },
    include: {
      owner: { select: { username: true, displayName: true } },
      entries: {
        include: {
          blockedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!list) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">{list.name}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        By <span className="font-medium">@{list.owner.username}</span> ·{" "}
        {list.entries.length} users · imported {list.importCount} times
      </p>
      <BlockListImportCard slug={slug} entries={list.entries} />
    </div>
  );
}
