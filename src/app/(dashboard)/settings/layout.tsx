import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuraci\u00F3n",
  description: "Administra tu perfil, valores FBA por defecto, c\u00E1lculos y exporta tus datos.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}