"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";

const BarcodeScannerInner = dynamic(
  () => import("./barcode-scanner-inner").then((mod) => mod.BarcodeScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

const BarcodeScannerButtonInner = dynamic(
  () => import("./barcode-scanner-inner").then((mod) => mod.BarcodeScannerButton),
  { ssr: false }
);

export function BarcodeScanner(props: ComponentProps<typeof BarcodeScannerInner>) {
  return <BarcodeScannerInner {...props} />;
}

export function BarcodeScannerButton(props: ComponentProps<typeof BarcodeScannerButtonInner>) {
  return <BarcodeScannerButtonInner {...props} />;
}
