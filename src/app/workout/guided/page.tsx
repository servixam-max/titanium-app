"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Weight, Hash, Home, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import RestTimer from "@/components/ui/RestTimer";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  announceExerciseComplete,
  announceNextExercise,
  announceExerciseStart,
  announceRest,
  setAudioMode as setGlobalAudioMode,
  setVoiceRate as setGlobalVoiceRate,
  unlockAudio,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";

export default function GuidedWorkout() {
  const router = useRouter();
  const {
    activeWorkout,
    completeSet,
    cancelWorkout,
    setExerciseWeight,
    setExerciseReps,
    goToExercise,
    startRest,
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
  } = useAppStore();

  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const routine = activeWorkout.routine;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex;
  const currentSet = activeWorkout.currentSet;
  const currentExercise = routine?.exercises[currentExerciseIndex];
  const isBodyweightHIIT = routine?.type === "hiit" && activeWorkout.equipmentPref === "bodyweight";

  // Redirect if no routine or workout just finished
  useEffect(() => {
    if (!routine) {
      router.push("/");
      return;
    }
    if (activeWorkout.justFinished && activeWorkout.session?.completed) {
      router.push("/workout/complete");
    }
  }, [routine, activeWorkout.justFinished, activeWorkout.session?.completed, router]);

  // Weight prompt when exercise has no weight
  useEffect(() => {
    if (currentExercise && !isBodyweightHIIT && activeWorkout.exerciseWeights[currentExercise.id] === undefined) {
      setShowWeightPrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, activeWorkout.exerciseWeights]);

  // Sync audio engine with store settings on mount and when changed
  useEffect(() => {
    setGlobalAudioMode(audioMode);
    setGlobalVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Speak exercise start when switching exercises
  useEffect(() => {
    if (!routine || !currentExercise || showWeightPrompt) return;
    if (audioEnabled && audioMode !== "silent") {
      unlockAudio();
      const timer = setTimeout(() => {
        announceExerciseStart(
          currentExercise.name,
          currentExercise.sets,
          currentExercise.reps,
          activeWorkout.exerciseWeights[currentExercise.id]
        );
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, showWeightPrompt, audioEnabled]);

  // Reps input sync
  useEffect(() => {
    if (currentExercise) {
      setRepsInput(String(activeWorkout.exerciseReps[currentExercise.id] ?? ""));
    }
  }, [currentExercise, activeWorkout.exerciseReps]);

  // Confirm before leaving the page
  const onBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [onBeforeUnload]);

  if (!routine || !currentExercise) return null;

  const totalExercises = routine.exercises.length;
  const exerciseWeight = activeWorkout.exerciseWeights[currentExercise.id];
  const nextExerciseObj = currentExerciseIndex < totalExercises - 1 ? routine.exercises[currentExerciseIndex + 1] : null;

  const triggerFeedback = () => {
    setFlashKey((k) => k + 1);
    haptics.tick();
  };

  const handleSetWeight = () => {
    const w = Number(weightInput);
    if (!Number.isNaN(w) && w >= 0) {
      setExerciseWeight(currentExercise.id, w);
      setShowWeightPrompt(false);
      setWeightInput("");
    }
  };

  const handleComplete = () => {
    if (!isBodyweightHIIT && exerciseWeight === undefined) return;

    const reps = Number(repsInput) || activeWorkout.exerciseReps[currentExercise.id] || 0;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();
    if (audioEnabled) {
      announceExerciseComplete();
    }

    completeSet(currentExerciseIndex, currentSet, isBodyweightHIIT ? undefined : exerciseWeight, reps);

    const isLastSet = currentSet >= currentExercise.sets;
    if (isLastSet && nextExerciseObj) {
      if (audioEnabled) {
        setTimeout(() => announceNextExercise(nextExerciseObj.name), 1500);
      }
    } else if (audioEnabled) {
      announceRest(currentExercise.restSeconds);
    }

    // Store will call finishWorkout on the very last set; avoid starting rest then.
    if (!(isLastSet && currentExerciseIndex >= totalExercises - 1)) {
      startRest(currentExercise.restSeconds);
    }
  };

  const handleRepeatLastSet = () => {
    const targetSet = Math.max(1, currentSet - 1);
    useAppStore.getState().setWorkoutSet(targetSet);
    triggerFeedback();
  };

  const handleBack = () => setShowExitConfirm(true);

  const handleExit = (save: boolean) => {
    if (!save) cancelWorkout();
    setShowExitConfirm(false);
    router.push("/");
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {flashKey > 0 && (
        <div
          key={flashKey}
          className="fixed inset-0 z-[70] bg-primary-container/30 pointer-events-none animate-flash"
          onAnimationEnd={() => setFlashKey(0)}
        />
      )}

      {showWeightPrompt && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <SectionTitle align="center" className="mb-2">
              {currentExercise.name}
            </SectionTitle>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Introduce el peso para este ejercicio.
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
            <PrimaryButton onClick={handleSetWeight} disabled={!weightInput || Number(weightInput) <= 0}>
              CONTINUAR
            </PrimaryButton>
          </div>
        </div>
      )}

      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
        >
          <Home className="w-4 h-4" />
        </button>
        <SectionTitle align="center" className="absolute left-1/2 -translate-x-1/2 m-0">
          ENTRENAMIENTO
        </SectionTitle>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-4 py-3 overflow-hidden min-h-0">
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-container font-label-caps uppercase tracking-widest text-[11px]">
              MODO GUIADO
            </span>
            <span className="text-on-surface-variant font-label-caps uppercase tracking-widest text-[11px]">
              {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {routine.exercises.map((ex, idx) => {
              const state = idx < currentExerciseIndex ? "done" : idx === currentExerciseIndex ? "active" : "pending";
              return (
                <button
                  key={ex.id}
                  onClick={() => goToExercise(idx)}
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
                  <span className={`text-[10px] font-bold leading-tight text-center max-w-[60px] truncate ${state === "active" ? "text-primary-container" : "text-on-surface-variant"}`}>
                    {ex.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div key={currentExerciseIndex} className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest mb-3 animate-fade-in-up">
          <ExerciseImage
            src={currentExercise.image}
            alt={currentExercise.name}
            containerClassName="w-full h-full"
          />
        </div>

        <div className="flex-shrink-0 mb-3 text-center">
          <h2 className="font-headline-lg text-headline-lg text-primary-container neon-glow">
            {currentExercise.name}
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">
            Serie {currentSet} de {currentExercise.sets} · {currentExercise.reps} reps
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {Array.from({ length: currentExercise.sets }).map((_, i) => {
              const done = i < currentSet - 1;
              const active = i === currentSet - 1;
              return (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    done
                      ? "w-2 h-2 bg-primary-container"
                      : active
                        ? "w-4 h-2 bg-primary-container shadow-neon"
                        : "w-2 h-2 bg-surface-container-highest"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-stretch gap-2 mb-3">
          {!isBodyweightHIIT && (
            <div className="flex-[1.1] flex flex-col bg-surface-container-high border border-surface-container-highest rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-5 h-5 text-primary-container" />
                <span className="text-on-surface-variant font-label-caps text-[11px]">PESO</span>
              </div>
              <button
                onClick={() => {
                  setWeightInput(exerciseWeight !== undefined ? String(exerciseWeight) : "");
                  setShowWeightPrompt(true);
                }}
                className="flex items-baseline gap-1 w-full text-left"
              >
                <span className="font-bold text-on-surface text-2xl">
                  {exerciseWeight !== undefined ? exerciseWeight : "--"}
                </span>
                <span className="font-bold text-on-surface-variant text-sm">kg</span>
              </button>
            </div>
          )}
          <div className={`${isBodyweightHIIT ? "flex-1" : "flex-[0.9]"} flex flex-col bg-surface-container-high border border-surface-container-highest rounded-xl px-3 py-2`}>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-5 h-5 text-primary-container" />
              <span className="text-on-surface-variant font-label-caps text-[11px]">REPS</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              className="w-full bg-transparent font-bold text-on-surface text-2xl outline-none"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
            />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 bg-background border-t border-surface-container-highest z-50">
        {currentSet > 1 && (
          <PrimaryButton
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={handleRepeatLastSet}
            className="mb-2"
          >
            Repetir última serie
          </PrimaryButton>
        )}

        <PrimaryButton
          leftIcon={<CheckCircle className="w-6 h-6" />}
          onClick={handleComplete}
          disabled={!isBodyweightHIIT && exerciseWeight === undefined}
        >
          {currentSet >= currentExercise.sets && currentExerciseIndex >= totalExercises - 1
            ? "FINALIZAR"
            : "COMPLETAR SERIE"}
        </PrimaryButton>
      </footer>

      <RestTimer />

      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm bg-surface-container-low border border-surface-container-highest rounded-2xl p-6">
            <SectionTitle align="center" className="mb-2">
              ¿Salir del entreno?
            </SectionTitle>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Puedes guardar el progreso actual o cancelarlo.
            </p>
            <div className="space-y-2">
              <PrimaryButton onClick={() => handleExit(true)}>
                Guardar y salir
              </PrimaryButton>
              <PrimaryButton variant="danger" onClick={() => handleExit(false)}>
                Cancelar entreno
              </PrimaryButton>
              <button
                className="w-full h-[44px] text-on-surface-variant text-sm active:scale-95"
                onClick={() => setShowExitConfirm(false)}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
