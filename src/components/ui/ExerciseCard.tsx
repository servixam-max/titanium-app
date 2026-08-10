"use client";

import { GripVertical, Clock, Timer, Activity, Dumbbell, ArrowRight } from "lucide-react";
import { Exercise } from "@/lib/types";

interface ExerciseCardProps {
  exercise: Exercise;
  index?: number;
  selectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
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
  full_body: "bg-primary-container/20 text-primary-container border-primary-container/30",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Principiante: "text-emerald-300",
  Intermedio: "text-amber-300",
  Avanzado: "text-rose-300",
};

const formatRest = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
};

export default function ExerciseCard({
  exercise,
  index,
  selectable = false,
  isSelected = false,
  onClick,
  compact = false,
}: ExerciseCardProps) {
  const muscleKey = exercise.category || "full_body";
  const muscleColors = MUSCLE_COLORS[muscleKey] || MUSCLE_COLORS.full_body;
  const difficultyColor = exercise.difficulty ? DIFFICULTY_COLORS[exercise.difficulty] || "text-on-surface-variant" : "text-on-surface-variant";

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-surface-container-low border rounded-lg p-base
        flex items-center gap-stack-gap min-h-touch-target-min
        transition-all duration-200 overflow-hidden
        ${selectable ? "cursor-pointer hover:bg-surface-container-high active:scale-[0.98]" : ""}
        ${isSelected
          ? "border-primary-container shadow-[0_0_18px_rgba(204,255,0,0.15)] bg-surface-container-high"
          : "border-surface-container-highest hover:border-surface-variant"
        }
        ${isSelected ? "animate-soft-pulse" : ""}
      `}
    >
      {/* Lime accent strip on selected */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container" />
      )}

      {/* Exercise Image/Icon */}
      <div className={`
        rounded bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden
        ${compact ? "w-14 h-14" : "w-16 h-16"}
      `}>
        {exercise.image ? (
          <img
            src={exercise.image}
            alt={exercise.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Dumbbell className="w-7 h-7 text-primary-container/60" />
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-body-md text-body-md text-on-background font-bold truncate">
            {exercise.name}
          </span>
          {index !== undefined && (
            <span className="font-label-caps text-label-caps text-on-surface-variant flex-shrink-0">
              #{index + 1}
            </span>
          )}
        </div>

        {/* Main meta: sets × reps */}
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          {exercise.sets} Series · {exercise.reps} Reps
        </span>

        {/* Secondary meta: muscle badge, rest, difficulty */}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded-full border ${muscleColors}`}>
            {MUSCLE_LABELS[muscleKey] || muscleKey}
          </span>

          {exercise.restSeconds > 0 && (
            <span className="font-label-caps text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant border border-surface-container-highest flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {formatRest(exercise.restSeconds)}
            </span>
          )}

          {exercise.difficulty && (
            <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest border border-surface-container-highest flex items-center gap-1 ${difficultyColor}`}>
              <Activity className="w-3 h-3" />
              {exercise.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Action / Drag Handle */}
      {selectable ? (
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0
            ${isSelected
              ? "bg-primary-container text-on-primary-container"
              : "bg-surface-container-highest text-on-surface-variant group-hover:bg-surface-container"
            }
          `}
        >
          {isSelected ? (
            <Clock className="w-4 h-4" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
