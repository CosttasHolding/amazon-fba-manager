"use client";

import { OrgProvider } from "@/hooks/use-org";

export function OrgLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>;
}
