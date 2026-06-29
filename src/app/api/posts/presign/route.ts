import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Allow large uploads
export const runtime = "nodejs";

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

function mediaKey(userId: string, filename: string): string {
  const ext = filename.split(".").pop() ?? "bin";
  return `${userId}/${Date.now()}.${ext}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.tier === "guest") return NextResponse.json({ error: "Upgrade required" }, { status: 403 });

  // Read raw body as ArrayBuffer and parse manually
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const maxSize = TIER_LIMITS[session.user.tier] ?? TIER_LIMITS.basic;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File too large. Max ${Math.round(maxSize / (1024 * 1024))} MB.` }, { status: 413 });
  }

  const key = mediaKey(session.user.id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
  } catch (e: any) {
    return NextResponse.json({ error: "Upload failed: " + e.message }, { status: 500 });
  }

  return NextResponse.json({ key });
}
