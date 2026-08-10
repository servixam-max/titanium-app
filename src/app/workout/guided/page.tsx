"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Weight, Hash, ArrowLeft, Home, Volume2, VolumeX, SkipForward, Clock, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  announceExerciseComplete,
  announceNextExercise,
  announceWorkoutComplete,
  announceExerciseStart,
  announceCountdown,
  announceRest,
  announceTenSecondsLeft,
  announceHalfRest,
  playRestEndAlarm,
} from "@/lib/audio";

export default function GuidedWorkout() {
  const router = useRouter();
  const {
    activeWorkout,
    completeSet,
    finishWorkout,
    cancelWorkout,
    setExerciseWeight,
    setExerciseReps,
    skipRest,
    startRest,
    audioEnabled,
    toggleAudio,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [showRest, setShowRest] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const restStartTime = useRef<number>(0);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tenAnnouncedRef = useRef(false);
  const halfAnnouncedRef = useRef(false);

  const routine = activeWorkout.routine;
  const currentExercise = routine?.exercises[currentExerciseIndex];
  const isBodyweightHIIT = routine?.type === "hiit" && activeWorkout.equipmentPref === "bodyweight";

  // Redirect if no routine
  useEffect(() => {
    if (!routine) {
      router.push("/");
    }
  }, [routine, router]);

  // Sync index/store
  useEffect(() => {
    setCurrentExerciseIndex(activeWorkout.currentExerciseIndex);
    setCurrentSet(activeWorkout.currentSet);
  }, [activeWorkout.currentExerciseIndex, activeWorkout.currentSet]);

  // Weight prompt when exercise has no weight
  useEffect(() => {
    if (currentExercise && !isBodyweightHIIT && activeWorkout.exerciseWeights[currentExercise.id] === undefined) {
      setShowWeightPrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, activeWorkout.exerciseWeights]);

  // Speak exercise start when switching exercises
  useEffect(() => {
    if (!routine || !currentExercise || showWeightPrompt) return;
    if (audioEnabled) {
      const timer = setTimeout(() => {
        announceExerciseStart(currentExercise.name, currentExercise.sets, currentExercise.reps, activeWorkout.exerciseWeights[currentExercise.id]);
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

  // Precise rest timer
  useEffect(() => {
    if (!showRest || restTime <= 0) return;
    restStartTime.current = Date.now();
    tenAnnouncedRef.current = false;
    halfAnnouncedRef.current = false;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - restStartTime.current) / 1000);
      const baseRest = restTotal || currentExercise?.restSeconds || 60;
      const remaining = Math.max(0, baseRest - elapsed);
      setRestTime(remaining);

      if (audioEnabled) {
        // Aviso a mitad del descanso (solo descansos largos)
        if (!halfAnnouncedRef.current && baseRest >= 60 && remaining === Math.floor(baseRest / 2)) {
          halfAnnouncedRef.current = true;
          announceHalfRest(remaining);
        }
        // Aviso hablado a los 10 segundos
        if (!tenAnnouncedRef.current && remaining === 10 && baseRest > 15) {
          tenAnnouncedRef.current = true;
          announceTenSecondsLeft();
        }
        // Cuenta atrás 3-2-1
        if (remaining === 3) announceCountdown(3);
        if (remaining === 2) announceCountdown(2);
        if (remaining === 1) announceCountdown(1);
      }

      if (remaining <= 0) {
        setShowRest(false);
        if (audioEnabled) {
          playRestEndAlarm();
        }
        handleRestFinished();
      }
    };

    tick();
    restTimerRef.current = setInterval(tick, 250);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRest, audioEnabled, restTotal]);

  const handleRestFinished = () => {
    // Store already advanced exercise/set when completeSet ran; just hide the overlay.
    setCurrentSet(activeWorkout.currentSet);
    setCurrentExerciseIndex(activeWorkout.currentExerciseIndex);
  };

  if (!routine || !currentExercise) return null;

  const totalExercises = routine.exercises.length;
  const progress = ((currentExerciseIndex + 1) / totalExercises) * 100;
  const exerciseWeight = activeWorkout.exerciseWeights[currentExercise.id];
  const nextExerciseObj = currentExerciseIndex < totalExercises - 1 ? routine.exercises[currentExerciseIndex + 1] : null;

  const handleSetWeight = () => {
    const w = Number(weightInput);
    if (w > 0) {
      setExerciseWeight(currentExercise.id, w);
      setShowWeightPrompt(false);
      setWeightInput("");
    }
  };

  const handleComplete = () => {
    if (!isBodyweightHIIT && exerciseWeight === undefined) return;

    const reps = Number(repsInput) || activeWorkout.exerciseReps[currentExercise.id] || 0;
    setExerciseReps(currentExercise.id, reps);

    setFlashKey((k) => k + 1);
    if (audioEnabled) {
      announceExerciseComplete();
    }

    completeSet(currentExerciseIndex, currentSet, isBodyweightHIIT ? undefined : exerciseWeight, reps);

    // If this was the last set of the last exercise, finish the workout
    const isLastSet = currentSet >= currentExercise.sets;
    if (isLastSet && currentExerciseIndex >= totalExercises - 1) {
      if (audioEnabled) {
        announceWorkoutComplete();
      }
      finishWorkout();
      router.push("/workout/complete");
      return;
    }

    // Show rest overlay and announce next exercise when advancing
    if (isLastSet && nextExerciseObj) {
      if (audioEnabled) {
        setTimeout(() => announceNextExercise(nextExerciseObj.name), 1500);
      }
    } else if (audioEnabled) {
      announceRest(currentExercise.restSeconds);
    }

    setShowRest(true);
    setRestTime(currentExercise.restSeconds);
    setRestTotal(currentExercise.restSeconds);
    startRest(currentExercise.restSeconds);
  };

  const handleBack = () => setShowExitConfirm(true);

  const handleExit = (save: boolean) => {
    if (!save) cancelWorkout();
    setShowExitConfirm(false);
    router.push("/");
  };

  const skipRestNow = () => {
    setShowRest(false);
    skipRest();
    if (restTimerRef.current) clearInterval(restTimerRef.current);
  };

  const adjustRest = (delta: number) => {
    const newTime = Math.max(5, restTime + delta);
    setRestTime(newTime);
    setRestTotal(newTime);
    startRest(newTime);
    // Ajustar reanuda los avisos (p.ej. si vuelves a >10s)
    tenAnnouncedRef.current = newTime <= 10;
    halfAnnouncedRef.current = newTime <= Math.floor(newTime / 2);
    restStartTime.current = Date.now();
  };

  const circleRadius = 72;
  const circumference = 2 * Math.PI * circleRadius;
  const totalRest = restTotal || currentExercise.restSeconds || 60;
  const strokeDashoffset = circumference * (1 - restTime / totalRest);
  const restUrgent = restTime <= 10;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {/* Flash overlay */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          className="fixed inset-0 z-[70] bg-primary-container/30 pointer-events-none animate-flash"
          onAnimationEnd={() => setFlashKey(0)}
        />
      )}

      {/* Weight Prompt Overlay */}
      {showWeightPrompt && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              {currentExercise.name}
            </h2>
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
            <button
              className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              onClick={handleSetWeight}
              disabled={!weightInput || Number(weightInput) <= 0}
            >
              CONTINUAR
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider absolute left-1/2 -translate-x-1/2">
          ENTRENAMIENTO
        </h1>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
        {/* Progress */}
        <div className="mb-3">
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

        {/* Exercise Image */}
        <div
          key={currentExerciseIndex}
          className="flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest mb-3 animate-fade-in-up"
        >
          {currentExercise.image ? (
            <img
              src={currentExercise.image}
              alt={currentExercise.name}
              loading="lazy"
              className="w-full h-full object-contain bg-surface-container"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container">
              <svg className="w-16 h-16 text-primary-container opacity-30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
              </svg>
            </div>
          )}
        </div>

        {/* Exercise Name + Target */}
        <div className="mb-3 text-center">
          <h2 className="font-headline-lg text-headline-lg text-primary-container neon-glow">
            {currentExercise.name}
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">
            Serie {currentSet} de {currentExercise.sets} · {currentExercise.reps} reps
          </p>
          {/* Dots de series */}
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

        {/* Reps Input */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-surface-container-high border border-surface-container-highest rounded-xl px-3 h-[52px]">
            <Hash className="w-5 h-5 text-primary-container" />
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 bg-transparent font-bold text-on-surface text-xl outline-none"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
            />
            <span className="text-on-surface-variant font-label-caps">REPS</span>
          </div>
          {!isBodyweightHIIT && exerciseWeight !== undefined && (
            <div className="flex items-center gap-1 px-3 h-[52px] bg-surface-container-high border border-surface-container-highest rounded-xl">
              <Weight className="w-4 h-4 text-primary-container" />
              <span className="font-bold text-on-surface">{exerciseWeight}kg</span>
            </div>
          )}
        </div>

        {/* Complete Button */}
        <button
          className="w-full h-[56px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 font-headline-sm"
          onClick={handleComplete}
          disabled={!isBodyweightHIIT && exerciseWeight === undefined}
        >
          <CheckCircle className="w-5 h-5" />
          {currentSet >= currentExercise.sets && currentExerciseIndex >= totalExercises - 1
            ? "FINALIZAR"
            : "COMPLETAR SERIE"}
        </button>
      </main>

      {/* Rest Timer Overlay */}
      {showRest && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 overflow-hidden">
          {/* Halo ambiental neón */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-[340px] h-[340px] rounded-full animate-ambient ${restUrgent ? "bg-error/10" : "bg-primary-container/10"} blur-3xl`}
            />
          </div>
          <div className="text-center w-full max-w-sm relative z-10">
            <span className="font-label-caps text-label-caps text-primary-container tracking-widest">DESCANSO</span>
            <div className={`mt-4 relative w-44 h-44 mx-auto ${restUrgent ? "" : "animate-breathe"}`}>
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="88" cy="88" r={circleRadius} fill="none" stroke="#1f1f1f" strokeWidth="8" />
                <circle
                  cx="88"
                  cy="88"
                  r={circleRadius}
                  fill="none"
                  stroke={restUrgent ? "#ffb4ab" : "#ccff00"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-display-timer text-[44px] tabular-nums ${
                    restUrgent ? "animate-urgent" : "text-primary-container"
                  }`}
                >
                  {restTime}
                </span>
                <span className="text-on-surface-variant font-label-caps text-[10px] tracking-widest">SEG</span>
              </div>
            </div>

            {/* Next exercise preview */}
            {nextExerciseObj && (
              <div className="mt-4 p-3 bg-surface-container-high border border-surface-container-highest rounded-xl flex items-center gap-3 text-left animate-fade-in-up">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
                  {nextExerciseObj.image ? (
                    <img src={nextExerciseObj.image} alt={nextExerciseObj.name} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-container/50">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface-variant text-xs font-label-caps uppercase">A continuación</p>
                  <p className="text-on-surface font-bold truncate">{nextExerciseObj.name}</p>
                  <p className="text-on-surface-variant text-xs truncate">
                    {nextExerciseObj.sets} series · {nextExerciseObj.reps}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => adjustRest(-15)}
                className="h-[44px] px-4 bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95 flex items-center gap-1"
              >
                <Clock className="w-4 h-4" /> -15s
              </button>
              <button
                onClick={() => adjustRest(15)}
                className="h-[44px] px-4 bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95 flex items-center gap-1"
              >
                <Clock className="w-4 h-4" /> +15s
              </button>
            </div>

            <button
              onClick={skipRestNow}
              className="mt-4 h-[48px] px-8 bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95 flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" /> Saltar descanso
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm bg-surface-container-low border border-surface-container-highest rounded-2xl p-6">
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">¿Salir del entreno?</h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Puedes guardar el progreso actual o cancelarlo.
            </p>
            <div className="space-y-2">
              <button
                className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-transform"
                onClick={() => handleExit(true)}
              >
                Guardar y salir
              </button>
              <button
                className="w-full h-[52px] bg-surface-container-high text-error font-bold rounded-xl border border-surface-container-highest active:scale-95 transition-transform"
                onClick={() => handleExit(false)}
              >
                Cancelar entreno
              </button>
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
