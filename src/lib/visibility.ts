import { prisma } from "@/lib/prisma";

/**
 * Evaluates whether `viewerId` can view a profile owned by `profileUserId`.
 * Rules evaluated in order — first true wins.
 *
 * 1. Profile is public
 * 2. Viewer is the profile owner
 * 3. Viewer actively follows the owner
 * 4. Owner actively follows the viewer
 * 5. Active TemporaryProfileGrant exists
 */
export async function canViewProfile(
  profileUserId: string,
  viewerId: string | null
): Promise<boolean> {
  const owner = await prisma.user.findUnique({
    where: { id: profileUserId },
    select: { visibility: true },
  });

  if (!owner) return false;

  // Rule 1
  if (owner.visibility === "public") return true;

  // Rules 2–5 require a logged-in viewer
  if (!viewerId) return false;

  // Rule 2
  if (viewerId === profileUserId) return true;

  const [viewerFollows, ownerFollows, grant] = await Promise.all([
    // Rule 3 — viewer follows owner
    prisma.follow.findFirst({
      where: { followerId: viewerId, followingId: profileUserId, status: "active" },
      select: { id: true },
    }),
    // Rule 4 — owner follows viewer
    prisma.follow.findFirst({
      where: { followerId: profileUserId, followingId: viewerId, status: "active" },
      select: { id: true },
    }),
    // Rule 5 — temporary grant
    prisma.temporaryProfileGrant.findFirst({
      where: {
        grantedById: profileUserId,
        grantedToId: viewerId,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    }),
  ]);

  return !!(viewerFollows || ownerFollows || grant);
}
