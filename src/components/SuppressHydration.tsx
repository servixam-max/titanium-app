"use client";

import { useEffect } from "react";

export default function SuppressHydration() {
  useEffect(() => {
    // Suppress hydration warnings in development
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || "";
      if (
        message.includes("Hydration") ||
        message.includes("hydrat") ||
        message.includes("did not match")
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
