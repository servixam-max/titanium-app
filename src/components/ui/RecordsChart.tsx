"use client";

import { useMemo, useState } from "react";
import { Trophy, TrendingUp, ChevronDown } from "lucide-react";
import {
  buildExerciseRecordCharts,
  buildRecordsChartGeometry,
  describeRecordPoint,
  type RecordsSessionLike,
} from "@/lib/records-chart";
import { formatThousands } from "@/lib/share-summary";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

// FORTIXAM — gráfica de récords (F3.3).
//
// Una tarjeta en Estadísticas con la evolución del 1RM estimado (Epley, la
// definición única de la app) del ejercicio elegido, y la semana exacta en la
// que se batió el récord vigente, marcada sobre la propia línea. El resumen
// dice el récord con su fecha («88 kg · 23 sep») y matiza cuando la serie del
// récord pasó de 12 repeticiones, el punto donde la estimación deja de ser
// fiable.
//
// Todo lo que se puede decidir sin React vive en `src/lib/records-chart.ts`.
// Aquí solo se pinta: un selector compacto de ejercicio (solo si hay más de
// uno), la gráfica SVG con la banda del récord y una nota honesta sin datos.

interface RecordsChartProps {
  /** Sesiones del usuario (se filtran las completadas dentro). */
  sessions?: RecordsSessionLike[] | null;
  className?: string;
}

export default function RecordsChart({ sessions, className }: RecordsChartProps) {
  const charts = useMemo(() => buildExerciseRecordCharts(sessions ?? []), [sessions]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const selected =
    charts.find((c) => c.exerciseId === selectedId) ?? charts[0] ?? null;

  const geometry = useMemo(
    () => (selected ? buildRecordsChartGeometry(selected.points) : null),
    [selected],
  );

  const sinDatos = charts.length === 0;

  return (
    <section
      className={cn("fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg", className)}
      data-testid="records-chart"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" aria-hidden="true" />
          Récords
        </h3>
        <span className="text-[12px] text-slate-500 dark:text-zinc-400">
          {sinDatos
            ? "1RM estimado por ejercicio"
            : `${charts.length} ${charts.length === 1 ? "ejercicio con marcas" : "ejercicios con marcas"}`}
        </span>
      </div>

      {sinDatos || !selected || !geometry ? (
        <div className="flex flex-col gap-1.5 py-1">
          <span className="text-[13px] text-slate-600 dark:text-zinc-300">
            Aún no hay marcas con peso para dibujar la evolución.
          </span>
          <span className="text-[12px] text-slate-500 dark:text-zinc-400">
            Anota el peso de tus series durante el entreno y aquí aparecerá tu
            1RM estimado, ejercicio a ejercicio.
          </span>
        </div>
      ) : (
        <>
          {/* Ejercicio elegido / selector */}
          {charts.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                haptics.tick();
                setShowSelector((v) => !v);
              }}
              aria-expanded={showSelector}
              aria-label={`Elegir ejercicio: ${selected.exerciseName}`}
              className="fx-press mb-3 flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl bg-[var(--fx-inset)] px-3.5 py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-slate-900 dark:text-white">
                  {selected.exerciseName}
                </span>
                <span className="block text-[12px] text-slate-500 dark:text-zinc-400">
                  {selected.totalPoints}{" "}
                  {selected.totalPoints === 1 ? "sesión registrada" : "sesiones registradas"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 flex-shrink-0 text-slate-500 dark:text-zinc-400 transition-transform",
                  showSelector && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="mb-3 block text-[14px] font-semibold text-slate-900 dark:text-white">
              {selected.exerciseName}
            </span>
          )}

          {showSelector && charts.length > 1 && (
            <div className="mb-3 flex max-h-40 flex-col overflow-y-auto rounded-xl bg-[var(--fx-inset)]">
              {charts.map((chart) => (
                <button
                  key={chart.exerciseId}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setSelectedId(chart.exerciseId);
                    setShowSelector(false);
                  }}
                  aria-pressed={chart.exerciseId === selected.exerciseId}
                  className={cn(
                    "flex min-h-[44px] items-center justify-between gap-2 px-3.5 text-left text-[13px] transition-colors",
                    chart.exerciseId === selected.exerciseId
                      ? "font-bold text-primary"
                      : "text-slate-700 dark:text-zinc-300",
                  )}
                >
                  <span className="truncate">{chart.exerciseName}</span>
                  <span className="fx-num flex-shrink-0 text-[12px] text-slate-500 dark:text-zinc-400">
                    {formatThousands(chart.record.best1RM)} kg
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Resumen del récord vigente */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="fx-num text-2xl text-slate-900 dark:text-white">
                  {formatThousands(selected.record.best1RM)}
                </span>
                <span className="text-[13px] text-slate-500 dark:text-zinc-400">
                  kg · 1RM estimado
                </span>
              </div>
              <span className="mt-0.5 block text-[12px] text-slate-500 dark:text-zinc-400">
                Récord el {selected.record.label} · {selected.recordWeekLabel}
              </span>
            </div>
            <span className="flex-shrink-0 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[12px] font-bold text-cyan-600 dark:text-cyan-400">
              {selected.record.weight} kg × {selected.record.reps}
            </span>
          </div>

          {!selected.reliable && (
            <p className="mb-3 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">
              Este récord salió de una serie de más de 12 repeticiones: la
              estimación es orientativa.
            </p>
          )}

          {/* Gráfica */}
          <div
            role="img"
            aria-label={`Evolución del 1RM estimado en ${selected.exerciseName}: récord de ${formatThousands(selected.record.best1RM)} kg el ${selected.record.label}`}
          >
            <svg
              data-testid="records-chart-svg"
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              className="w-full"
              style={{ height: geometry.height }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="recordsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Banda del récord + línea base */}
              {geometry.recordX !== null && (
                <line
                  x1={geometry.recordX}
                  y1={geometry.plotTop}
                  x2={geometry.recordX}
                  y2={geometry.plotBottom}
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  strokeOpacity="0.55"
                />
              )}

              {geometry.areaPath && (
                <path d={geometry.areaPath} fill="url(#recordsAreaGrad)" />
              )}

              {geometry.linePath && (
                <path
                  d={geometry.linePath}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Jornadas batiendo récord: punto con anillo */}
              {geometry.points.map((g) =>
                g.point.isCurrentRecord ? (
                  <g key={g.point.dateKey}>
                    <circle
                      cx={g.x}
                      cy={g.y}
                      r="7"
                      fill="var(--primary)"
                      fillOpacity="0.18"
                    />
                    <circle
                      cx={g.x}
                      cy={g.y}
                      r="3.5"
                      fill="var(--primary)"
                      stroke="var(--background)"
                      strokeWidth="1.5"
                    />
                  </g>
                ) : g.point.improved ? (
                  <circle
                    key={g.point.dateKey}
                    cx={g.x}
                    cy={g.y}
                    r="3"
                    fill="var(--primary)"
                    stroke="var(--background)"
                    strokeWidth="1.5"
                  />
                ) : (
                  <circle
                    key={g.point.dateKey}
                    cx={g.x}
                    cy={g.y}
                    r="2.5"
                    fill="var(--background)"
                    stroke="var(--primary)"
                    strokeWidth="1.5"
                  />
                ),
              )}
            </svg>

            {/* Fechas: primera y última de la ventana */}
            {geometry.points.length > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                  {geometry.points[0].point.label}
                </span>
                {selected.totalPoints > selected.points.length && (
                  <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                    últimas {selected.points.length} sesiones
                  </span>
                )}
                <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                  {geometry.points[geometry.points.length - 1].point.label}
                </span>
              </div>
            )}
          </div>

          {/* Leyenda del punto de récord: solo cuando el anillo está a la vista */}
          <div className="mt-2 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 flex-shrink-0 text-primary" aria-hidden="true" />
            <span className="text-[12px] text-slate-500 dark:text-zinc-400">
              {selected.recordInWindow
                ? `Anillo: ${describeRecordPoint(selected.record)}`
                : `Tu récord sigue en ${formatThousands(selected.record.best1RM)} kg desde el ${selected.record.label} (fuera de las últimas ${selected.points.length} sesiones).`}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
