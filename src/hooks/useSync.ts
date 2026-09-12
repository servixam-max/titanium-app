"use client";

import { useEffect } from "react";
import { startPeriodicSync, syncNow } from "@/lib/sync";

export function useSync(intervalMs = 60000) {
  useEffect(() => {
    const cleanup = startPeriodicSync(intervalMs);

    const handleOnline = () => syncNow();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncNow();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cleanup();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
