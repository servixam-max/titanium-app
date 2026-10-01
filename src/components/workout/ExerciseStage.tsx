"use client";

import { Zap, Clock } from "lucide-react";
import ExerciseImage from "@/components/ui/ExerciseImage";
import SupersetBadge from "./SupersetBadge";
import { Exercise, ExerciseGroup } from "@/lib/types";
import { getSupersetPartner } from "@/lib/workout";
import { getSupersetPartnerInRoutine } from "@/lib/supersets";

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
  // Superserie explícita del ejercicio (F2.3): fuente de verdad supersetGroup.
  const explicitPartner =
    exercise.supersetGroup && routine
      ? getSupersetPartnerInRoutine(routine.exercises, exercise)
      : undefined;
  // Compatibilidad: el badge por grupos autodetectados (pares por categoría)
  // solo se mantiene cuando el ejercicio no tiene supersetGroup explícito.
  const supersetPartnerId = groups ? getSupersetPartner(exercise.id || `ex-${exerciseIndex}`, groups) : undefined;
  let supersetPartner = explicitPartner;
  if (!supersetPartner && supersetPartnerId) {
    supersetPartner = routine?.exercises?.find((ex) => ex.id === supersetPartnerId);
  }

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
          <div className="mt-1.5 flex justify-center">
            <SupersetBadge partnerName={supersetPartner.name} />
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

      {/* Métricas: tres superficies sin bordes, el dato manda */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {/* Objetivo: reps o tiempo */}
        <div className="fx-card flex min-h-[104px] flex-col items-center justify-center gap-1.5 p-3">
          <span className="fx-label-sm flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            {isTimedSet ? "Tiempo" : "Reps"}
          </span>
          <span className="fx-num text-[30px] leading-[1.15] font-semibold text-primary">
            {isTimedSet ? `${timedSeconds}s` : exercise.reps}
          </span>
          <span className="fx-label-sm opacity-70">
            {isTimedSet ? "de trabajo" : "objetivo"}
          </span>
        </div>

        {/* Serie actual */}
        <div className="fx-card flex min-h-[104px] flex-col items-center justify-center gap-1.5 p-3">
          <span className="fx-label-sm">Serie</span>
          <span className="flex items-baseline gap-0.5">
            <span className="fx-num text-[30px] leading-[1.15] font-semibold text-foreground">
              {currentSet}
            </span>
            <span className="fx-num text-[17px] font-medium text-[color:var(--text-tertiary)]">
              /{exercise.sets}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < currentSet - 1
                    ? "w-2.5 h-2.5 bg-primary"
                    : i === currentSet - 1
                      ? "w-4 h-2.5 bg-primary"
                      : "w-2.5 h-2.5 bg-[var(--fx-hairline)]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Descanso */}
        <div className="fx-card flex min-h-[104px] flex-col items-center justify-center gap-1.5 p-3">
          <span className="fx-label-sm flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[color:var(--accent-cyan)]" />
            Descanso
          </span>
          <span className="fx-num text-[30px] leading-[1.15] font-semibold text-[color:var(--accent-cyan)]">
            {exercise.restSeconds}s
          </span>
          <span className="fx-label-sm opacity-70">recuperación</span>
        </div>
      </div>
    </div>
  );
}
