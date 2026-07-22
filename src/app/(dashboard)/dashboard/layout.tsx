import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Resumen general de tu negocio Amazon FBA: métricas, ventas y alertas de stock.",
};

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}