import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productos",
  description: "Gestiona tus productos Amazon FBA: precios, costos, ROI y rentabilidad.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}