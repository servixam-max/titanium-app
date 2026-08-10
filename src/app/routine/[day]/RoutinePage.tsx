"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import ModeSelector from "@/components/ui/ModeSelector";
import ExerciseCard from "@/components/ui/ExerciseCard";
import { routines } from "@/lib/data";
import { TrainingMode } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export default function RoutinePage({ day: dayProp }: { day: number }) {
  const router = useRouter();
  const day = dayProp;
  const routine = routines.find((r) => r.day === day);

  const [mode, setMode] = useState<TrainingMode>("guided");
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const { startWorkout, equipmentPreference, setEquipmentPreference } = useAppStore();

  if (!routine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-headline-md text-headline-md text-error">
          Rutina no encontrada
        </p>
      </div>
    );
  }

  const isHIIT = routine.type === "hiit";
  const exercises =
    isHIIT && equipmentPreference === "bodyweight" && routine.alternativeExercises
      ? routine.alternativeExercises
      : routine.exercises;

  const handleStart = (exerciseIndex?: number) => {
    const workoutRoutine = {
      ...routine,
      exercises,
    };

    // Warmup only for guided mode (skip warmup for Extra day)
    if (mode === "guided" && routine.day !== 4) {
      startWorkout(workoutRoutine, mode);
      router.push("/warmup?redirect=/workout/guided");
    } else if (mode === "individual" || (mode === "guided" && routine.day === 4)) {
      // Individual or Extra day: go directly to workout
      const idx = exerciseIndex ?? 0;
      startWorkout(workoutRoutine, mode, idx);
      if (mode === "guided") {
        router.push("/workout/guided");
      } else {
        router.push(`/workout/individual?exercise=${idx}`);
      }
    } else {
      startWorkout(workoutRoutine, mode);
    }
  };

  return (
    <div className="min-h-screen pb-[180px]">
      <TopAppBar
        title="FORTIXAM"
        showBack
        backHref="/"
        showSettings
      />

      <main className="w-full px-container-padding pt-4 flex flex-col gap-section-gap">
        {/* Header */}
        <section className="flex flex-col gap-base">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
            {routine.title}
          </h1>
        </section>

        {/* Equipment Toggle for Day 3 */}
        {isHIIT && (
          <div className="flex flex-col gap-base">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Equipamiento
            </h2>
            <div className="flex p-1 bg-surface-container-low border border-surface-container-highest rounded-full w-full">
              <button
                onClick={() => setEquipmentPreference("dumbbells")}
                className={`flex-1 py-2 px-4 rounded-full font-label-caps text-label-caps transition-all ${
                  equipmentPreference === "dumbbells"
                    ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                Mancuernas
              </button>
              <button
                onClick={() => setEquipmentPreference("bodyweight")}
                className={`flex-1 py-2 px-4 rounded-full font-label-caps text-label-caps transition-all ${
                  equipmentPreference === "bodyweight"
                    ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                Peso Corporal
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <ModeSelector mode={mode} onChange={setMode} />

        {/* Exercise List */}
        <section className="flex flex-col gap-stack-gap">
          <div className="flex justify-between items-end">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Ejercicios ({exercises.length})
            </h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {routine.duration} EST.
            </span>
          </div>

          <div className="flex flex-col gap-base">
            {exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                selectable={mode === "individual"}
                isSelected={mode === "individual" && selectedExerciseIndex === index}
                onClick={() => {
                  if (mode === "individual") {
                    setSelectedExerciseIndex(index);
                  }
                }}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Giant Bottom CTA */}
      <div className="fixed bottom-[72px] w-full z-40 bg-gradient-to-t from-background via-background to-transparent pb-stack-gap pt-8 pointer-events-none">
        <div className="max-w-app mx-auto px-container-padding pointer-events-auto">
          <button
            onClick={() => {
              if (mode === "individual" && selectedExerciseIndex !== null) {
                handleStart(selectedExerciseIndex);
              } else {
                handleStart();
              }
            }}
            className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md font-bold h-[64px] rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-neon-strong hover:shadow-[0_0_40px_rgba(195,244,0,0.25)]"
          >
            <Play className="w-6 h-6 fill-current" />
            {mode === "individual" && selectedExerciseIndex !== null
              ? `EMPEZAR: ${exercises[selectedExerciseIndex]?.name.toUpperCase()}`
              : "INICIAR ENTRENAMIENTO"
            }
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
