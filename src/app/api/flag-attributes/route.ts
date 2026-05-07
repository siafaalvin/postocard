import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const attributes = await prisma.flagAttribute.findMany({
    select: { id: true, label: true, category: true, type: true },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  // Group by category
  const grouped = attributes.reduce<Record<string, typeof attributes>>(
    (acc, attr) => {
      (acc[attr.category] ??= []).push(attr);
      return acc;
    },
    {}
  );

  return NextResponse.json(grouped);
}
