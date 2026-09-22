"use client";

import { Play, CheckCircle2, Dumbbell } from "lucide-react";
import { Routine } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { haptics } from "@/lib/haptics";

interface HeroWorkoutCardProps {
  routine: Routine;
  isCompletedToday?: boolean;
  isRecommended?: boolean;
  onStartRoutine: () => void;
  onStartExercise?: (exerciseIndex: number) => void;
  onOpenDetails?: () => void;
}

/**
 * Tarjeta principal: una sola jerarquía. Etiqueta discreta, título grande,
 * una línea de datos y un único botón. Los ejercicios son una tira silenciosa
 * que abre la ficha al tocarla (antes convivían píldoras, caja de métricas con
 * separadores, insignias y dos acciones compitiendo entre sí).
 */
export default function HeroWorkoutCard({
  routine,
  isCompletedToday = false,
  isRecommended = false,
  onStartRoutine,
  onStartExercise,
  onOpenDetails,
}: HeroWorkoutCardProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const dayNumber = routine.day < 10 ? `0${routine.day}` : routine.day;
  const isPersonalized = routine.categoryTag === "personalizado" || routine.day === 18;
  const isHIIT = routine.type === "hiit";

  const eyebrow = isPersonalized
    ? "Sesión libre"
    : isHIIT
      ? `Día ${dayNumber} · HIIT`
      : `Día ${dayNumber}`;

  return (
    <div className="fx-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="fx-label-sm">{eyebrow}</span>
          {isCompletedToday ? (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Hecho hoy
            </span>
          ) : isRecommended ? (
            <span className="fx-label-sm !text-primary">Te toca hoy</span>
          ) : null}
        </div>

        <button
          onClick={() => {
            haptics.selection();
            onOpenDetails?.();
          }}
          className="text-left"
        >
          <h3 className="fx-num text-[26px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
            {routine.title}
          </h3>
        </button>

        {routine.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug text-[color:var(--text-secondary)]">
            {routine.subtitle}
          </p>
        )}
      </div>

      {/* Datos clave: una línea, sin cajas ni separadores */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-[color:var(--text-secondary)]">
        <span>{routine.duration}</span>
        <span className="text-[color:var(--text-tertiary)]">·</span>
        <span>
          {routine.exercises.length} ejercicios · {totalSets} series
        </span>
        <span className="text-[color:var(--text-tertiary)]">·</span>
        <span>{routine.equipment || "Libre"}</span>
      </div>

      {/* Tira de ejercicios: solo imagen, sin etiquetas ni numeritos */}
      {routine.exercises.length > 0 && (
        <div className="no-scrollbar -mx-1 flex items-center gap-2.5 overflow-x-auto px-1 py-0.5">
          {routine.exercises.slice(0, 8).map((ex, idx) => (
            <button
              key={ex.id || idx}
              onClick={() => {
                haptics.selection();
                if (onStartExercise) onStartExercise(idx);
                else onOpenDetails?.();
              }}
              aria-label={`Entrenar solo ${ex.name}`}
              title={`${ex.name} · ${ex.sets} series`}
              className="fx-press h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-[var(--fx-inset)]"
            >
              {ex.image ? (
                <ExerciseImage
                  src={ex.image}
                  alt={ex.name}
                  size="sm"
                  containerClassName="h-full w-full"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[color:var(--text-tertiary)]">
                  <Dumbbell className="h-5 w-5" />
                </span>
              )}
            </button>
          ))}
          {routine.exercises.length > 8 && (
            <span className="fx-label-sm flex-shrink-0 pl-1">+{routine.exercises.length - 8}</span>
          )}
        </div>
      )}

      <button
        onClick={() => {
          haptics.impact();
          onStartRoutine();
        }}
        className="fx-press flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--fx-radius-control)] bg-primary text-[17px] font-semibold text-black"
      >
        <Play className="h-4 w-4 fill-current" />
        Empezar
      </button>
    </div>
  );
}
