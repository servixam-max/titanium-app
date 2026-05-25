"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Weight } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import RestTimer from "@/components/ui/RestTimer";
import { useAppStore } from "@/lib/store";
import {
  announceExerciseComplete,
  announceNextExercise,
  announceWorkoutComplete,
} from "@/lib/speech";

export default function GuidedWorkout() {
  const router = useRouter();
  const {
    activeWorkout,
    completeSet,
    finishWorkout,
    cancelWorkout,
    setWorkoutWeight,
    audioEnabled,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const isBodyweightHIIT = activeWorkout.routine?.type === "hiit" && activeWorkout.equipmentPref === "bodyweight";

  useEffect(() => {
    if (!activeWorkout.routine) {
      router.push("/");
      return;
    }
    // Show weight prompt if no global weight set (skip for bodyweight HIIT)
    if (activeWorkout.workoutWeight === undefined && activeWorkout.mode === "guided" && !isBodyweightHIIT) {
      setShowWeightPrompt(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout.routine, activeWorkout.workoutWeight, activeWorkout.mode]);

  // Announce exercise name when it changes
  useEffect(() => {
    if (!activeWorkout.routine) return;
    if (audioEnabled && !showWeightPrompt) {
      const ex = activeWorkout.routine.exercises[currentExerciseIndex];
      if (ex) {
        const text = `${ex.name}. ${ex.sets} series de ${ex.reps} repeticiones.`;
        setTimeout(() => {
          import("@/lib/speech").then(({ speak }) => {
            speak(text, 1.0, 1.0);
          });
        }, 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, showWeightPrompt, audioEnabled]);

  if (!activeWorkout.routine) return null;
  const currentExercise = activeWorkout.routine.exercises[currentExerciseIndex];
  if (!currentExercise) return null;

  const totalExercises = activeWorkout.routine.exercises.length;
  const progress = ((currentExerciseIndex + 1) / totalExercises) * 100;
  const workoutWeight = activeWorkout.workoutWeight;

  const handleSetWeight = () => {
    const w = Number(weightInput);
    if (w > 0) {
      setWorkoutWeight(w);
      setShowWeightPrompt(false);
      setWeightInput("");
    }
  };

  const handleComplete = () => {
    // Bodyweight HIIT: no weight needed
    if (!isBodyweightHIIT && !workoutWeight) return;
    
    completeSet(currentExerciseIndex, currentSet, isBodyweightHIIT ? undefined : workoutWeight);

    if (audioEnabled) {
      announceExerciseComplete();
    }
    
    if (currentSet >= currentExercise.sets) {
      if (currentExerciseIndex >= totalExercises - 1) {
        if (audioEnabled) {
          announceWorkoutComplete();
        }
        finishWorkout();
        router.push("/history");
      } else {
        const nextIndex = currentExerciseIndex + 1;
        const nextEx = activeWorkout.routine?.exercises[nextIndex];
        setCurrentExerciseIndex(nextIndex);
        setCurrentSet(1);
        if (audioEnabled && nextEx) {
          setTimeout(() => announceNextExercise(nextEx.name), 500);
        }
      }
    } else {
      setCurrentSet(currentSet + 1);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {/* Weight Prompt Overlay */}
      {showWeightPrompt && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              ¿Qué peso usas?
            </h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Introduce el peso para este entrenamiento guiado.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                className="flex-1 bg-surface-container-high border border-surface-container-highest rounded-xl h-[56px] text-center font-bold text-on-surface text-2xl focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                type="number"
                placeholder="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetWeight()}
                autoFocus
              />
              <span className="font-bold text-on-surface-variant text-lg">kg</span>
            </div>
            <button
              className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              onClick={handleSetWeight}
              disabled={!weightInput || Number(weightInput) <= 0}
            >
              EMPEZAR ENTRENAMIENTO
            </button>
          </div>
        </div>
      )}

      <TopAppBar
        title="ENTRENAMIENTO"
        variant="workout"
        showVolume
        onClose={() => {
          cancelWorkout();
          router.push("/");
        }}
      />

      <main className="pt-[64px] pb-[80px] max-w-app mx-auto px-container-padding flex flex-col h-[100dvh]">
        {/* Progress */}
        <div className="mt-4 mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-primary-container font-label-caps uppercase tracking-widest text-[11px]">
              MODO GUIADO
            </span>
            <span className="text-on-surface-variant font-label-caps uppercase tracking-widest text-[11px]">
              Ejercicio {currentExerciseIndex + 1} de {totalExercises}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full shadow-[0_0_8px_rgba(204,255,0,0.5)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Weight badge */}
        {!isBodyweightHIIT && workoutWeight !== undefined && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-surface-container-highest">
              <Weight className="w-4 h-4 text-primary-container" />
              <span className="font-bold text-primary-container text-sm">{workoutWeight}kg</span>
            </div>
          </div>
        )}

        {/* Exercise Title */}
        <h2 className="font-headline-lg text-center mb-6 tracking-tight">
          {currentExercise.name}
        </h2>

        {/* Exercise Image */}
        <div className="flex-1 min-h-0 w-full bg-surface-container-low rounded-2xl border border-surface-container-highest relative overflow-hidden mb-6 shadow-2xl">
          {currentExercise.image ? (
            <img
              src={currentExercise.image}
              alt={currentExercise.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-24 h-24 text-primary-container opacity-30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
              </svg>
            </div>
          )}
          
          {currentExercise.tempo && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-container-highest/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              <svg className="w-[18px] h-[18px] text-primary-container" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.63 1.53c.56-1.24.87-2.6.87-4.07 0-5.29-4.11-9.59-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-4.89.36-9 4.66-9 9.95 0 5.06 3.8 9.24 8.69 9.88l-1.36-2.15c-.48-.17-.93-.39-1.33-.68zM18.34 17.76l-2.64-1.53c-.25.42-.57.8-.95 1.1l1.36 2.15c.86-.68 1.58-1.51 2.23-2.72zM15 9h-2V5h-2v4H9v6h2v4h2v-4h2v-2h-2V9z" />
              </svg>
              <span className="font-label-caps text-on-surface text-[12px] tracking-widest uppercase">
                Ritmo: {currentExercise.tempo}
              </span>
            </div>
          )}
        </div>

        {/* Info & Action */}
        <div className="mt-auto pb-6">
          <div className="text-center mb-6">
            <p className="text-on-surface-variant font-label-caps tracking-[0.2em] mb-1">
              PRÓXIMA META
            </p>
            <h3 className="font-headline-md text-on-surface">
              SERIE {currentSet} DE {currentExercise.sets}{" "}
              <span className="text-primary-container mx-2">•</span>{" "}
              {currentExercise.reps} REPS
            </h3>
          </div>

          <button
            onClick={handleComplete}
            disabled={!isBodyweightHIIT && !workoutWeight}
            className="w-full bg-primary-container text-on-primary-container font-headline-md h-[72px] rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_8px_24px_rgba(204,255,0,0.2)] disabled:opacity-50"
          >
            <CheckCircle className="w-6 h-6" />
            COMPLETAR SERIE
          </button>
        </div>
      </main>

      <RestTimer />
      <BottomNav />
    </div>
  );
}
