"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Package, Mail, Lock, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Error al iniciar sesión");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-auto p-4">
      <img
        src="/banner.png"
        alt=""
        className="fixed inset-0 w-screen h-screen object-cover object-center z-0"
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1]" />

      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-[#0a0e1a]/40 backdrop-blur-xl flex items-center justify-center mb-3 border border-white/[0.15]">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow-lg">
          CosttasHolding Manager
        </h1>
        <p className="text-sm text-white/70 drop-shadow-md">
          Gestión profesional de productos Amazon FBA
        </p>
      </div>

      <div className="relative z-10 w-full max-w-[400px] bg-[#0a0e1a]/30 backdrop-blur-2xl rounded-2xl border border-white/[0.12] p-7 shadow-2xl shadow-black/30 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-white drop-shadow-md">
            Iniciar Sesión
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm text-white/80 font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-white/40" />
              Email
            </label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-white/80 font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-white/40" />
              Contraseña
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/15 border border-destructive/25 px-4 py-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-xs text-white/40 drop-shadow-md">
        CosttasHolding Manager v2.0
      </p>
    </div>
  );
}