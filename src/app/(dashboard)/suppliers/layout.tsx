import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proveedores",
  description: "Gestiona tus proveedores de Alibaba, 1688 y más. Contactos, ratings y tiempos de entrega.",
};

export default function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}