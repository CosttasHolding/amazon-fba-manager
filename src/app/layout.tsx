import type { Metadata } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { PWARegister } from "@/components/pwa-register";
import { PWAInstallPrompt } from "@/components/pwa-install";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { CapacitorShell } from "@/components/capacitor-shell";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://amazon-fba-manager-virid.vercel.app"
  ),
  title: {
    default: "CosttasHolding Manager",
    template: "%s | CosttasHolding Manager",
  },
  description:
    "Gestión profesional de productos Amazon FBA. Controla inventario, ventas, proveedores y rentabilidad.",
  keywords: [
    "Amazon FBA",
    "inventory management",
    "product manager",
    "ROI calculator",
    "FBA fees",
    "suppliers",
    "CosttasHolding",
  ],
  authors: [{ name: "CosttasHolding" }],
  openGraph: {
    title: "CosttasHolding Manager",
    description:
      "Gestión profesional de productos Amazon FBA. Controla inventario, ventas, proveedores y rentabilidad.",
    type: "website",
    locale: "es_ES",
  },
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FBA Manager",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/logo_solo.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#0a0c14",
    "msapplication-TileImage": "/logo_solo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  headers().get("x-nonce");
  return (
    <html lang="es" dir="ltr" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.variable} ${plusJakartaSans.variable} font-body`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider>
            <PushNotificationProvider>
              <CapacitorShell>
                {children}
                <Toaster richColors position="top-right" />
                <PWARegister />
                <PWAInstallPrompt />
              </CapacitorShell>
            </PushNotificationProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}