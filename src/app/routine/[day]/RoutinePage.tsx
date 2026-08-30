"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import ModeSelector from "@/components/ui/ModeSelector";
import ExerciseCard from "@/components/ui/ExerciseCard";
import WarmupModal from "@/components/ui/WarmupModal";
import { routines, getExerciseById } from "@/lib/data";
import { TrainingMode } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export default function RoutinePage({ day: dayProp }: { day: number }) {
  const router = useRouter();
  const day = dayProp;
  const routine = routines.find((r) => r.day === day);

  const [mode, setMode] = useState<TrainingMode>("guided");
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<
    number | null
  >(null);
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [targetExerciseIndex, setTargetExerciseIndex] = useState<number>(0);
  const [freeExerciseId, setFreeExerciseId] = useState<string | null>(null);
  const {
    startWorkout,
    equipmentPreference,
    setEquipmentPreference,
    favoriteExerciseIds,
    recentExerciseIds,
    addFavoriteExercise,
    removeFavoriteExercise,
  } = useAppStore();

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
  const hasAlternatives = Boolean(
    routine.alternativeExercises && routine.alternativeExercises.length > 0
  );
  const isFreeDay =
    routine.categoryTag === "personalizado" || routine.day === 11;
  const exercises =
    hasAlternatives &&
    equipmentPreference === "bodyweight" &&
    routine.alternativeExercises
      ? routine.alternativeExercises
      : isFreeDay && freeExerciseId
        ? [getExerciseById(freeExerciseId) || routine.exercises[0]]
        : routine.exercises;

  const handleStart = (exerciseIndex?: number) => {
    setTargetExerciseIndex(exerciseIndex ?? 0);
    setShowWarmupModal(true);
  };

  const handleWarmupConfirm = (wantWarmup: boolean) => {
    setShowWarmupModal(false);
    const workoutRoutine = {
      ...routine,
      exercises,
    };

    const idx = targetExerciseIndex;
    startWorkout(workoutRoutine, mode, idx);

    if (wantWarmup) {
      router.push(
        `/warmup?redirect=/workout/${mode}${mode === "individual" ? `?exercise=${idx}` : ""}`
      );
    } else {
      if (mode === "guided") {
        router.push("/workout/guided");
      } else {
        router.push(`/workout/individual?exercise=${idx}`);
      }
    }
  };

  return (
    <div className="min-h-screen pb-[180px] animate-page-in">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-container-padding pt-4 flex flex-col gap-section-gap">
        {/* Header */}
        <section className="flex flex-col gap-base">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
            {routine.title}
          </h1>
        </section>

        {/* Equipment Toggle if routine has alternatives */}
        {hasAlternatives && (
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
                🏋️ Mancuernas
              </button>
              <button
                onClick={() => setEquipmentPreference("bodyweight")}
                className={`flex-1 py-2 px-4 rounded-full font-label-caps text-label-caps transition-all ${
                  equipmentPreference === "bodyweight"
                    ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                🤸 Peso Corporal
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <ModeSelector mode={mode} onChange={setMode} />

        {/* Free day favorites / recents */}
        {isFreeDay && (
          <section className="flex flex-col gap-stack-gap">
            <div className="flex justify-between items-end">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Favoritos
              </h2>
            </div>
            {favoriteExerciseIds.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Aún no tienes favoritos. Aparecerán los ejercicios que más usas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {favoriteExerciseIds.map((id) => {
                  const ex = getExerciseById(id);
                  if (!ex) return null;
                  const isSelected = freeExerciseId === id;
                  const isFavorite = favoriteExerciseIds.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => setFreeExerciseId(isSelected ? null : id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-primary-container text-on-primary-container border-primary-container shadow-neon"
                          : "bg-surface-container-low text-on-surface border-surface-container-highest"
                      }`}
                    >
                      <span>{ex.name}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFavorite) removeFavoriteExercise(id);
                          else addFavoriteExercise(id);
                        }}
                        className="text-xs"
                      >
                        {isFavorite ? "★" : "☆"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-end mt-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Recientes
              </h2>
            </div>
            {recentExerciseIds.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Aún no hay ejercicios recientes. Haz algún entrenamiento
                primero.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentExerciseIds.map((id) => {
                  const ex = getExerciseById(id);
                  if (!ex) return null;
                  const isSelected = freeExerciseId === id;
                  const isFavorite = favoriteExerciseIds.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => setFreeExerciseId(isSelected ? null : id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-primary-container text-on-primary-container border-primary-container shadow-neon"
                          : "bg-surface-container-low text-on-surface border-surface-container-highest"
                      }`}
                    >
                      <span>{ex.name}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFavorite) removeFavoriteExercise(id);
                          else addFavoriteExercise(id);
                        }}
                        className="text-xs"
                      >
                        {isFavorite ? "★" : "☆"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Exercise List */}
        <section className="flex flex-col gap-stack-gap">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {isFreeDay
                  ? "Ejercicio seleccionado"
                  : `Ejercicios (${exercises.length})`}
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {mode === "individual"
                  ? "⚡ Toca cualquier ejercicio para empezar al instante"
                  : "🧭 Flujo secuencial guiado paso a paso"}
              </p>
            </div>
            <span className="font-label-caps text-label-caps text-primary-container font-bold">
              {routine.duration}
            </span>
          </div>

          <div className="flex flex-col gap-base">
            {exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                mode={mode}
                onClick={() => {
                  if (mode === "individual") {
                    handleStart(index);
                  } else {
                    handleStart(index);
                  }
                }}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom CTA for Guided Mode */}
      {mode === "guided" && (
        <div className="fixed bottom-[72px] w-full z-40 bg-gradient-to-t from-background via-background/90 to-transparent pb-stack-gap pt-8 pointer-events-none">
          <div className="max-w-app mx-auto px-container-padding pointer-events-auto">
            <button
              onClick={() => handleStart(0)}
              className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md font-bold h-[60px] rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-neon hover:shadow-[0_0_30px_rgba(195,244,0,0.3)]"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>INICIAR MODO GUIADO</span>
            </button>
          </div>
        </div>
      )}

      <WarmupModal
        isOpen={showWarmupModal}
        onClose={() => setShowWarmupModal(false)}
        onStartWarmup={() => handleWarmupConfirm(true)}
        onSkipWarmup={() => handleWarmupConfirm(false)}
        routineTitle={routine.title}
      />

      <BottomNav />
    </div>
  );
}
