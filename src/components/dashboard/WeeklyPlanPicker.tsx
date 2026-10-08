"use client";

import { CalendarDays, Check, Coffee, Dumbbell } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { PLANES_SEMANALES } from "@/lib/weekly-plans";
import type { PlanSemanal, DiaSemana } from "@/lib/weekly-plan";

/**
 * Elección de plan semanal.
 *
 * El plan define qué toca cada día de la semana (lunes Día 1, martes Día 2…),
 * así que la pantalla principal puede decir con seguridad qué hay hoy. Antes no
 * existía: la app repartía las sesiones por un contador de entrenos hechos.
 */

const DIA_CORTO: Record<DiaSemana, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};

interface PlanSemanalCardProps {
  plan: PlanSemanal;
  activo: boolean;
  onElegir: (id: string) => void;
}

function PlanSemanalCard({ plan, activo, onElegir }: PlanSemanalCardProps) {
  const dias = [1, 2, 3, 4, 5, 6, 7] as DiaSemana[];

  return (
    <button
      type="button"
      onClick={() => {
        haptics.selection();
        onElegir(plan.id);
      }}
      aria-pressed={activo}
      className={`relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all active:scale-[0.99] ${
        activo
          ? "border border-primary/60 bg-white shadow-sm dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] dark:shadow-md"
          : "border border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#131626] dark:hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-foreground">{plan.name}</h4>
            {plan.recommended && (
              <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                Recomendado
              </span>
            )}
            {activo && (
              <span className="flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-black">
                <Check className="h-3 w-3" />
                Activo
              </span>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
            {plan.description}
          </p>
        </div>
      </div>

      {/* La semana entera de un vistazo: qué toca cada día */}
      <div className="flex items-center gap-1.5">
        {dias.map((d) => {
          const entrada = plan.week[d];
          const entrena = entrada.dias.length > 0;
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <span className="fx-label-sm">{DIA_CORTO[d]}</span>
              <span
                className={`flex h-7 w-full items-center justify-center rounded-md text-[11px] font-bold ${
                  entrena
                    ? "bg-primary/20 text-primary"
                    : entrada.descansoOpcional
                      ? "bg-[var(--fx-inset)] text-[color:var(--text-tertiary)]"
                      : "bg-[var(--fx-inset)] text-[color:var(--text-tertiary)] opacity-50"
                }`}
                title={
                  entrena
                    ? `Día ${entrada.dias.join(" + ")}`
                    : entrada.descansoOpcional
                      ? "Descanso opcional"
                      : "Descanso"
                }
              >
                {entrena ? entrada.dias.join("·") : entrada.descansoOpcional ? "·" : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[12px] text-[color:var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <Dumbbell className="h-3 w-3" />
          {plan.daysPerWeek > 0 ? `${plan.daysPerWeek} días/semana` : "Sin días fijos"}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {plan.weeks > 0 ? `${plan.weeks} semanas` : "Sin duración"}
        </span>
        <span className="flex items-center gap-1">
          <Coffee className="h-3 w-3" />
          {plan.week[7].descansoOpcional ? "Descanso flexible" : "Descanso fijo"}
        </span>
      </div>

      {plan.recomendacion && (
        <p className="rounded-xl bg-[var(--fx-inset)] p-2.5 text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
          {plan.recomendacion}
        </p>
      )}
    </button>
  );
}

interface WeeklyPlanPickerProps {
  planActivoId: string | null;
  onElegir: (id: string) => void;
}

export default function WeeklyPlanPicker({ planActivoId, onElegir }: WeeklyPlanPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="border-l-2 border-primary pl-2 text-xs font-bold text-foreground">
          Planes semanales
        </h3>
        <p className="pl-2.5 text-[12px] text-[color:var(--text-tertiary)]">
          Elige uno y la pantalla principal te dirá qué toca cada día.
        </p>
      </div>

      {PLANES_SEMANALES.map((plan) => (
        <PlanSemanalCard
          key={plan.id}
          plan={plan}
          activo={planActivoId === plan.id}
          onElegir={onElegir}
        />
      ))}
    </div>
  );
}
