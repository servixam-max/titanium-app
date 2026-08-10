"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Timer, ArrowLeft, ArrowRight, Weight, Volume2, VolumeX, Hash, Home, SkipForward, Clock, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  playRestEndAlarm,
  announceExerciseComplete,
  announceRest,
  announceCountdown,
  announceStart,
  announceExerciseStart,
  announceWorkoutComplete,
  announceTenSecondsLeft,
  announceHalfRest,
  announceSetsRemaining,
  announcePrepareNext,
  announceThirtySecondsLeft,
  announceHalfwayWorkout,
  setAudioMode,
  setVoiceRate,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";

export default function IndividualWorkout() {
  const router = useRouter();

  const {
    activeWorkout,
    completeSet,
    startRest,
    finishWorkout,
    cancelWorkout,
    goToExercise,
    setExerciseWeight,
    setExerciseReps,
    skipRest,
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
  } = useAppStore();

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
  const currentExerciseIndex = activeWorkout.currentExerciseIndex;
  const currentSet = activeWorkout.currentSet;
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
      goToExercise(startIndex);
      setStartIndexLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, router]);

  // Sync local rest display from store
  useEffect(() => {
    setRestTime(activeWorkout.restTimeRemaining);
    setShowRest(activeWorkout.isResting);
  }, [activeWorkout.restTimeRemaining, activeWorkout.isResting]);

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

  // Confirm before leaving the page (browser back/close)
  const onBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [audioMode, voiceRate, onBeforeUnload]);

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
        if (!halfAnnouncedRef.current && baseRest >= 60 && remaining === Math.floor(baseRest / 2)) {
          halfAnnouncedRef.current = true;
          announceHalfRest(remaining);
        }
        if (!tenAnnouncedRef.current && remaining === 30 && baseRest >= 60) {
          tenAnnouncedRef.current = true;
          announceThirtySecondsLeft();
        }
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

  const triggerFeedback = () => {
    setFlashKey((k) => k + 1);
    haptics.tick();
  };

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

    triggerFeedback();

    const isLastSet = currentSet >= currentExercise.sets;
    const remainingSets = currentExercise.sets - currentSet;

    if (audioEnabled) {
      if (isLastSet) {
        announceExerciseComplete();
      } else if (remainingSets <= 2) {
        announceSetsRemaining(remainingSets);
      } else {
        announceExerciseComplete();
      }
    }

    completeSet(currentExerciseIndex, currentSet, isBodyweightHIIT ? undefined : exerciseWeight, reps);

    if (isLastSet && currentExerciseIndex >= totalExercises - 1) {
      if (audioEnabled) announceWorkoutComplete();
      haptics.complete();
      finishWorkout();
      router.push("/workout/complete");
      return;
    }

    // Halfway workout announcement
    const halfwayIndex = Math.floor(totalExercises / 2);
    if (isLastSet && currentExerciseIndex === halfwayIndex - 1 && nextExerciseObj) {
      if (audioEnabled) {
        setTimeout(() => announceHalfwayWorkout(), 800);
      }
    }

    if (!isLastSet) {
      setRestTime(currentExercise.restSeconds);
      setRestTotal(currentExercise.restSeconds);
      setShowRest(true);
      startRest(currentExercise.restSeconds);
      if (audioEnabled) announceRest(currentExercise.restSeconds);
    } else if (audioEnabled && nextExerciseObj) {
      setTimeout(() => announcePrepareNext(nextExerciseObj.name, nextExerciseObj.restSeconds), 600);
    }
  };

  const handleRepeatLastSet = () => {
    const targetSet = Math.max(1, currentSet - 1);
    useAppStore.getState().setWorkoutSet(targetSet);
    triggerFeedback();
  };

  const navigateExercise = (delta: number) => {
    const newIndex = Math.max(0, Math.min(totalExercises - 1, currentExerciseIndex + delta));
    goToExercise(newIndex);
    setRepsInput(String(activeWorkout.exerciseReps[routine.exercises[newIndex].id] ?? ""));
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

      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
        >
          <Home className="w-4 h-4" />
        </button>
        <SectionTitle align="center" className="absolute left-1/2 -translate-x-1/2 m-0">
          {currentExercise.name}
        </SectionTitle>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {routine.exercises.map((ex, idx) => {
              const state = idx < currentExerciseIndex ? "done" : idx === currentExerciseIndex ? "active" : "pending";
              return (
                <button
                  key={ex.id}
                  onClick={() => navigateExercise(idx - currentExerciseIndex)}
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

        <div key={currentExerciseIndex} className="flex-shrink-0 flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest my-1 animate-fade-in-up">
          <ExerciseImage
            src={currentExercise.image}
            alt={currentExercise.name}
            containerClassName="w-full h-full"
          />
        </div>

        <div className="flex-shrink-0 flex items-stretch justify-between gap-2">
          <div className="flex-1 flex flex-col bg-surface-container-high border border-surface-container-highest rounded-xl px-3 py-2">
            <span className="text-on-surface-variant font-label-caps text-[11px] mb-1">
              {currentExercise.sets} series · {currentExercise.reps} reps · {currentExercise.restSeconds}s
            </span>
            <span className="font-headline-sm text-headline-sm text-primary-container truncate">
              {currentExercise.name}
            </span>
          </div>
          {!isBodyweightHIIT && exerciseWeight !== undefined && (
            <button
              onClick={handleChangeWeight}
              className="flex-shrink-0 flex flex-col items-start justify-center px-4 bg-surface-container-high rounded-xl border border-surface-container-highest active:scale-95"
            >
              <span className="text-on-surface-variant font-label-caps text-[11px]">PESO</span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-on-surface text-2xl">{exerciseWeight}</span>
                <span className="font-bold text-on-surface-variant text-sm">kg</span>
              </div>
            </button>
          )}
        </div>

        <div className="flex-shrink-0 flex items-stretch gap-2">
          <div className="flex-1 flex flex-col bg-surface-container-high border border-surface-container-highest rounded-xl px-3 py-2">
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
          leftIcon={<Timer className="w-6 h-6" />}
          rightIcon={currentSet >= currentExercise.sets ? <ArrowRight className="w-5 h-5" /> : undefined}
          onClick={handleComplete}
          disabled={!isBodyweightHIIT && exerciseWeight === undefined}
        >
          {currentSet >= currentExercise.sets ? "SIGUIENTE EJERCICIO" : "COMPLETAR SERIE"}
        </PrimaryButton>

        <div className="flex gap-2 mt-2">
          {currentExerciseIndex > 0 && (
            <PrimaryButton
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigateExercise(-1)}
              className="flex-1"
            >
              ANT
            </PrimaryButton>
          )}
          {currentExerciseIndex < totalExercises - 1 && (
            <PrimaryButton
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigateExercise(1)}
              className="flex-1"
            >
              SIG
            </PrimaryButton>
          )}
        </div>
      </footer>

      {showRest && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-[340px] h-[340px] rounded-full animate-ambient ${restUrgent ? "bg-error/10" : "bg-primary-container/10"} blur-3xl`} />
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
                <span className={`font-display-timer text-[44px] tabular-nums ${restUrgent ? "animate-urgent" : "text-primary-container"}`}>
                  {restTime}
                </span>
                <span className="text-on-surface-variant font-label-caps text-[10px] tracking-widest">SEG</span>
              </div>
            </div>

            {nextExerciseObj && (
              <div className="mt-4 p-3 bg-surface-container-high border border-surface-container-highest rounded-xl flex items-center gap-3 text-left animate-fade-in-up">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
                  <ExerciseImage
                    src={nextExerciseObj.image}
                    alt={nextExerciseObj.name}
                    containerClassName="w-full h-full"
                  />
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
              <PrimaryButton
                variant="secondary"
                size="sm"
                leftIcon={<Clock className="w-4 h-4" />}
                onClick={() => adjustRest(-15)}
                className="flex-1 max-w-[140px]"
              >
                -15s
              </PrimaryButton>
              <PrimaryButton
                variant="secondary"
                size="sm"
                leftIcon={<Clock className="w-4 h-4" />}
                onClick={() => adjustRest(15)}
                className="flex-1 max-w-[140px]"
              >
                +15s
              </PrimaryButton>
            </div>

            <PrimaryButton
              variant="secondary"
              size="md"
              leftIcon={<SkipForward className="w-4 h-4" />}
              onClick={skipRestNow}
              className="mt-4 max-w-[300px] mx-auto"
              fullWidth={false}
            >
              Saltar descanso
            </PrimaryButton>
          </div>
        </div>
      )}

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
