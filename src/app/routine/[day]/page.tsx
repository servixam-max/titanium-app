"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, ArrowRight } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import ModeSelector from "@/components/ui/ModeSelector";
import { routines } from "@/lib/data";
import { TrainingMode } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export default function RoutineConfig() {
  const params = useParams();
  const router = useRouter();
  const day = Number(params.day);
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

      <main className="w-full px-container-padding pt-[80px] flex flex-col gap-section-gap">
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
              <div 
                key={exercise.id} 
                onClick={() => {
                  if (mode === "individual") {
                    setSelectedExerciseIndex(index);
                  }
                }}
                className={`bg-surface-container-low border border-surface-container-highest rounded-lg p-base flex items-center gap-stack-gap min-h-touch-target-min transition-all ${
                  mode === "individual" 
                    ? "cursor-pointer hover:bg-surface-container-high active:scale-95" 
                    : ""
                } ${
                  selectedExerciseIndex === index && mode === "individual"
                    ? "border-primary-container shadow-[0_0_10px_rgba(195,244,0,0.15)]"
                    : ""
                }`}
              >
                <div className="w-16 h-16 rounded bg-surface-container-highest flex-shrink-0 overflow-hidden">
                  {exercise.image ? (
                    <img
                      src={exercise.image}
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary-container" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <span className="font-body-md text-body-md text-on-background font-bold">
                    {exercise.name}
                  </span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    {exercise.sets} Series • {exercise.reps} Repeticiones
                  </span>
                </div>

                {/* Individual mode: show arrow */}
                {mode === "individual" ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    selectedExerciseIndex === index
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 16a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2Z" />
                    </svg>
                  </div>
                )}
              </div>
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
