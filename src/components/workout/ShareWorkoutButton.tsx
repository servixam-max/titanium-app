"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  buildWorkoutSummary,
  shareSummaryText,
  type ShareSessionLike,
} from "@/lib/share-summary";

interface ShareWorkoutButtonProps {
  /** Sesión recién completada. */
  session: ShareSessionLike | null | undefined;
  /** Título de la rutina tal y como lo conoce la pantalla. */
  routineTitle?: string | null;
  className?: string;
}

/**
 * Compartir el resumen del entrenamiento (F2.5).
 *
 * Un solo botón: intenta la hoja nativa (Web Share API) y, como el WebView del
 * APK no la implementa, copia el resumen al portapapeles para pegarlo donde el
 * usuario quiera (WhatsApp, notas, chat del gimnasio...). El aviso dice la
 * verdad en cada caso: "Resumen copiado" solo cuando de verdad se copió;
 * cancelar la hoja nativa no se trata como error.
 */
export default function ShareWorkoutButton({
  session,
  routineTitle,
  className,
}: ShareWorkoutButtonProps) {
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const showFlash = (message: string) => {
    setFlash(message);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFlash(null), 2400);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    haptics.tick();
    try {
      const text = buildWorkoutSummary(session, { routineTitle });
      const outcome = await shareSummaryText(text);

      if (outcome.status === "cancelled") {
        // Cerrar la hoja nativa es una decisión del usuario, no un fallo.
        return;
      }
      if (outcome.status === "shared") {
        haptics.success();
        showFlash("Compartido");
        return;
      }
      if (outcome.method === "clipboard" || outcome.method === "legacy-copy") {
        haptics.success();
        showFlash("Resumen copiado");
      } else {
        haptics.error();
        showFlash("No se pudo compartir");
      }
    } finally {
      setBusy(false);
    }
  };

  const copied = flash === "Resumen copiado" || flash === "Compartido";

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      aria-live="polite"
      className={cn(
        "fx-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 text-sm font-bold text-emerald-900 transition-all dark:text-primary",
        "hover:bg-primary/15 active:scale-98 disabled:opacity-70 cursor-pointer shadow-sm",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{flash ?? "Compartir resumen"}</span>
    </button>
  );
}
