import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfile } from "@/lib/visibility";
import { PostDetail } from "@/components/post/PostDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { caption: true, author: { select: { username: true } } },
  });
  if (!post) return { title: "Post not found" };
  return { title: post.caption ? post.caption.slice(0, 60) : `@${post.author.username}'s post` };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          visibility: true,
        },
      },
    },
  });

  if (!post) notFound();

  const canView =
    post.visibility === "public" ||
    (await canViewProfile(post.authorId, session?.user.id ?? null));

  if (!canView) notFound();

  return <PostDetail post={post} viewerId={session?.user.id ?? null} />;
}
