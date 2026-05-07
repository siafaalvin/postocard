import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { massBlock } from "@/lib/block";
import { z } from "zod";

const Schema = z.object({
  source: z.enum(["user_followers", "post_likers", "comment_likers"]),
  targetId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await massBlock(session.user.id, parsed.data.source, parsed.data.targetId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "EXCEEDS_LIMIT") {
      return NextResponse.json({ error: "Target list exceeds 5,000 users" }, { status: 400 });
    }
    throw err;
  }
}
