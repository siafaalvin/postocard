import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  username: z.string().min(3).max(30),
  evidence: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { username, evidence } = parsed.data;

  const challenge = await prisma.usernameChallenge.create({
    data: { username, evidence },
    select: { id: true, username: true, status: true, createdAt: true },
  });

  return NextResponse.json(challenge, { status: 201 });
}
