"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  ArrowRight,
  Plus,
  X,
  Target,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Plan, Routine, TrainingGoal, ExperienceLevel, EquipmentType } from "@/lib/types";
import { plans as presetPlans, routines } from "@/lib/data";
import { savePlan, makeSyncable } from "@/lib/db";
import { buildPlan } from "@/lib/coach";
import { fetchWithAuth } from "@/lib/auth";
import { syncNow } from "@/lib/sync";
import { haptics } from "@/lib/haptics";

interface PlansViewProps {
  activePlan: Plan | null;
  savedPlans: Plan[];
  onPlanActivated: (plan: Plan) => void;
  onSelectRoutine: (routine: Routine) => void;
  currentUserId?: string;
}

const goalLabels: Record<TrainingGoal, { label: string; icon: string; color: string }> = {
  strength: { label: "Fuerza", icon: "💪", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  hypertrophy: { label: "Hipertrofia", icon: "🏋️", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  fat_loss: { label: "Pérdida de grasa", icon: "🔥", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  endurance: { label: "Resistencia", icon: "🏃", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  mobility: { label: "Movilidad", icon: "🧘", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
};

const levelLabels: Record<ExperienceLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export default function PlansView({
  activePlan,
  savedPlans,
  onPlanActivated,
  onSelectRoutine,
  currentUserId = "xam-seed-id",
}: PlansViewProps) {
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);

  // Coach modal state
  const [coachGoal, setCoachGoal] = useState<TrainingGoal>("hypertrophy");
  const [coachLevel, setCoachLevel] = useState<ExperienceLevel>("intermediate");
  const [coachDays, setCoachDays] = useState(3);
  const [coachEquipment, setCoachEquipment] = useState<EquipmentType[]>(["dumbbells", "bodyweight"]);
  const [coachRestrictions, setCoachRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Merge presets with custom saved plans (avoid duplicate IDs)
  const allPlans = useMemo(() => {
    const list: Plan[] = [...savedPlans];
    for (const preset of presetPlans) {
      if (!list.some((p) => p.id === preset.id)) {
        list.push(preset);
      }
    }
    return list;
  }, [savedPlans]);

  const handleActivate = async (plan: Plan) => {
    const planId = plan.id || `plan_${Date.now()}`;
    setIsActivatingId(planId);
    haptics.impact();

    try {
      const fullPlan: Plan = {
        ...makeSyncable(currentUserId),
        ...plan,
        id: planId,
        active: true,
      };

      // Save locally
      await savePlan(fullPlan);

      // Deactivate other saved plans in storage
      for (const p of savedPlans) {
        if (p.id && p.id !== planId && p.active) {
          await savePlan({ ...p, active: false });
        }
      }

      // Try server activation if online & user authenticated
      try {
        await fetchWithAuth(`/api/plans/${planId}/activate`, { method: "PATCH" });
      } catch {
        // Offline fallback
      }

      onPlanActivated(fullPlan);
      syncNow().catch(() => {});
    } finally {
      setIsActivatingId(null);
    }
  };

  const handleCreateCoachPlan = async () => {
    setIsGenerating(true);
    haptics.selection();
    try {
      const generated = buildPlan({
        goal: coachGoal,
        level: coachLevel,
        daysPerWeek: coachDays,
        equipment: coachEquipment,
        restrictions: coachRestrictions,
      });

      const planId = `coach_${Date.now()}`;
      const newPlan: Plan = {
        ...makeSyncable(currentUserId),
        ...generated,
        id: planId,
        active: true,
        recommended: true,
      };

      await savePlan(newPlan);
      // Deactivate others
      for (const p of savedPlans) {
        if (p.id && p.id !== planId && p.active) {
          await savePlan({ ...p, active: false });
        }
      }

      onPlanActivated(newPlan);
      setShowCoachModal(false);
      haptics.success();
      syncNow().catch(() => {});
    } finally {
      setIsGenerating(false);
    }
  };

  const getRoutinesForPlan = (plan: Plan): Routine[] => {
    const dayNumbers = Array.from(new Set(plan.schedule || []));
    return dayNumbers
      .map((d) => routines.find((r) => r.day === d))
      .filter((r): r is Routine => Boolean(r));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[#121622] via-[#101520] to-[#0a0d14] p-5 shadow-[0_0_30px_rgba(0,245,155,0.12)]">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Coach Inteligente v8
            </span>
            <button
              onClick={() => {
                haptics.selection();
                setShowCoachModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary hover:text-black active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Personalizar Plan</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Planes de Entrenamiento
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Selecciona un plan estructurado o deja que el Coach IA diseñe uno según tus objetivos, tiempo disponible y equipo.
            </p>
          </div>
        </div>
      </div>

      {/* Active Plan Spotlight */}
      {activePlan && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-[#121824] p-5 shadow-neon">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-black">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Plan Activo
              </span>
            </div>
            {activePlan.goal && goalLabels[activePlan.goal] && (
              <span
                className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  goalLabels[activePlan.goal].color
                }`}
              >
                {goalLabels[activePlan.goal].icon} {goalLabels[activePlan.goal].label}
              </span>
            )}
          </div>

          <h3 className="text-lg font-black uppercase text-white tracking-tight">
            {activePlan.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-300 line-clamp-2">
            {activePlan.description}
          </p>

          {/* Quick Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Frecuencia</span>
              <span className="text-sm font-black text-primary">{activePlan.daysPerWeek} días/sem</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Duración</span>
              <span className="text-sm font-black text-cyan-400">{activePlan.weeks} semanas</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Nivel</span>
              <span className="text-sm font-black text-white">
                {activePlan.level ? levelLabels[activePlan.level] : "Todos"}
              </span>
            </div>
          </div>

          {/* Routine Sequence */}
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Rutinas del Ciclo Semanal:
            </span>
            <div className="flex flex-wrap gap-2">
              {getRoutinesForPlan(activePlan).map((r) => (
                <button
                  key={r.day}
                  onClick={() => {
                    haptics.light();
                    onSelectRoutine(r);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:border-primary/40 hover:bg-primary/10 active:scale-95 cursor-pointer"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/20 text-[11px] font-black text-primary">
                    D{r.day}
                  </span>
                  <span className="truncate max-w-[160px]">{r.title}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catalog of Plans */}
      <div className="flex flex-col gap-4">
        <h3 className="border-l-2 border-primary pl-2 text-xs font-bold uppercase tracking-wider text-white">
          Todos los Planes Disponibles ({allPlans.length})
        </h3>

        <div className="flex flex-col gap-3">
          {allPlans.map((plan) => {
            const planId = plan.id || plan.name;
            const isActive = activePlan?.id === plan.id || (activePlan?.name === plan.name && activePlan?.active);
            const planRoutines = getRoutinesForPlan(plan);

            return (
              <div
                key={planId}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                  isActive
                    ? "border-primary/60 bg-gradient-to-br from-[#121a22] to-[#0e141c] shadow-neon"
                    : "border-white/10 bg-[#121620] hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-sm font-black uppercase text-white truncate">
                        {plan.name}
                      </h4>
                      {plan.recommended && (
                        <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                      {plan.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-300 font-medium flex-wrap mb-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {plan.daysPerWeek} días/sem
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        {plan.weeks} semanas
                      </span>
                      {plan.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 uppercase font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Preview routines */}
                    <div className="flex flex-wrap gap-1.5">
                      {planRoutines.map((r) => (
                        <button
                          key={r.day}
                          onClick={() => {
                            haptics.light();
                            onSelectRoutine(r);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-black/40 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:text-white hover:border-white/20 active:scale-95 cursor-pointer"
                        >
                          <span className="font-bold text-primary">D{r.day}</span>
                          <span className="truncate max-w-[100px]">{r.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-primary/40 bg-primary/20 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Activo
                      </span>
                    ) : (
                      <button
                        onClick={() => handleActivate(plan)}
                        disabled={isActivatingId === planId}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary px-3 py-2 text-xs font-black uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isActivatingId === planId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Flame className="h-3.5 w-3.5" />
                            <span>Activar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Coach IA */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-primary/50 bg-[#121622] p-6 shadow-[0_0_40px_rgba(0,245,155,0.25)] font-mono max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCoachModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/40">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-base font-black uppercase text-white tracking-tight">
                Generador de Plan Coach IA
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mb-5">
              Personaliza los parámetros para calcular tu rutina óptima con el catálogo integrado de FORTIXAM.
            </p>

            {/* Goal */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-2">
                1. Objetivo Principal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(goalLabels) as TrainingGoal[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      haptics.selection();
                      setCoachGoal(g);
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition-all cursor-pointer ${
                      coachGoal === g
                        ? "border-primary bg-primary/20 text-white shadow-neon"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-base">{goalLabels[g].icon}</span>
                    <span>{goalLabels[g].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-2">
                2. Nivel de Experiencia
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(levelLabels) as ExperienceLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      haptics.selection();
                      setCoachLevel(l);
                    }}
                    className={`rounded-xl border p-2 text-center text-xs font-bold transition-all cursor-pointer ${
                      coachLevel === l
                        ? "border-primary bg-primary/20 text-white shadow-neon"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {levelLabels[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Days per week */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-2">
                3. Días por Semana ({coachDays} días)
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      haptics.selection();
                      setCoachDays(d);
                    }}
                    className={`flex-1 h-10 rounded-xl border font-black text-sm transition-all cursor-pointer ${
                      coachDays === d
                        ? "border-primary bg-primary text-black shadow-neon"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-2">
                4. Equipamiento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    haptics.selection();
                    if (coachEquipment.includes("dumbbells")) {
                      if (coachEquipment.length > 1) {
                        setCoachEquipment(coachEquipment.filter((e) => e !== "dumbbells"));
                      }
                    } else {
                      setCoachEquipment([...coachEquipment, "dumbbells"]);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                    coachEquipment.includes("dumbbells")
                      ? "border-primary bg-primary/20 text-white"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span>Mancuernas</span>
                </button>
                <button
                  onClick={() => {
                    haptics.selection();
                    if (coachEquipment.includes("bodyweight")) {
                      if (coachEquipment.length > 1) {
                        setCoachEquipment(coachEquipment.filter((e) => e !== "bodyweight"));
                      }
                    } else {
                      setCoachEquipment([...coachEquipment, "bodyweight"]);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                    coachEquipment.includes("bodyweight")
                      ? "border-primary bg-primary/20 text-white"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  <Target className="h-4 w-4 text-cyan-400" />
                  <span>Peso Corporal</span>
                </button>
              </div>
            </div>

            {/* Restrictions */}
            <div className="mb-6">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block mb-2">
                5. Restricciones o Lesiones (opcional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={restrictionInput}
                  onChange={(e) => setRestrictionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const clean = restrictionInput.trim().toLowerCase();
                      if (clean && !coachRestrictions.includes(clean)) {
                        setCoachRestrictions([...coachRestrictions, clean]);
                        setRestrictionInput("");
                      }
                    }
                  }}
                  placeholder="Ej: hombro, rodilla, salto..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => {
                    const clean = restrictionInput.trim().toLowerCase();
                    if (clean && !coachRestrictions.includes(clean)) {
                      setCoachRestrictions([...coachRestrictions, clean]);
                      setRestrictionInput("");
                    }
                  }}
                  className="rounded-xl border border-primary/40 bg-primary/20 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-black cursor-pointer"
                >
                  Añadir
                </button>
              </div>
              {coachRestrictions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {coachRestrictions.map((r) => (
                    <span
                      key={r}
                      onClick={() => setCoachRestrictions(coachRestrictions.filter((x) => x !== r))}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-300 cursor-pointer hover:bg-rose-500/20"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      {r}
                      <X className="h-3 w-3 ml-1" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateCoachPlan}
              disabled={isGenerating}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 font-black text-xs uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-neon"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generar y Activar Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
