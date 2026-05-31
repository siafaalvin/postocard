import { prisma } from "@/lib/prisma";

interface BlockOptions {
  blockerId: string;
  blockedId: string;
  contextNote?: string | null;
  contextHashtag?: string | null;
  visibleToTarget?: boolean;
}

/** Shared block logic used by both single-block and mass-block endpoints. */
export async function applyBlock({
  blockerId,
  blockedId,
  contextNote,
  contextHashtag,
  visibleToTarget = false,
}: BlockOptions): Promise<void> {
  await prisma.$transaction([
    // Create or update the block
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: { contextNote, contextHashtag, visibleToTarget },
      create: { blockerId, blockedId, contextNote, contextHashtag, visibleToTarget },
    }),
    // Remove follow relationship both ways
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    }),
  ]);
}

export async function massBlock(
  blockerId: string,
  source: "user_followers" | "post_likers" | "comment_likers",
  targetId: string
): Promise<{ blocked: number }> {
  let candidateIds: string[] = [];

  if (source === "user_followers") {
    const rows = await prisma.follow.findMany({
      where: { followingId: targetId, status: "active" },
      select: { followerId: true },
    });
    candidateIds = rows.map((r) => r.followerId);
  } else if (source === "post_likers") {
    const rows = await prisma.like.findMany({
      where: { postId: targetId },
      select: { userId: true },
    });
    candidateIds = rows.map((r) => r.userId);
  } else {
    const rows = await prisma.commentLike.findMany({
      where: { commentId: targetId },
      select: { userId: true },
    });
    candidateIds = rows.map((r) => r.userId);
  }

  // Filter out self, already-blocked, admins
  const alreadyBlocked = await prisma.block.findMany({
    where: { blockerId, blockedId: { in: candidateIds } },
    select: { blockedId: true },
  });
  const alreadyBlockedIds = new Set(alreadyBlocked.map((b) => b.blockedId));

  const admins = await prisma.user.findMany({
    where: { id: { in: candidateIds }, tier: { in: ["admin", "moderator"] } },
    select: { id: true },
  });
  const adminIds = new Set(admins.map((a) => a.id));

  const targets = candidateIds.filter(
    (id) => id !== blockerId && !alreadyBlockedIds.has(id) && !adminIds.has(id)
  );

  if (targets.length > 5000) {
    throw new Error("EXCEEDS_LIMIT");
  }

  await prisma.$transaction([
    prisma.block.createMany({
      data: targets.map((blockedId) => ({ blockerId, blockedId })),
      skipDuplicates: true,
    }),
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: { in: targets } },
          { followerId: { in: targets }, followingId: blockerId },
        ],
      },
    }),
  ]);

  return { blocked: targets.length };
}
