"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

/**
 * ¿Está ya rehidratado el estado persistido?
 *
 * Las pantallas que redirigen cuando "no hay rutina" deben esperar a esto:
 * si no, al abrir o RECARGAR una URL de entreno el estado aún está vacío, la
 * página cree que no hay sesión en curso y expulsa al usuario a la home,
 * perdiendo el entreno que estaba haciendo.
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    typeof window === "undefined" ? false : useAppStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    return unsubscribe;
  }, []);

  return hydrated;
}

/**
 * ¿Hay un entreno en curso en el estado persistido?
 *
 * `hasHydrated()` puede ponerse a true un instante ANTES de que el estado
 * persistido se vuelque en el store. En ese hueco (≈140 ms medidos) las
 * pantallas de entreno veían "sin rutina" y expulsaban al usuario a la home.
 * Comprobando el almacenamiento directamente, ese hueco deja de importar.
 */
export function hasPersistedWorkout(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("titanium-storage");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { activeWorkout?: { routine?: unknown } } };
    return Boolean(parsed?.state?.activeWorkout?.routine);
  } catch {
    return false;
  }
}

