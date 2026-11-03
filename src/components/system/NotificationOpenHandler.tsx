"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { rutaDelAviso } from "@/lib/notification-route";

/**
 * Tocar una notificación abre la pantalla que le toca (F9.2).
 *
 * El aviso del recordatorio ya llevaba `extra.route`, pero nadie escuchaba
 * `localNotificationActionPerformed`: al tocarlo la app se abría donde se
 * hubiera quedado. Aquí se escucha y se navega a la sesión de hoy.
 *
 * Vive en el layout para que funcione en cualquier pantalla (y al arrancar en
 * frío: Capacitor guarda el evento hasta que hay alguien escuchando).
 */
export default function NotificationOpenHandler() {
  const router = useRouter();

  useEffect(() => {
    // En la PWA no hay notificaciones locales: el navegador ya abre la app.
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const handle = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (action) => {
            const ruta = rutaDelAviso(action?.notification?.extra);
            router.push(ruta);
          },
        );

        if (cancelled) {
          await handle.remove();
        } else {
          removeListener = () => void handle.remove();
        }
      } catch {
        // Sin el plugin, tocar el aviso abre la app como siempre: no se rompe
        // nada, solo se pierde el atajo a la sesión de hoy.
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
