"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

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
      setError("Error al iniciar sesi\u00f3n");
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "1rem" }}>
      <img src="/banner.png" alt="" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", objectFit: "cover", objectPosition: "center", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.08)", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "rgba(10, 15, 35, 0.40)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.18)" }}>
          <Package style={{ width: "28px", height: "28px", color: "#818cf8" }} />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)", marginBottom: "0.25rem" }}>
          FBA Manager
        </h1>
        <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.95)", textShadow: "0 1px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)" }}>
          {`Gesti\u00f3n profesional de productos Amazon FBA`}
        </p>
      </div>
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "400px", backgroundColor: "rgba(10, 15, 35, 0.30)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.15)", padding: "2rem", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.06) inset" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#ffffff", textShadow: "0 1px 6px rgba(0,0,0,0.5)", marginBottom: "0.25rem" }}>
            {"Iniciar Sesi\u00f3n"}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
            Ingresa tus credenciales para continuar
          </p>
        </div>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Label style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.875rem", fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Email</Label>
            <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ backgroundColor: "rgba(255, 255, 255, 0.10)", border: "1px solid rgba(255, 255, 255, 0.20)", color: "#ffffff", borderRadius: "8px", padding: "0.625rem 0.75rem", fontSize: "0.875rem" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Label style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.875rem", fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{`Contrase\u00f1a`}</Label>
            <Input type="password" placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ backgroundColor: "rgba(255, 255, 255, 0.10)", border: "1px solid rgba(255, 255, 255, 0.20)", color: "#ffffff", borderRadius: "8px", padding: "0.625rem 0.75rem", fontSize: "0.875rem" }} />
          </div>
          {error && (
            <div style={{ backgroundColor: "rgba(239, 68, 68, 0.20)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "8px", padding: "0.625rem 0.75rem", color: "#fca5a5", fontSize: "0.8125rem", textAlign: "center" }}>
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #38bdf8, #0ea5e9)", color: "#ffffff", fontWeight: 600, borderRadius: "8px", padding: "0.625rem", fontSize: "0.9375rem", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 12px rgba(14, 165, 233, 0.35)" }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
      <p style={{ position: "relative", zIndex: 10, marginTop: "1.5rem", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
        Amazon FBA Manager v2.0
      </p>
    </div>
  );
}