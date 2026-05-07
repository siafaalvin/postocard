import { prisma } from "./prisma";
import { PRICES } from "./stripe";

const PUBLIC_FLAG_THRESHOLD = 10;
const MAX_PAID_REMOVALS = 4;

export function getPublicFlagRemovalPrice(removalCount: number): number {
  const prices = [PRICES.flagRemoval1, PRICES.flagRemoval2, PRICES.flagRemoval3, PRICES.flagRemoval4];
  return prices[removalCount] ?? 0;
}

export function canRemovePublicFlag(removalCount: number): boolean {
  return removalCount < MAX_PAID_REMOVALS;
}

export async function placeFlag(
  placerId: string,
  flaggedUserId: string,
  attributeId: string,
  note?: string
) {
  if (placerId === flaggedUserId) throw new Error("Cannot flag yourself");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userFlag.findUnique({
      where: { placerId_flaggedUserId_attributeId: { placerId, flaggedUserId, attributeId } },
    });
    if (existing) return;

    await tx.userFlag.create({ data: { placerId, flaggedUserId, attributeId, note } });

    const publicFlag = await tx.publicFlag.upsert({
      where: { flaggedUserId_attributeId: { flaggedUserId, attributeId } },
      update: { flagCount: { increment: 1 } },
      create: { flaggedUserId, attributeId, flagCount: 1 },
    });

    const newCount = publicFlag.flagCount + 1;
    if (newCount >= PUBLIC_FLAG_THRESHOLD && !publicFlag.isActive) {
      await tx.publicFlag.update({
        where: { id: publicFlag.id },
        data: { isActive: true },
      });
    }
  });
}

export async function removePersonalFlag(
  placerId: string,
  flaggedUserId: string,
  attributeId: string
) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.userFlag.deleteMany({
      where: { placerId, flaggedUserId, attributeId },
    });
    if (deleted.count === 0) return;

    await tx.publicFlag.updateMany({
      where: { flaggedUserId, attributeId, flagCount: { gt: 0 } },
      data: { flagCount: { decrement: 1 } },
    });
  });
}

export async function removePublicFlag(publicFlagId: string) {
  await prisma.publicFlag.update({
    where: { id: publicFlagId },
    data: { isActive: false, removalCount: { increment: 1 } },
  });
}

export async function getFlagStatus(viewerId: string, targetUserId: string) {
  const [myFlags, publicFlags] = await Promise.all([
    prisma.userFlag.findMany({
      where: { placerId: viewerId, flaggedUserId: targetUserId },
      select: { attributeId: true, note: true, createdAt: true },
    }),
    prisma.publicFlag.findMany({
      where: { flaggedUserId: targetUserId, isActive: true },
      select: {
        id: true,
        attributeId: true,
        flagCount: true,
        removalCount: true,
        attribute: { select: { label: true, category: true } },
      },
    }),
  ]);
  return { myFlags, publicFlags };
}
