"use client";

import { Clock, Layers, ChevronRight, Star, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Routine } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";

interface RoutineCardProps {
  routine: Routine;
  showEquipmentToggle?: boolean;
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Piernas",
  core: "Core",
  full_body: "Full body",
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  back: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  shoulders: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  biceps: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  triceps: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  legs: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  core: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  full_body:
    "bg-primary-container/20 text-primary-container border-primary-container/30",
};

export default function RoutineCard({
  routine,
}: RoutineCardProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);

  const muscleGroups = Array.from(
    new Set(
      routine.exercises
        .map((ex) => ex.category)
        .filter((cat): cat is string => Boolean(cat)),
    ),
  );

  const isPersonalized =
    routine.categoryTag === "personalizado" || routine.day === 11;
  const isHIIT = routine.type === "hiit";

  // Format day label
  const dayLabel = isPersonalized
    ? "EXTRA"
    : isHIIT
      ? `DÍA ${routine.day} · HIIT`
      : `DÍA ${routine.day < 10 ? `0${routine.day}` : routine.day}`;

  return (
    <Link
      href={`/routine/${routine.day}`}
      className="group block bg-surface-container-low/90 backdrop-blur-md rounded-2xl border border-surface-container-highest/80 overflow-hidden relative shadow-lg transition-all duration-300 hover:border-primary-container/60 hover:shadow-[0_8px_30px_rgba(204,255,0,0.12)] active:scale-[0.98]"
    >
      {/* Top Header Strip */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-white/5 bg-gradient-to-r from-surface-container/60 to-surface-container-low/40">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary-container text-black shadow-sm">
              {dayLabel}
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-primary-container" />
              {routine.duration}
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded-full">
              <Layers className="w-3 h-3 text-primary-container" />
              {totalSets} series
            </span>
          </div>

          <h3 className="font-headline-md text-lg text-white font-bold tracking-wide mt-1 truncate group-hover:text-primary-container transition-colors">
            {routine.title}
          </h3>
          <p className="text-xs text-on-surface-variant line-clamp-1">
            {routine.subtitle}
          </p>
        </div>

        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-primary-container group-hover:text-black transition-all flex-shrink-0 mt-1">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Exercise Preview Gallery */}
      <div className="p-3.5 bg-black/20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
          <span>{routine.exercises.length} Ejercicios incluidos:</span>
          {isPersonalized && (
            <Star className="w-3.5 h-3.5 text-primary-container fill-primary-container" />
          )}
        </div>

        {/* Thumbnail row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {routine.exercises.slice(0, 4).map((ex, idx) => (
            <div
              key={ex.id || idx}
              className="flex items-center gap-2 bg-surface-container-high/90 border border-white/10 rounded-xl p-1.5 pr-3 flex-shrink-0 max-w-[190px]"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                {ex.image ? (
                  <ExerciseImage
                    src={ex.image}
                    alt={ex.name}
                    containerClassName="w-full h-full"
                    className="object-cover"
                    fallbackIcon={<Dumbbell className="w-5 h-5 text-primary-container/70" />}
                  />
                ) : (
                  <Dumbbell className="w-5 h-5 text-primary-container/70" />
                )}
              </div>
              <span className="text-[11px] font-bold text-on-surface truncate">
                {ex.name}
              </span>
            </div>
          ))}

          {routine.exercises.length > 4 && (
            <div className="flex-shrink-0 h-13 px-3 rounded-xl bg-surface-container-highest/90 border border-white/10 flex items-center justify-center text-[11px] font-bold text-primary-container">
              +{routine.exercises.length - 4} más
            </div>
          )}
        </div>

        {/* Muscle group chips */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {muscleGroups.map((group) => {
              const colors = MUSCLE_COLORS[group] || MUSCLE_COLORS.full_body;
              return (
                <span
                  key={group}
                  className={`font-label-caps text-[9px] px-2 py-0.5 rounded-full border ${colors}`}
                >
                  {MUSCLE_LABELS[group] || group}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
