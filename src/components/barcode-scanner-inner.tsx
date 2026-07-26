"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Scan, X, Loader2, Smartphone } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { t } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { locale } = useLocale();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-container";

  const stopScanner = useCallback(async () => {
    try {
      await scannerRef.current?.stop();
    } catch (e) {
      console.error("ERROR stopping scanner", e);
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);
    setScanning(true);

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      setError(t("barcode.camera_error", locale));
      setScanning(false);
    }
  }, [onScan, stopScanner, locale]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  return (
    <div className="space-y-3">
      {!scanning && !error && (
        <button
          onClick={startScanner}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-full justify-center"
        >
          <Scan className="w-4 h-4" />
          {t("barcode.scan", locale)}
        </button>
      )}

      {scanning && (
        <div className="space-y-2">
          <div
            id={containerId}
            className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("barcode.scanning", locale)}
            </p>
            <button
              onClick={() => { stopScanner(); onClose?.(); }}
              className="min-w-[44px] min-h-[44px] flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("accessibility.cancel_scan", locale)}
            >
              <X className="w-3 h-3" />
              {t("barcode.cancel", locale)}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/50 transition-colors w-full justify-center"
          >
            {t("barcode.retry", locale)}
          </button>
        </div>
      )}
    </div>
  );
}

export function BarcodeScannerButton({ onScan }: { onScan: (code: string) => void }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <Scan className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("barcode.button", locale)}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4" role="dialog" aria-modal="true" aria-label={t("accessibility.barcode_scanner", locale)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{t("barcode.title", locale)}</h3>
              <button
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label={t("accessibility.close_scanner", locale)}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <BarcodeScanner
              onScan={(code) => {
                onScan(code);
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
