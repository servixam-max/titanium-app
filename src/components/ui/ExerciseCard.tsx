"use client";

import { GripVertical } from "lucide-react";
import { Exercise } from "@/lib/types";

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
}

export default function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <div className="bg-surface-container-low border border-surface-container-highest rounded-lg p-base flex items-center gap-stack-gap min-h-touch-target-min">
      {/* Exercise Image/Icon */}
      <div className="w-16 h-16 rounded bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden">
        {exercise.image ? (
          <img
            src={exercise.image}
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            className="w-8 h-8 text-primary-container"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
          </svg>
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col">
        <span className="font-body-md text-body-md text-on-background font-bold">
          {exercise.name}
        </span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          {exercise.sets} Series • {exercise.reps} Repeticiones
        </span>
      </div>

      {/* Drag Handle */}
      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
        <GripVertical className="w-4 h-4" />
      </div>
    </div>
  );
}
