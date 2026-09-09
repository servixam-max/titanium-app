"use client";

import { Zap, Clock } from "lucide-react";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { Exercise } from "@/lib/types";

interface ExerciseStageProps {
  exercise: Exercise;
  currentSet: number;
  exerciseIndex: number;
  isHIIT?: boolean;
  circuitNumber?: number;
  totalCircuits?: number;
  className?: string;
}

export default function ExerciseStage({
  exercise,
  currentSet,
  exerciseIndex,
  isHIIT = false,
  circuitNumber,
  totalCircuits,
  className,
}: ExerciseStageProps) {
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
        <div className="bg-[#121218]/95 border-2 border-primary-container/80 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-[0_0_22px_rgba(204,255,0,0.28)]">
          <span className="text-xs font-label-caps text-primary-container uppercase font-bold tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-primary-container animate-pulse" />
            {isTimedSet ? "TIEMPO" : "REPETICIONES"}
          </span>
          <span className="font-mono font-black text-3xl sm:text-4xl text-primary-container drop-shadow-[0_0_15px_rgba(204,255,0,0.6)] my-1">
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
                    ? "w-2.5 h-2.5 bg-primary-container shadow-[0_0_8px_rgba(204,255,0,0.9)]"
                    : i === currentSet - 1
                      ? "w-4 h-2.5 bg-primary-container shadow-[0_0_10px_rgba(204,255,0,1)]"
                      : "w-2.5 h-2.5 bg-white/15"
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
