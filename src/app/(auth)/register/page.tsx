"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) throw error;

      toast.success("Cuenta creada. Revisa tu email para confirmar.");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al crear cuenta";
      toast.error(message);
    } finally {
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
        <img
          src="/logo_solo.png"
          alt="CosttasHolding"
          className="w-16 h-12 rounded-2xl object-contain mb-3"
        />
        <h1 className="text-2xl font-bold text-white drop-shadow-lg">
          CosttasHolding Manager
        </h1>
        <p className="text-sm text-white/70 drop-shadow-md">
          Crea tu cuenta para comenzar
        </p>
      </div>

      <div className="relative z-10 w-full max-w-[400px] bg-[#0a0e1a]/30 backdrop-blur-2xl rounded-2xl border border-white/[0.12] p-7 shadow-2xl shadow-black/30 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-white drop-shadow-md">
            Crear Cuenta
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Registra tu cuenta para comenzar
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-white/80 font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-white/40" />
              Nombre completo
            </label>
            <Input
              type="text"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

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
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-white/80 font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-white/40" />
              Confirmar contraseña
            </label>
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-white/[0.08] border-white/[0.15] text-white placeholder:text-white/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            {"¿"}Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Iniciar Sesión
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