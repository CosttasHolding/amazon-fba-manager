"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrgMember } from "@/types";

interface OrgState {
  org: Organization | null;
  membership: OrgMember | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrg: (orgId: string) => Promise<void>;
  refreshOrg: () => Promise<void>;
}

const OrgContext = createContext<OrgState | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrgMember | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrg = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      // Read saved org from DB
      const { data: settings } = await supabase
        .from("user_settings")
        .select("current_org_id")
        .eq("user_id", user.id)
        .single();

      const savedOrgId = settings?.current_org_id;

      const { data: orgMembers } = await supabase
        .from("org_members")
        .select("org_id, role, status, id, joined_at")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!orgMembers || orgMembers.length === 0) {
        setIsLoading(false);
        return;
      }

      const orgIds = orgMembers.map(m => m.org_id);
      const { data: orgs } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds);

      if (!orgs || orgs.length === 0) {
        setIsLoading(false);
        return;
      }

      setOrganizations(orgs as Organization[]);

      let currentOrgId = savedOrgId && orgIds.includes(savedOrgId)
        ? savedOrgId
        : orgs[0].id;

      const currentOrg = orgs.find(o => o.id === currentOrgId) || orgs[0];
      const currentMembership = orgMembers.find(m => m.org_id === currentOrg.id);

      setOrg(currentOrg as Organization);
      setMembership(currentMembership ? {
        id: currentMembership.id,
        org_id: currentMembership.org_id,
        user_id: user.id,
        role: currentMembership.role as OrgMember["role"],
        status: currentMembership.status as OrgMember["status"],
        joined_at: currentMembership.joined_at,
      } : null);

      // Save to DB
      await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          current_org_id: currentOrg.id,
        }, { onConflict: "user_id" });
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  const switchOrg = useCallback(async (orgId: string) => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          current_org_id: orgId,
        }, { onConflict: "user_id" });
    }
    await loadOrg();
  }, [loadOrg]);

  return (
    <OrgContext.Provider value={{ org, membership, organizations, isLoading, switchOrg, refreshOrg: loadOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
