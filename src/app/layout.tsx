import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Amazon FBA Manager",
    template: "%s | FBA Manager",
  },
  description:
    "Gesti\u00F3n profesional de productos Amazon FBA. Controla inventario, ventas, proveedores y rentabilidad.",
  keywords: [
    "Amazon FBA",
    "inventory management",
    "product manager",
    "ROI calculator",
    "FBA fees",
    "suppliers",
  ],
  authors: [{ name: "FBA Manager" }],
  openGraph: {
    title: "Amazon FBA Manager",
    description:
      "Gesti\u00F3n profesional de productos Amazon FBA. Controla inventario, ventas, proveedores y rentabilidad.",
    type: "website",
    locale: "es_ES",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} ${plusJakartaSans.variable} font-body grain-overlay`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}