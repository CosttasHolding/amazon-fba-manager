import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Control de stock de tus productos Amazon FBA: disponible, en tránsito y warehouse.",
};

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}