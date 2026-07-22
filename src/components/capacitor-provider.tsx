"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    };

    const handleAppStateChange = (state: { isActive: boolean }) => {
      if (state.isActive) {
        document.documentElement.classList.remove("app-backgrounded");
      } else {
        document.documentElement.classList.add("app-backgrounded");
      }
    };

    App.addListener("backButton", handleBackButton);
    App.addListener("appStateChange", handleAppStateChange);

    return () => {
      App.removeAllListeners();
    };
  }, []);

  return <>{children}</>;
}
