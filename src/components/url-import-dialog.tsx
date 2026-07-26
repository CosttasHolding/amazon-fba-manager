"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2, CheckCircle2, Package, Factory } from "lucide-react";
import { useUrlScrape } from "@/hooks/use-url-scrape";
import { inputClass } from "@/lib/form-constants";

interface UrlImportDialogProps {
  children: React.ReactNode;
}

export function UrlImportDialog({ children }: UrlImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<"product" | "supplier">("product");
  const router = useRouter();
  const urlScrape = useUrlScrape();

  function handleImport() {
    if (!urlScrape.scrapedData) return;

    if (importType === "product") {
      const params = new URLSearchParams();
      if (urlScrape.platform === "amazon") {
        const data = urlScrape.scrapedData;
        if (data.platform === "amazon") {
          if (data.name) params.set("name", data.name);
          if (data.asin) params.set("asin", data.asin);
          if (data.price) params.set("salePrice", String(data.price));
          if (data.weight_kg) params.set("weightKg", String(data.weight_kg));
          if (data.category) params.set("category", data.category);
        }
      }
      router.push(`/products/new?${params.toString()}`);
    } else {
      const params = new URLSearchParams();
      if (urlScrape.platform === "alibaba") {
        const data = urlScrape.scrapedData;
        if (data.platform === "alibaba") {
          if (data.supplier_name) params.set("name", data.supplier_name);
          if (data.country) params.set("country", data.country);
          if (data.moq) params.set("min_order_qty", String(data.moq));
          if (urlScrape.url) params.set("alibaba_url", urlScrape.url);
        }
      }
      router.push(`/suppliers/new?${params.toString()}`);
    }

    setOpen(false);
    urlScrape.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) urlScrape.reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Importar desde URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pegá el link de Amazon o Alibaba
            </Label>
            <div className="relative">
              <Input
                placeholder="https://amazon.com/dp/... o https://alibaba.com/..."
                value={urlScrape.url}
                onChange={(e) => urlScrape.setUrl(e.target.value)}
                className={inputClass + " pr-20"}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {urlScrape.isScraping && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {!urlScrape.isScraping && urlScrape.scrapedData && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            {urlScrape.isScraping && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Extrayendo datos...
              </p>
            )}
            {urlScrape.error && (
              <p className="text-xs text-destructive mt-1">{urlScrape.error}</p>
            )}
            {!urlScrape.isScraping && !urlScrape.error && urlScrape.scrapedData && (
              <p className="text-xs text-green-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Datos extraídos correctamente
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              ¿Qué querés importar?
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={importType === "product" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setImportType("product")}
              >
                <Package className="w-4 h-4 mr-1.5" />
                Producto
              </Button>
              <Button
                type="button"
                variant={importType === "supplier" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setImportType("supplier")}
              >
                <Factory className="w-4 h-4 mr-1.5" />
                Proveedor
              </Button>
            </div>
          </div>

          <Button
            onClick={handleImport}
            disabled={!urlScrape.scrapedData || urlScrape.isScraping}
            className="w-full"
          >
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
