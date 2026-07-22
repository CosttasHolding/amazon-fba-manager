"use client";

import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}