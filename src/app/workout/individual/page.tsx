"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Timer, ArrowLeft, ArrowRight, Weight, Volume2, VolumeX, Hash, Home, SkipForward, Clock, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  playRestEndAlarm,
  announceExerciseComplete,
  announceRest,
  announceCountdown,
  announceStart,
  announceExerciseStart,
  announceNextExercise,
  announceWorkoutComplete,
  announceTenSecondsLeft,
  announceHalfRest,
} from "@/lib/audio";

export default function IndividualWorkout() {
  const router = useRouter();

  const {
    activeWorkout,
    completeSet,
    startRest,
    finishWorkout,
    cancelWorkout,
    setWorkoutExerciseIndex,
    setExerciseWeight,
    setExerciseReps,
    skipRest,
    audioEnabled,
    toggleAudio,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startIndexLoaded, setStartIndexLoaded] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
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

  // Load start exercise index from URL or store
  useEffect(() => {
    if (!routine) {
      router.push("/");
      return;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const startIndex = Number(params.get("exercise")) || activeWorkout.currentExerciseIndex || 0;
      setCurrentExerciseIndex(startIndex);
      setWorkoutExerciseIndex(startIndex);
      setStartIndexLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, router]);

  // Sync from store when external changes happen (rest finished, next exercise)
  useEffect(() => {
    setCurrentExerciseIndex(activeWorkout.currentExerciseIndex);
    setCurrentSet(activeWorkout.currentSet);
  }, [activeWorkout.currentExerciseIndex, activeWorkout.currentSet]);

  useEffect(() => {
    if (currentExercise) {
      setRepsInput(String(activeWorkout.exerciseReps[currentExercise.id] ?? ""));
    }
  }, [currentExercise, activeWorkout.exerciseReps]);

  // Show weight prompt if no weight set for this exercise (skip bodyweight HIIT)
  useEffect(() => {
    if (startIndexLoaded && currentExercise && !isBodyweightHIIT && activeWorkout.exerciseWeights[currentExercise.id] === undefined) {
      setShowWeightPrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndexLoaded, currentExerciseIndex, activeWorkout.exerciseWeights]);

  // Announce exercise start
  useEffect(() => {
    if (!currentExercise || showWeightPrompt) return;
    if (audioEnabled) {
      const timer = setTimeout(() => {
        announceExerciseStart(currentExercise.name, currentExercise.sets, currentExercise.reps, activeWorkout.exerciseWeights[currentExercise.id]);
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, showWeightPrompt, audioEnabled]);

  // Confirm before leaving the page (browser back/close)
  const onBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [onBeforeUnload]);

  // Precise rest timer countdown
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
        if (remaining === 3) announceCountdown(3);
        if (remaining === 2) announceCountdown(2);
        if (remaining === 1) announceCountdown(1);
      }

      if (remaining <= 0) {
        setShowRest(false);
        if (audioEnabled) {
          playRestEndAlarm();
          announceStart();
        }
      }
    };

    tick();
    restTimerRef.current = setInterval(tick, 250);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRest, audioEnabled, restTotal]);

  if (!routine) return null;
  if (!startIndexLoaded) return null;
  if (!currentExercise) return null;

  const totalExercises = routine.exercises.length;
  const storeSets = activeWorkout.session?.exercises[currentExerciseIndex]?.sets || [];
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

  const handleChangeWeight = () => {
    setWeightInput(exerciseWeight?.toString() || "");
    setShowWeightPrompt(true);
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

    // For intermediate sets we show a rest overlay; for last set of an intermediate exercise
    // the store already advanced to the next exercise, so just move to it.
    if (!isLastSet) {
      setRestTime(currentExercise.restSeconds);
      setRestTotal(currentExercise.restSeconds);
      setShowRest(true);
      startRest(currentExercise.restSeconds);
      if (audioEnabled) {
        announceRest(currentExercise.restSeconds);
      }
    } else if (audioEnabled && nextExerciseObj) {
      setTimeout(() => announceNextExercise(nextExerciseObj.name), 600);
    }
  };

  const handleBack = () => {
    setShowExitConfirm(true);
  };

  const handleExit = (save: boolean) => {
    if (!save) {
      cancelWorkout();
    }
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
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider absolute left-1/2 -translate-x-1/2">
          {currentExercise.name}
        </h1>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">
        {/* Exercise Image */}
        <div
          key={currentExerciseIndex}
          className="flex-shrink-0 flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest my-1 animate-fade-in-up"
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

        {/* Exercise Info + Weight */}
        <div className="flex-shrink-0 flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            {currentExercise.sets} series · {currentExercise.reps} reps · {currentExercise.restSeconds}s
          </span>
          <div className="flex items-center gap-2">
            {!isBodyweightHIIT && exerciseWeight !== undefined && (
              <button
                onClick={handleChangeWeight}
                className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded-lg border border-surface-container-highest active:scale-95"
              >
                <Weight className="w-3 h-3 text-primary-container" />
                <span className="font-bold text-primary-container text-sm">{exerciseWeight}kg</span>
              </button>
            )}
            <span className="font-label-caps text-label-caps text-primary-container">
              {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>
        </div>

        {/* Reps input */}
        <div className="flex-shrink-0 flex items-center gap-2 mb-1">
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
        </div>

        {/* Sets Table */}
        <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto">
          <div className="flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant px-2">
            <span className="w-12">SERIE</span>
            {!isBodyweightHIIT && <span className="flex-1 text-center">PESO</span>}
            <span className="w-12 text-center">REPS</span>
            <span className="w-8"></span>
          </div>

          {Array.from({ length: currentExercise.sets }).map((_, i) => {
            const setNum = i + 1;
            const storeSet = storeSets.find((s) => s.setNumber === setNum);
            const isCompleted = !!storeSet;
            const isCurrent = setNum === currentSet;

            if (isCompleted && storeSet) {
              return (
                <div key={setNum} className="flex-shrink-0 h-[44px] flex items-center justify-between px-3 bg-surface-container border border-surface-container-highest rounded-lg">
                  <span className="w-12 font-bold text-primary-container">{setNum}</span>
                  {!isBodyweightHIIT && (
                    <span className="flex-1 text-center font-bold text-on-surface">{storeSet.weight}kg</span>
                  )}
                  <span className="w-12 text-center font-bold text-on-surface">{storeSet.reps ?? "--"}</span>
                  <CheckCircle className="w-5 h-5 text-primary-container" />
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div key={setNum} className="flex-shrink-0 h-[52px] flex items-center justify-between px-3 bg-surface-container-high border-2 border-primary-container rounded-lg">
                  <span className="w-12 font-bold text-primary-container">{setNum}</span>
                  {!isBodyweightHIIT && (
                    <span className="flex-1 text-center font-bold text-on-surface text-lg">
                      {exerciseWeight !== undefined ? `${exerciseWeight}kg` : "--"}
                    </span>
                  )}
                  <span className="w-12 text-center font-bold text-on-surface text-lg">{repsInput || "--"}</span>
                  <Circle className="w-5 h-5 text-primary-container" />
                </div>
              );
            }

            return (
              <div key={setNum} className="flex-shrink-0 h-[44px] flex items-center justify-between px-3 bg-surface-container border border-surface-container-highest rounded-lg opacity-40">
                <span className="w-12 font-bold text-on-surface-variant">{setNum}</span>
                {!isBodyweightHIIT && <span className="flex-1 text-center">--</span>}
                <span className="w-12 text-center">--</span>
                <div className="w-5" />
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Actions */}
      <footer className="flex-shrink-0 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 bg-background border-t border-surface-container-highest">
        <button
          className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 font-headline-sm"
          onClick={handleComplete}
          disabled={!isBodyweightHIIT && exerciseWeight === undefined}
        >
          {currentSet >= currentExercise.sets ? "SIGUIENTE EJERCICIO" : "COMPLETAR SERIE"}
          <Timer className="w-5 h-5" />
        </button>

        <div className="flex gap-2 mt-2">
          {currentExerciseIndex > 0 && (
            <button
              onClick={() => {
                const prev = currentExerciseIndex - 1;
                setCurrentExerciseIndex(prev);
                setWorkoutExerciseIndex(prev);
                setRepsInput(String(activeWorkout.exerciseReps[routine.exercises[prev].id] ?? ""));
              }}
              className="flex-1 h-[44px] bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />ANT
            </button>
          )}
          {currentExerciseIndex < totalExercises - 1 && (
            <button
              onClick={() => {
                const next = currentExerciseIndex + 1;
                setCurrentExerciseIndex(next);
                setWorkoutExerciseIndex(next);
                setRepsInput(String(activeWorkout.exerciseReps[routine.exercises[next].id] ?? ""));
              }}
              className="flex-1 h-[44px] bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95"
            >
              SIG<ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
      </footer>

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
