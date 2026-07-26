"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("ERROR logging out", e);
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  return { logout, loggingOut };
}
