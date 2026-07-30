export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { calculateScore } from "@/lib/research/scoring";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = calculateScore(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
