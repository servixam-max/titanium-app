"use client";

import { motion } from "framer-motion";
import { Activity, X } from "lucide-react";
import { WARMUP_REMINDER_THRESHOLD_DAYS } from "@/lib/warmup-reminder";

interface WarmupReminderBannerProps {
  /** Días desde la última sesión de fuerza completada; `null` si no hay dato. */
  daysSince: number | null;
  /** Cierra el aviso en esta visita (no vuelve a molestar hasta recargar). */
  onDismiss: () => void;
}

/**
 * Aviso discreto (F2.4): solo aparece cuando llevas X días o más sin fuerza.
 * Misma superficie sobria que los accesos rápidos de la home, sin modal ni
 * bloqueo: se descarta con la X y no interrumpe nada.
 */
export default function WarmupReminderBanner({
  daysSince,
  onDismiss,
}: WarmupReminderBannerProps) {
  const visible = daysSince !== null && daysSince >= WARMUP_REMINDER_THRESHOLD_DAYS;
  if (!visible) return null;

  const unit = daysSince === 1 ? "día" : "días";

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-label={`Llevas ${daysSince} ${unit} sin entrenar fuerza`}
      data-testid="warmup-reminder"
      className="fx-inset relative flex min-h-[56px] items-center gap-3 pl-4 pr-11"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
        <Activity className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">
          Llevas {daysSince} {unit} sin entrenar fuerza
        </span>
        <span className="text-[13px] leading-snug text-[color:var(--text-secondary)]">
          Calienta al empezar: movilidad y 2 series de aproximación con carga ligera.
        </span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Descartar aviso de calentamiento"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--text-tertiary)] transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.section>
  );
}
