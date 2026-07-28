"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
/* logo uses native img to avoid CSP issues */
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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al crear cuenta");
        setLoading(false);
        return;
      }

      toast.success(data.message || "Cuenta creada. Revisa tu email para confirmar.");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      toast.error("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-auto p-4">
      <img
        src="/banner.png"
        alt=""
        loading="lazy"
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
      />
      <div className="fixed inset-0 bg-black/20 z-[1]" />

      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in">
        <img
          src="/logo_solo.png"
          alt="CosttasHolding"
          width={64}
          height={48}
          loading="lazy"
          className="rounded-2xl object-contain mb-3"
        />
        <h1 className="text-2xl font-bold text-foreground drop-shadow-lg">
          CosttasHolding Manager
        </h1>
        <p className="text-sm text-muted-foreground drop-shadow-md">
          Crea tu cuenta para comenzar
        </p>
      </div>

      <div className="relative z-10 w-full max-w-[400px] bg-card/30 backdrop-blur-2xl rounded-2xl border border-border/40 p-7 shadow-2xl shadow-black/30 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-foreground drop-shadow-md">
            Crear Cuenta
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registra tu cuenta para comenzar
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm text-foreground/80 font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground/70" />
              Nombre completo
            </label>
            <Input
              id="fullName"
              type="text"
              placeholder="Tu nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="bg-muted/50 border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-foreground/80 font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-foreground/80 font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
              Contraseña
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
          <p className="text-sm text-muted-foreground">
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

      <p className="relative z-10 mt-6 text-xs text-muted-foreground/70 drop-shadow-md">
        CosttasHolding Manager v2.0
      </p>
    </div>
  );
}
