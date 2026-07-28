"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al actualizar la contraseña");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-auto p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background/95 to-background z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent z-[1]" />

      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in">
        <img
          src="/logo_solo.png"
          alt="CosttasHolding"
          width={64}
          height={48}
          className="rounded-2xl object-contain mb-3"
        />
        <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">
          CosttasHolding Manager
        </h1>
      </div>

      <div className="relative z-10 w-full max-w-[400px] bg-card/30 backdrop-blur-2xl rounded-2xl border border-border/40 p-7 shadow-2xl shadow-black/30 animate-fade-in">
        {success ? (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Contraseña Actualizada
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tu contraseña se actualizó correctamente. Redirigiendo al login...
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Verificando sesión...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-foreground drop-shadow-md">
                Nueva Contraseña
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa tu nueva contraseña
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm text-foreground/80 font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Nueva contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-muted/50 border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm text-foreground/80 font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Confirmar contraseña
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-muted/50 border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl bg-destructive/15 border border-destructive/25 px-4 py-3 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {loading ? "Actualizando..." : "Actualizar Contraseña"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Volver al login
          </Link>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-muted-foreground/70 drop-shadow-md">
        CosttasHolding Manager v2.0
      </p>
    </div>
  );
}
