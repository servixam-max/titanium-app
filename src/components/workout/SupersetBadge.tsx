import { Repeat } from "lucide-react";

interface SupersetBadgeProps {
  /** Nombre del compañero de la superserie, si se conoce. */
  partnerName?: string;
  className?: string;
}

/**
 * Etiqueta visible del par en superserie (F2.3): aparece en las tarjetas del
 * ejercicio y durante el entreno (escenario y previsualización del descanso).
 */
export default function SupersetBadge({
  partnerName,
  className,
}: SupersetBadgeProps) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-xs font-semibold text-accent-cyan ${className ?? ""}`}
      title={
        partnerName
          ? `Superserie encadenada con ${partnerName}`
          : "Superserie encadenada"
      }
    >
      <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
      {partnerName ? `Superserie con ${partnerName}` : "Superserie"}
    </span>
  );
}
