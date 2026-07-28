import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { registerSchema } from "@/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(buildRateLimitKey(ip, "/api/auth/register"), 3, 3600000);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email, password, fullName } = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      return NextResponse.json(
        { error: "Error al crear la cuenta. Intentalo de nuevo." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Cuenta creada. Revisa tu email para confirmar." });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
