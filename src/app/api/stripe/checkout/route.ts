import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, PRICES } from "@/lib/stripe";
import { z } from "zod";

const Schema = z.object({ tier: z.enum(["basic", "plus", "creator"]).default("basic") });

const PRICE_MAP: Record<string, number> = {
  basic: PRICES.registration,
  plus: PRICES.plus,
  creator: PRICES.creator,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  const tier = parsed.success ? parsed.data.tier : "basic";

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: PRICE_MAP[tier],
          product_data: {
            name: `Postocard ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
            description: "Annual access · renews in 365 days",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      purpose: "registration",
      tier,
      userId: session?.user.id ?? "",
    },
    success_url: `${origin}/feed?welcome=1`,
    cancel_url: `${origin}/subscribe`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
