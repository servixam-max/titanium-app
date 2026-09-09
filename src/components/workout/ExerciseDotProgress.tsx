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
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                state === "done"
                  ? "bg-primary-container border-primary-container"
                  : state === "active"
                    ? "bg-background border-primary-container shadow-[0_0_8px_rgba(204,255,0,0.6)]"
                    : "bg-surface-container-highest border-surface-container-highest"
              }`}
            />
            <span
              className={`text-[10px] font-bold leading-tight text-center max-w-[60px] truncate ${state === "active" ? "text-primary-container" : "text-on-surface-variant"}`}
            >
              {ex.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
