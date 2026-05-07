import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { removePublicFlag } from "@/lib/flags";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { purpose, userId, tier } = session.metadata ?? {};

    if (purpose === "registration" && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          registrationPaidAt: new Date(),
          renewalDueAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          tier: (tier as "basic" | "plus" | "creator") ?? "basic",
        },
      });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { purpose, userId } = pi.metadata ?? {};

    if (purpose === "view_extension" && userId) {
      await prisma.viewExtension.create({
        data: {
          userId,
          stripePaymentIntentId: pi.id,
          postsGranted: 200,
          usedCount: 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (purpose === "flag_removal") {
      const { publicFlagId, offenseNumber } = pi.metadata ?? {};
      if (publicFlagId) {
        await removePublicFlag(publicFlagId);
        await prisma.flagRemovalPayment.create({
          data: {
            publicFlagId,
            stripePaymentIntentId: pi.id,
            amountCents: pi.amount,
            offenseNumber: Number(offenseNumber ?? 1),
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
