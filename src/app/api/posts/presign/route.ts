import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { presignUpload, mediaKey } from "@/lib/storage";
import { z } from "zod";

const TIER_LIMITS: Record<string, { image: number; video: number }> = {
  basic:     { image: 10 * 1024 * 1024,  video: 200 * 1024 * 1024 },
  plus:      { image: 25 * 1024 * 1024,  video: 500 * 1024 * 1024 },
  creator:   { image: 50 * 1024 * 1024,  video: 2 * 1024 * 1024 * 1024 },
  moderator: { image: 50 * 1024 * 1024,  video: 2 * 1024 * 1024 * 1024 },
  admin:     { image: 50 * 1024 * 1024,  video: 2 * 1024 * 1024 * 1024 },
};

const Schema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.tier === "guest") return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { filename, contentType, size } = parsed.data;
  const limits = TIER_LIMITS[session.user.tier] ?? TIER_LIMITS.basic;

  const isVideo = contentType.startsWith("video/");
  const maxSize = isVideo ? limits.video : limits.image;

  if (size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Max ${maxSize / (1024 * 1024)} MB for your tier.` },
      { status: 413 }
    );
  }

  const key = mediaKey(session.user.id, filename);
  const url = await presignUpload(key, contentType);

  return NextResponse.json({ url, key });
}
