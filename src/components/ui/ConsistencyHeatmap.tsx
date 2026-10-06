"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import {
  buildConsistencySummary,
  describeConsistencyDay,
  type ConsistencySessionLike,
} from "@/lib/consistency";
import { cn } from "@/lib/utils";

// FORTIXAM — heatmap de constancia (F3.2).
//
// Una tarjeta en Estadísticas que enseña de un vistazo los días entrenados de
// las últimas 4 semanas, con intensidad relativa a la mejor jornada (mismo
// espíritu que el mapa de contribuciones de GitHub, que es el patrón que usan
// las apps de fitness actuales). La ventana es lunes a domingo: 3 semanas
// cerradas + la semana en curso, y los días futuros no cuentan como entrenados.
//
// Todo lo que se puede decidir sin React vive en `src/lib/consistency.ts`.
// Aquí solo se pinta: celdas sin texto (con `title` para el ratón y una
// etiqueta global para lectores de pantalla, así no hay 28 nodos hablando).

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"] as const;

const NIVEL_BG: Record<number, string> = {
  0: "",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary/90",
};

interface ConsistencyHeatmapProps {
  /** Sesiones del usuario (se filtran las completadas dentro). */
  sessions?: ConsistencySessionLike[] | null;
  className?: string;
}

export default function ConsistencyHeatmap({
  sessions,
  className,
}: ConsistencyHeatmapProps) {
  const summary = useMemo(
    () => buildConsistencySummary(sessions ?? []),
    [sessions],
  );
  const { weeks, trainedDays, elapsedDays, consistencyPct } = summary;
  const sinEntrenos = trainedDays === 0;

  return (
    <section
      className={cn("fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg", className)}
      data-testid="consistency-heatmap"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
          Constancia
        </h3>
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          Últimas 4 semanas
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        {sinEntrenos ? (
          <span className="text-[13px] text-slate-600 dark:text-zinc-300">
            Aún no hay entrenamientos en estas 4 semanas.
          </span>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="fx-num text-2xl text-slate-900 dark:text-white">
                {trainedDays}
              </span>
              <span className="text-[13px] text-slate-500 dark:text-zinc-400">
                {trainedDays === 1 ? "día entrenado" : "días entrenados"}
              </span>
            </div>
            <span className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
              {consistencyPct} %
            </span>
          </>
        )}
      </div>

      <div
        role="img"
        aria-label={`Constancia de las últimas 4 semanas: ${trainedDays} de ${elapsedDays} días entrenados`}
        className="flex flex-col gap-1.5"
      >
        <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
          {DIAS_SEMANA.map((dia) => (
            <span
              key={dia}
              className="text-center text-[12px] leading-none text-slate-500 dark:text-zinc-400"
            >
              {dia}
            </span>
          ))}
        </div>

        {weeks.map((semana) => (
          <div
            key={semana.startDateKey}
            className="grid grid-cols-7 gap-1.5"
            aria-hidden="true"
          >
            {semana.days.map((dia) => (
              <div
                key={dia.dateKey}
                data-date={dia.dateKey}
                data-level={dia.level}
                data-trained={dia.trained ? "true" : "false"}
                data-today={dia.isToday ? "true" : undefined}
                data-future={dia.isFuture ? "true" : undefined}
                title={describeConsistencyDay(dia)}
                className={cn(
                  "aspect-square w-full rounded-[6px] transition-colors",
                  dia.trained
                    ? NIVEL_BG[dia.level]
                    : "bg-slate-100 dark:bg-white/[0.06]",
                  dia.isFuture && "opacity-40",
                  dia.isToday && "ring-2 ring-primary/70",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          Menos
        </span>
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((nivel) => (
            <span
              key={nivel}
              className={cn(
                "h-2.5 w-2.5 rounded-[3px]",
                nivel === 0
                  ? "bg-slate-100 dark:bg-white/[0.06]"
                  : NIVEL_BG[nivel],
              )}
            />
          ))}
        </div>
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          Más
        </span>
      </div>
    </section>
  );
}
