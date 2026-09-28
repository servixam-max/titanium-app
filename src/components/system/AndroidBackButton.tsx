"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { decideBackAction } from "@/lib/back-navigation";

/**
 * Gesto/botón ATRÁS de Android (F4.3).
 *
 * Sin esto, el gesto lateral del sistema CIERRA la app de golpe en vez de
 * retroceder: es la queja real en un móvil con navegación por gestos.
 *
 * La decisión de "qué toca" vive en `src/lib/back-navigation.ts` (probada en
 * `back-navigation.test.ts`); aquí solo se ejecuta.
 */
export default function AndroidBackButton() {
  useEffect(() => {
    // Solo dentro del APK: en la web el gesto lo gestiona el navegador.
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          const modal = document.querySelector<HTMLElement>(
            '[role="dialog"][aria-modal="true"], [data-back-dismiss]',
          );

          const action = decideBackAction({
            canGoBack: Boolean(canGoBack),
            historyLength: window.history.length,
            pathname: window.location.pathname,
            hasOpenModal: Boolean(modal),
          });

          switch (action) {
            case "close-modal": {
              const closer = modal?.querySelector<HTMLElement>(
                '[data-back-close], button[aria-label*="errar"], button[aria-label*="Cancelar"]',
              );
              if (closer) {
                closer.click();
                return;
              }
              // Modal sin botón de cerrar reconocible: no dejamos al usuario
              // atrapado; se retrocede para no salir de la app.
              window.history.back();
              return;
            }
            case "history-back":
              window.history.back();
              return;
            case "go-home":
              window.location.href = "/";
              return;
            case "exit":
              App.exitApp();
              return;
          }
        });

        if (cancelled) {
          handle.remove();
        } else {
          removeListener = () => handle.remove();
        }
      } catch {
        // Sin el plugin (p. ej. en web), no hay nada que gestionar.
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  return null;
}
