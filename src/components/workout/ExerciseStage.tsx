"use client";

import { Zap, Clock, Repeat } from "lucide-react";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { Exercise, ExerciseGroup } from "@/lib/types";
import { getSupersetPartner } from "@/lib/workout";

interface ExerciseStageProps {
  exercise: Exercise;
  currentSet: number;
  exerciseIndex: number;
  isHIIT?: boolean;
  circuitNumber?: number;
  totalCircuits?: number;
  groups?: ExerciseGroup[];
  routine?: { exercises: Exercise[] };
  className?: string;
}

export default function ExerciseStage({
  exercise,
  currentSet,
  exerciseIndex,
  isHIIT = false,
  circuitNumber,
  totalCircuits,
  groups,
  routine,
  className,
}: ExerciseStageProps) {
  const supersetPartnerId = groups ? getSupersetPartner(exercise.id || `ex-${exerciseIndex}`, groups) : undefined;
  const supersetPartner = supersetPartnerId && routine?.exercises?.find((ex) => ex.id === supersetPartnerId);

  const timedSeconds =
    exercise.workSeconds ??
    (() => {
      const m = /(\d+)\s*s/i.exec(exercise.reps || "");
      return m ? Number(m[1]) : 0;
    })();
  const isTimedSet = timedSeconds > 0;

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {/* Name header */}
      <div className="text-center px-2">
        <h2 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {exercise.name}
        </h2>
        {isHIIT && (
          <p className="text-primary-container font-label-caps tracking-[0.2em] text-xs mt-0.5 font-bold">
            Circuito {circuitNumber} de {totalCircuits}
          </p>
        )}
        {supersetPartner && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan text-xs font-semibold">
            <Repeat className="w-3.5 h-3.5" />
            Superset con {supersetPartner.name}
          </div>
        )}
      </div>

      {/* Exercise image */}
      <div
        key={exercise.id + exerciseIndex}
        className="flex-1 min-h-[200px] relative rounded-xl overflow-hidden border-slate-200 dark:border-surface-container-highest animate-fade-in-up"
      >
        <ExerciseImage
          src={exercise.image}
          alt={exercise.name}
          containerClassName="w-full h-full"
        />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {/* Target reps/time */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-2 border-primary/80 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-sm">
          <span className="text-xs font-label-caps text-primary font-bold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            {isTimedSet ? "TIEMPO" : "REPETICIONES"}
          </span>
          <span className="fx-num font-semibold text-3xl sm:text-4xl text-primary my-1">
            {isTimedSet ? `${timedSeconds}s` : exercise.reps}
          </span>
          <span className="text-[12px] font-label-caps text-slate-500 dark:text-zinc-400 font-bold">
            {isTimedSet ? "segundos de trabajo" : "repeticiones"}
          </span>
        </div>

        {/* Current set */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-white/20 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-sm">
          <span className="text-xs font-label-caps text-slate-600 dark:text-zinc-300 font-bold">
            SERIE
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="fx-num font-semibold text-3xl sm:text-4xl text-slate-900 dark:text-white">
              {currentSet}
            </span>
            <span className="font-bold text-lg text-slate-400 dark:text-zinc-500">
              /{exercise.sets}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < currentSet - 1
                    ? "w-2.5 h-2.5 bg-primary shadow-sm"
                    : i === currentSet - 1
                      ? "w-4 h-2.5 bg-primary shadow-sm"
                      : "w-2.5 h-2.5 bg-slate-200 dark:bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Rest duration */}
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-cyan-400/30 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-sm">
          <span className="text-xs font-label-caps text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            DESCANSO
          </span>
          <span className="fx-num font-semibold text-3xl sm:text-4xl text-cyan-600 dark:text-cyan-400 my-1">
            {exercise.restSeconds}s
          </span>
          <span className="text-[12px] font-label-caps text-slate-500 dark:text-zinc-400 font-bold">
            recuperación
          </span>
        </div>
      </div>
    </div>
  );
}
