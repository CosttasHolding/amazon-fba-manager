import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { resetSchema } from "@/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(buildRateLimitKey(ip, "/api/auth/reset"), 3, 3600000);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Email inválido" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const supabase = await createClient();

    const redirectUrl = new URL("/reset-password", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return NextResponse.json(
        { error: "Error al enviar el email de recuperación." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Si el email está registrado, recibirás un link de recuperación." });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
