import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración",
  description: "Administra tu perfil, valores FBA por defecto, cálculos y exporta tus datos.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}