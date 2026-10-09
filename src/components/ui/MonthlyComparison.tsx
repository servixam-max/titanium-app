"use client";

import { useMemo } from "react";
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  buildMonthlyComparison,
  describeMonthlyTotal,
  type MonthlyComparison as MonthlyComparisonData,
  type MonthlyTrend,
} from "@/lib/monthly-comparison";
import { type MuscleSessionLike } from "@/lib/muscle-engine";
import { formatThousands } from "@/lib/share-summary";
import { cn } from "@/lib/utils";

// FORTIXAM — comparativa mensual (F3.4).
//
// Una tarjeta en Estadísticas que compara el volumen del mes en curso con el
// mismo tramo del mes pasado, grupo a grupo: qué grupos han subido y cuáles
// han bajado, con las dos barras juntas para leerlo de un vistazo.
//
// El "mismo tramo" es deliberado: los días 1 hasta hoy contra los días 1 hasta
// el mismo día del mes pasado. Medir el mes en curso (a medias) contra un mes
// entero sería una trampa: siempre parecería que se entrena menos. La etiqueta
// del encabezado dice las fechas reales de cada tramo.
//
// Todo lo que se puede decidir sin React vive en `src/lib/monthly-comparison.ts`
// (los porcentajes, el orden, las barras y los casos sin datos). Aquí solo se
// pinta.

const TREND_CHIP: Record<Exclude<MonthlyTrend, "none">, string> = {
  up: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  down: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  equal: "bg-slate-500/10 text-slate-600 dark:text-zinc-300",
  new: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
};

const TREND_ICON: Record<Exclude<MonthlyTrend, "none">, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  equal: Minus,
  new: TrendingUp,
};

interface MonthlyComparisonProps {
  /** Sesiones del usuario (se filtran las completadas dentro). */
  sessions?: MuscleSessionLike[] | null;
  className?: string;
}

/** Chip con la tendencia: "+18 %", "-12 %", "0 %" o "nuevo". */
function TrendChip({
  trend,
  label,
  big = false,
}: {
  trend: MonthlyTrend;
  label: string;
  big?: boolean;
}) {
  if (trend === "none" || !label) return null;
  const Icon = TREND_ICON[trend];
  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-bold",
        big ? "text-[13px]" : "text-[12px]",
        TREND_CHIP[trend],
      )}
    >
      <Icon className={big ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function MonthlyComparison({
  sessions,
  className,
}: MonthlyComparisonProps) {
  const data: MonthlyComparisonData = useMemo(
    () => buildMonthlyComparison(sessions ?? []),
    [sessions],
  );

  return (
    <section
      className={cn("fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg", className)}
      data-testid="monthly-comparison"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-primary" aria-hidden="true" />
          Comparativa Mensual
        </h3>
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          {data.hasData
            ? `${data.groups.length} ${data.groups.length === 1 ? "grupo con actividad" : "grupos con actividad"}`
            : "Grupo a grupo"}
        </span>
      </div>

      {!data.hasData ? (
        <div className="flex flex-col gap-1.5 py-1">
          <span className="text-[13px] text-slate-600 dark:text-zinc-300">
            Aún no hay entrenamientos que comparar.
          </span>
          <span className="text-[12px] text-slate-500 dark:text-zinc-400">
            Cuando entrenes, aquí verás tu volumen por grupo muscular frente al
            mismo tramo del mes pasado.
          </span>
        </div>
      ) : (
        <>
          <span className="block mb-3 text-[12px] text-slate-500 dark:text-zinc-400">
            {data.rangeSummary} · mismo tramo
          </span>

          {/* Total del mes en curso frente al mismo tramo del pasado */}
          <div
            className="mb-1 flex items-center gap-2"
            title={describeMonthlyTotal(data)}
          >
            <span className="fx-num text-2xl text-slate-900 dark:text-white">
              {formatThousands(data.currentTotalKg)}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-zinc-400">
              kg este mes
            </span>
            <span className="ml-auto">
              <TrendChip
                trend={data.totalTrend}
                label={data.totalDeltaLabel}
                big
              />
            </span>
          </div>
          <span className="block mb-4 text-[12px] text-slate-500 dark:text-zinc-400">
            Mes pasado, mismo tramo: {formatThousands(data.previousTotalKg)} kg
          </span>

          {/* Grupo a grupo: dos barras por grupo (este mes / mes pasado) */}
          <div className="flex flex-col gap-3.5">
            {data.groups.map((group) => (
              <div key={group.key} data-group={group.key} data-trend={group.trend}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
                    {group.name}
                  </span>
                  <span className="fx-num text-[12px] text-slate-500 dark:text-zinc-400">
                    {formatThousands(group.currentKg)} kg
                  </span>
                  <TrendChip trend={group.trend} label={group.deltaLabel} />
                </div>
                <div
                  className="mt-1.5 flex flex-col gap-1"
                  role="img"
                  aria-label={
                    `${group.name}: ${formatThousands(group.currentKg)} kg este mes (${data.currentRangeLabel}) ` +
                    `frente a ${formatThousands(group.previousKg)} kg el mes pasado (${data.previousRangeLabel})` +
                    (group.deltaLabel ? `, ${group.deltaLabel}` : "")
                  }
                >
                  <span
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${group.currentBarPct}%`,
                      backgroundColor: group.color,
                    }}
                  />
                  <span
                    className="h-1.5 rounded-full bg-slate-300 dark:bg-white/20"
                    style={{ width: `${group.previousBarPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Leyenda de las dos barras */}
          <div className="mt-4 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-400">
              <span
                className="h-2 w-3.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              Este mes
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-400">
              <span
                className="h-2 w-3.5 rounded-full bg-slate-300 dark:bg-white/20"
                aria-hidden="true"
              />
              Mes pasado
            </span>
          </div>
        </>
      )}
    </section>
  );
}
