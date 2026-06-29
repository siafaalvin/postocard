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

export async function GET(req: NextRequest) {
  // Extract key from URL path after /api/media/
  const url = new URL(req.url);
  const mediaKey = url.pathname.replace("/api/media/", "");

  if (!mediaKey) {
    return NextResponse.json({ error: "No key" }, { status: 400 });
  }

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: mediaKey }));
    
    if (!res.Body) {
      return NextResponse.json({ error: "Empty body" }, { status: 404 });
    }

    const bytes = await res.Body.transformToByteArray();
    
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": res.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (e: any) {
    console.error("Media proxy error:", e.name, e.message);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
