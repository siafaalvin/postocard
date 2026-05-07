import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPublicFlagRemovalPrice, canRemovePublicFlag } from "@/lib/flags";

type Params = { params: Promise<{ publicFlagId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { publicFlagId } = await params;

  const flag = await prisma.publicFlag.findUnique({
    where: { id: publicFlagId },
    select: { id: true, flaggedUserId: true, removalCount: true, isActive: true },
  });

  if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (flag.flaggedUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!flag.isActive) {
    return NextResponse.json({ error: "Flag is not currently active" }, { status: 400 });
  }
  if (!canRemovePublicFlag(flag.removalCount)) {
    return NextResponse.json({ error: "Maximum removals reached" }, { status: 400 });
  }

  const amountCents = getPublicFlagRemovalPrice(flag.removalCount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata: {
      purpose: "flag_removal",
      publicFlagId: flag.id,
      userId: session.user.id,
      offenseNumber: String(flag.removalCount + 1),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, amountCents });
}
