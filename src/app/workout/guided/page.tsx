"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Weight,
  Hash,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowLeft,
  Zap,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import RestTimer from "@/components/ui/RestTimer";
import WorkTimer from "@/components/ui/WorkTimer";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  announceExerciseComplete,
  announceNextExercise,
  announceExerciseStart,
  announceRest,
  announceWorkoutComplete,
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
    finishWorkout,
    cancelWorkout,
    setExerciseReps,
    goToExercise,
    startWork,
    skipWork,
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
  } = useAppStore();

  const [repsInput, setRepsInput] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  const routine = activeWorkout.routine;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex;
  const currentSet = activeWorkout.currentSet;
  const currentExercise = routine?.exercises[currentExerciseIndex];
  const isHIIT = routine?.type === "hiit";
  // Time-based set? ("45s" in reps or explicit workSeconds)
  const timedSeconds =
    currentExercise?.workSeconds ??
    (() => {
      const m = /(\d+)\s*s/i.exec(currentExercise?.reps || "");
      return m ? Number(m[1]) : 0;
    })();
  const isTimedSet = timedSeconds > 0;

  // Redirect if workout just finished or no routine
  useEffect(() => {
    if (activeWorkout.justFinished && activeWorkout.session?.completed) {
      router.push("/workout/complete");
      return;
    }
    if (!routine) {
      router.push("/");
      return;
    }
  }, [
    routine,
    activeWorkout.justFinished,
    activeWorkout.session?.completed,
    router,
  ]);

  // Sync audio engine with store settings on mount and when changed
  useEffect(() => {
    setGlobalAudioMode(audioMode);
    setGlobalVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Speak exercise start when switching exercises
  useEffect(() => {
    if (!routine || !currentExercise) return;
    if (audioEnabled && audioMode !== "silent") {
      unlockAudio();
      const timer = setTimeout(() => {
        announceExerciseStart();
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, audioEnabled]);

  // Reps input sync
  useEffect(() => {
    if (currentExercise) {
      setRepsInput(
        String(activeWorkout.exerciseReps[currentExercise.id] ?? ""),
      );
    }
  }, [currentExercise, activeWorkout.exerciseReps]);

  // Auto-start the work timer for time-based (HIIT) sets
  useEffect(() => {
    if (
      routine &&
      isTimedSet &&
      !activeWorkout.isWorking &&
      !activeWorkout.isResting &&
      !activeWorkout.justFinished
    ) {
      startWork(timedSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routine,
    isTimedSet,
    timedSeconds,
    activeWorkout.isWorking,
    activeWorkout.isResting,
    activeWorkout.justFinished,
    currentExerciseIndex,
    currentSet,
  ]);

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

  const totalSetsInRoutine = useMemo(() => {
    return routine.exercises.reduce((sum, ex) => sum + (ex.sets || 3), 0);
  }, [routine]);

  const completedSetsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < currentExerciseIndex; i++) {
      count += routine.exercises[i]?.sets || 3;
    }
    count += Math.max(0, currentSet - 1);
    return count;
  }, [currentExerciseIndex, currentSet, routine]);

  const workoutPercent = Math.min(
    100,
    Math.round((completedSetsCount / Math.max(1, totalSetsInRoutine)) * 100)
  );

  const triggerFeedback = () => {
    setFlashKey((k) => k + 1);
    haptics.tick();
  };

  const handleComplete = () => {
    if (activeWorkout.isWorking) skipWork();

    const targetMatch = currentExercise.reps.match(/\d+/g);
    const targetReps = targetMatch ? parseInt(targetMatch[targetMatch.length - 1], 10) : 10;
    const reps =
      activeWorkout.exerciseReps[currentExercise.id] || targetReps;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();

    const isLastSet = currentSet >= currentExercise.sets;
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const isWorkoutFinishing = isLastSet && isLastExercise;

    if (isWorkoutFinishing) {
      if (audioEnabled) {
        announceWorkoutComplete();
      }
      setTimeout(() => {
        router.push("/workout/complete");
      }, 500);
      return;
    }

    if (isLastSet) {
      const nextEx = routine.exercises[currentExerciseIndex + 1];
      if (nextEx && audioEnabled) {
        announceNextExercise(nextEx.name);
      }
    } else if (
      audioEnabled &&
      audioMode !== "silent" &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      unlockAudio();
      try {
        const utter = new SpeechSynthesisUtterance("Serie completada");
        utter.lang = "es-ES";
        utter.rate = voiceRate || 0.92;
        window.speechSynthesis.speak(utter);
      } catch {}
      announceExerciseComplete();
    } else if (audioEnabled) {
      announceExerciseComplete();
    }

    completeSet(
      currentExerciseIndex,
      currentSet,
      undefined,
      reps,
    );

    if (audioEnabled) {
      announceRest(currentExercise.restSeconds);
    }
  };

  const handleRepeatLastSet = () => {
    const targetSet = Math.max(1, currentSet - 1);
    useAppStore.getState().setWorkoutSet(targetSet);
    triggerFeedback();
  };

  const handleBack = () => setShowExitConfirm(true);

  const handleExit = async (save: boolean) => {
    if (save) {
      await finishWorkout();
      setShowExitConfirm(false);
      router.push("/workout/complete");
    } else {
      cancelWorkout();
      setShowExitConfirm(false);
      router.push("/");
    }
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

      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
          aria-label="Volver atrás"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <SectionTitle
          align="center"
          className="absolute left-1/2 -translate-x-1/2 m-0"
        >
          ENTRENAMIENTO
        </SectionTitle>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Dynamic Top Progress Bar */}
      <div className="w-full bg-[#10141a] h-1.5 relative overflow-hidden flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 transition-all duration-500 shadow-[0_0_12px_rgba(0,245,155,0.7)]"
          style={{ width: `${workoutPercent}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col px-4 py-3 overflow-hidden min-h-0">
        <div className="flex-shrink-0 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary font-mono font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {workoutPercent}% COMPLETADO
            </span>
            <span className="text-zinc-400 font-mono font-bold uppercase tracking-wider text-[11px]">
              SERIE {completedSetsCount}/{totalSetsInRoutine}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {routine.exercises.map((ex, idx) => {
              const state =
                idx < currentExerciseIndex
                  ? "done"
                  : idx === currentExerciseIndex
                    ? "active"
                    : "pending";
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
                  <span
                    className={`text-[10px] font-bold leading-tight text-center max-w-[60px] truncate ${state === "active" ? "text-primary-container" : "text-on-surface-variant"}`}
                  >
                    {ex.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={currentExerciseIndex}
          className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest mb-3 animate-fade-in-up"
        >
          <ExerciseImage
            src={currentExercise.image}
            alt={currentExercise.name}
            containerClassName="w-full h-full"
          />
        </div>

        {/* Large High-Impact Illuminated Exercise HUD */}
        <div className="flex-shrink-0 mb-4 flex flex-col gap-3">
          {/* Exercise Name */}
          <div className="text-center px-2">
            <h2 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(204,255,0,0.25)]">
              {currentExercise.name}
            </h2>
            {isHIIT && (
              <p className="text-primary-container font-label-caps tracking-[0.2em] text-xs uppercase mt-0.5 font-bold">
                Circuito {Math.floor(currentExerciseIndex / 3) + 1} de{" "}
                {Math.ceil(totalExercises / 3)}
              </p>
            )}
          </div>

          {/* Expanded 3-Card High-Visibility Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {/* 1. Target Reps / Time Card (Glowing Neon Lime) */}
            <div className="bg-[#121218]/95 border-2 border-primary-container/80 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-[0_0_22px_rgba(204,255,0,0.28)]">
              <span className="text-xs font-label-caps text-primary-container uppercase font-bold tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary-container animate-pulse" />
                {isTimedSet ? "TIEMPO" : "REPETICIONES"}
              </span>
              <span className="font-mono font-black text-3xl sm:text-4xl text-primary-container drop-shadow-[0_0_15px_rgba(204,255,0,0.6)] my-1">
                {isTimedSet ? `${timedSeconds}s` : currentExercise.reps}
              </span>
              <span className="text-[10px] font-label-caps text-zinc-400 font-bold uppercase">
                {isTimedSet ? "segundos de trabajo" : "repeticiones"}
              </span>
            </div>

            {/* 2. Current Set Card */}
            <div className="bg-[#121218]/95 border border-white/20 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-lg">
              <span className="text-xs font-label-caps text-zinc-300 uppercase font-bold tracking-wider">
                SERIE
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-mono font-black text-3xl sm:text-4xl text-white">
                  {currentSet}
                </span>
                <span className="font-mono font-bold text-lg text-zinc-500">
                  /{currentExercise.sets}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: currentExercise.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < currentSet - 1
                        ? "w-2.5 h-2.5 bg-primary-container shadow-[0_0_8px_rgba(204,255,0,0.9)]"
                        : i === currentSet - 1
                          ? "w-4 h-2.5 bg-primary-container shadow-[0_0_10px_rgba(204,255,0,1)]"
                          : "w-2.5 h-2.5 bg-white/15"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 3. Rest Duration Card */}
            <div className="bg-[#121218]/95 border border-cyan-400/40 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-lg">
              <span className="text-xs font-label-caps text-cyan-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                DESCANSO
              </span>
              <span className="font-mono font-black text-3xl sm:text-4xl text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] my-1">
                {currentExercise.restSeconds}s
              </span>
              <span className="text-[10px] font-label-caps text-zinc-400 font-bold uppercase">
                recuperación
              </span>
            </div>
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
        >
          {currentSet >= currentExercise.sets &&
          currentExerciseIndex >= totalExercises - 1
            ? "FINALIZAR"
            : "COMPLETAR SERIE"}
        </PrimaryButton>
      </footer>

      <RestTimer />
      <WorkTimer />

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
