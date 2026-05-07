import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomSlug } from "@/lib/utils";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(100),
  isPublic: z.boolean().default(true),
  userIds: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, isPublic, userIds } = parsed.data;

  const list = await prisma.blockList.create({
    data: {
      ownerId: session.user.id,
      name,
      slug: randomSlug(12),
      isPublic,
      entries: {
        createMany: {
          data: userIds.map((blockedUserId) => ({ blockedUserId })),
          skipDuplicates: true,
        },
      },
    },
  });

  return NextResponse.json(list, { status: 201 });
}
