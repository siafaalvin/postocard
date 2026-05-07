import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { email, username, displayName, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json({ error: `That ${field} is already taken` }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const skipPayment = process.env.SKIP_PAYMENT_GATE === "true";

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      ...(skipPayment && {
        registrationPaidAt: new Date(),
        renewalDueAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }),
    },
    select: { id: true, email: true, username: true },
  });

  return NextResponse.json({ ...user, paymentRequired: !skipPayment }, { status: 201 });
}
