import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { updatePasswordSchema } from "@/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(buildRateLimitKey(ip, "/api/auth/update-password"), 5, 3600000);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = updatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Contraseña inválida" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesión inválida o expirada. Solicitá un nuevo reset de contraseña." },
        { status: 401 }
      );
    }

    const { password } = parsed.data;
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar la contraseña." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Contraseña actualizada correctamente." });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
