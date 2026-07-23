import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ok: false, error: "URL es requerida" },
        { status: 400 }
      );
    }

    const result = await scrapeUrl(url);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      platform: result.platform,
      data: result.data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
