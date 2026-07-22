"use client";

import dynamic from "next/dynamic";

const CapacitorProvider = dynamic(
  () => import("@/components/capacitor-provider").then((m) => m.CapacitorProvider),
  { ssr: false }
);

export function CapacitorShell({ children }: { children: React.ReactNode }) {
  return <CapacitorProvider>{children}</CapacitorProvider>;
}
