import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const Schema = z.object({
  firstName:   z.string().min(1).max(50),
  lastName:    z.string().min(1).max(50),
  email:       z.string().email(),
  username:    z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password:    z.string().min(8),
  zipCode:     z.string().max(10).optional(),
  phoneNumber: z.string().max(20).optional(),
  vouchCode:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { firstName, lastName, email, username, password, zipCode, phoneNumber, vouchCode } = parsed.data;
  const displayName = `${firstName} ${lastName}`.trim();

  const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingEmail) {
    return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username }, select: { id: true, createdAt: true } });
  if (existingUsername) {
    return NextResponse.json({
      error: "username_conflict",
      hint: "That username is taken. Try a variant, or file a challenge if you have an older account elsewhere.",
    }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const skipPayment = process.env.SKIP_PAYMENT_GATE === "true";

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      username,
      displayName,
      passwordHash,
      zipCode: zipCode || undefined,
      phoneNumber: phoneNumber || undefined,
      ...(skipPayment && {
        registrationPaidAt: new Date(),
        renewalDueAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }),
    },
    select: { id: true, email: true, username: true },
  });

  if (vouchCode) {
    const voucher = await prisma.user.findFirst({
      where: { username: vouchCode, tier: { not: "guest" } },
      select: { id: true },
    });
    if (voucher) {
      await prisma.vouch.create({
        data: { voucherId: voucher.id, newUserId: user.id },
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ...user, paymentRequired: !skipPayment }, { status: 201 });
}
