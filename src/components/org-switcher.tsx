"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/hooks/use-org";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

export function OrgSwitcher() {
  const { org, membership, organizations, switchOrg, refreshOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { locale } = useLocale();

  // Fetch company name from user_settings
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_settings")
        .select("company")
        .eq("user_id", user.id)
        .single();
      if (data?.company) setCompanyName(data.company);
    })();
  }, []);

  const displayName = companyName || org?.name || "Mi organización";

  const handleCreate = async () => {
    if (newName.trim().length < 2) return;
    setCreating(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await switchOrg(data.data.id);
      await refreshOrg();
      setNewName("");
      setShowCreate(false);
      setOpen(false);
      toast.success(t("settings.org_created", locale) || "Organización creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  // If only 1 org, show static name (no dropdown)
  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            {displayName}
          </p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {membership?.role || ""}
          </p>
        </div>
      </div>
    );
  }

  // Multiple orgs: show switcher
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 h-auto py-2.5 px-3 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {membership?.role || ""}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1 bg-popover" align="start">
        <div className="p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
            {t("settings.organizations", locale) || "Organizaciones"}
          </p>
        </div>
        {organizations.map((o) => (
          <button
            key={o.id}
            onClick={() => { switchOrg(o.id); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors min-w-[44px] min-h-[44px]"
          >
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {o.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-foreground truncate flex-1">{o.name}</span>
            {o.id === org?.id && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
        <div className="border-t border-border mt-1 pt-1 p-1">
          {showCreate ? (
            <div className="flex gap-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre..."
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || newName.trim().length < 2}
                className="h-8 px-2"
              >
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-xs h-9"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("settings.new_organization", locale) || "Nueva organización"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
