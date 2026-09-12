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
        <h2 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(204,255,0,0.25)]">
          {exercise.name}
        </h2>
        {isHIIT && (
          <p className="text-primary-container font-label-caps tracking-[0.2em] text-xs uppercase mt-0.5 font-bold">
            Circuito {circuitNumber} de {totalCircuits}
          </p>
        )}
        {supersetPartner && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs font-semibold">
            <Repeat className="w-3.5 h-3.5" />
            Superset con {supersetPartner.name}
          </div>
        )}
      </div>

      {/* Exercise image */}
      <div
        key={exercise.id + exerciseIndex}
        className="flex-1 min-h-[200px] relative rounded-xl overflow-hidden border border-surface-container-highest animate-fade-in-up"
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
        <div className="bg-[#121218]/95 border-2 border-[#00D68F]/80 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-[0_0_22px_rgba(0,214,143,0.28)]">
          <span className="text-xs font-label-caps text-[#00D68F] uppercase font-bold tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#00D68F] animate-pulse" />
            {isTimedSet ? "TIEMPO" : "REPETICIONES"}
          </span>
          <span className="font-mono font-black text-3xl sm:text-4xl text-[#00D68F] drop-shadow-[0_0_15px_rgba(0,214,143,0.6)] my-1">
            {isTimedSet ? `${timedSeconds}s` : exercise.reps}
          </span>
          <span className="text-[10px] font-label-caps text-zinc-400 font-bold uppercase">
            {isTimedSet ? "segundos de trabajo" : "repeticiones"}
          </span>
        </div>

        {/* Current set */}
        <div className="bg-[#121218]/95 border border-white/20 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-lg">
          <span className="text-xs font-label-caps text-zinc-300 uppercase font-bold tracking-wider">
            SERIE
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-mono font-black text-3xl sm:text-4xl text-white">
              {currentSet}
            </span>
            <span className="font-mono font-bold text-lg text-zinc-500">
              /{exercise.sets}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < currentSet - 1
                    ? "w-2.5 h-2.5 bg-[#00D68F] shadow-[0_0_8px_rgba(0,214,143,0.9)]"
                    : i === currentSet - 1
                      ? "w-4 h-2.5 bg-[#00D68F] shadow-[0_0_10px_rgba(0,214,143,1)]"
                      : "w-2.5 h-2.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Rest duration */}
        <div className="bg-[#121218]/95 border border-cyan-400/40 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-lg">
          <span className="text-xs font-label-caps text-cyan-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            DESCANSO
          </span>
          <span className="font-mono font-black text-3xl sm:text-4xl text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] my-1">
            {exercise.restSeconds}s
          </span>
          <span className="text-[10px] font-label-caps text-zinc-400 font-bold uppercase">
            recuperación
          </span>
        </div>
      </div>
    </div>
  );
}
