import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaKey } from "@/lib/storage";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET!;

const TIER_LIMITS: Record<string, number> = {
  basic: 10 * 1024 * 1024,
  plus: 25 * 1024 * 1024,
  creator: 50 * 1024 * 1024,
  moderator: 50 * 1024 * 1024,
  admin: 50 * 1024 * 1024,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.tier === "guest") return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const maxSize = TIER_LIMITS[session.user.tier] ?? TIER_LIMITS.basic;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File too large. Max ${maxSize / (1024 * 1024)} MB.` }, { status: 413 });
  }

  const key = mediaKey(session.user.id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  return NextResponse.json({ key, url: `${process.env.S3_ENDPOINT}/${BUCKET}/${key}` });
}
