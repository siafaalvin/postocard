import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const mediaKey = key.join("/");

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: mediaKey }));
    const body = await res.Body?.transformToByteArray();
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(body, {
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
