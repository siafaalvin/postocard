import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { placeFlag, removePersonalFlag, getFlagStatus } from "@/lib/flags";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: targetUserId } = await params;
  const data = await getFlagStatus(session.user.id, targetUserId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: flaggedUserId } = await params;
  const { attributeId, note } = await req.json();

  if (!attributeId) {
    return NextResponse.json({ error: "attributeId required" }, { status: 400 });
  }

  try {
    await placeFlag(session.user.id, flaggedUserId, attributeId, note);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place flag";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: flaggedUserId } = await params;
  const { attributeId } = await req.json();

  if (!attributeId) {
    return NextResponse.json({ error: "attributeId required" }, { status: 400 });
  }

  await removePersonalFlag(session.user.id, flaggedUserId, attributeId);
  return NextResponse.json({ success: true });
}
