"use client";

import { Exercise } from "@/lib/types";

interface ExerciseDotProgressProps {
  exercises: Exercise[];
  currentExerciseIndex: number;
  onSelect?: (index: number) => void;
}

export default function ExerciseDotProgress({
  exercises,
  currentExerciseIndex,
  onSelect,
}: ExerciseDotProgressProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
      {exercises.map((ex, idx) => {
        const state =
          idx < currentExerciseIndex
            ? "done"
            : idx === currentExerciseIndex
              ? "active"
              : "pending";
        return (
          <button
            key={ex.id}
            onClick={() => onSelect?.(idx)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 min-w-[44px] ${state === "active" ? "opacity-100" : "opacity-60"}`}
            aria-label={ex.name}
          >
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all ${
                state === "done"
                  ? "bg-primary border-primary shadow-sm"
                  : state === "active"
                    ? "bg-white dark:bg-black border-primary shadow-sm scale-110"
                    : "bg-slate-300 dark:bg-white/20 border-slate-300 dark:border-white/20"
              }`}
            />
            <span
              className={`text-[10px] font-mono font-bold leading-tight text-center max-w-[60px] truncate ${
                state === "active" ? "text-primary font-bold" : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              {ex.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
