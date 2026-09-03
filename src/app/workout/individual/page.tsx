"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Circle,
  Timer,
  ArrowLeft,
  ArrowRight,
  Weight,
  Volume2,
  VolumeX,
  Hash,
  SkipForward,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
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
  unlockAudio,
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

    if (typeof window !== "undefined" && !startIndexLoaded) {
      const params = new URLSearchParams(window.location.search);
      const startIndex =
        Number(params.get("exercise")) ||
        activeWorkout.currentExerciseIndex ||
        0;
      goToExercise(startIndex);
      setStartIndexLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, activeWorkout.justFinished, activeWorkout.session?.completed, router]);

  // Sync local rest display from store
  useEffect(() => {
    setRestTime(activeWorkout.restTimeRemaining);
    setShowRest(activeWorkout.isResting);
  }, [activeWorkout.restTimeRemaining, activeWorkout.isResting]);

  useEffect(() => {
    if (currentExercise) {
      setRepsInput(
        String(activeWorkout.exerciseReps[currentExercise.id] ?? ""),
      );
    }
  }, [currentExercise, activeWorkout.exerciseReps]);

  // Announce exercise start
  useEffect(() => {
    if (!currentExercise) return;
    if (audioEnabled && audioMode !== "silent") {
      unlockAudio();
      const timer = setTimeout(() => {
        announceExerciseStart();
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, audioEnabled]);

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
        if (
          !halfAnnouncedRef.current &&
          baseRest >= 60 &&
          remaining === Math.floor(baseRest / 2)
        ) {
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
  const storeSets =
    activeWorkout.session?.exercises[currentExerciseIndex]?.sets || [];
  const nextExerciseObj =
    currentExerciseIndex < totalExercises - 1
      ? routine.exercises[currentExerciseIndex + 1]
      : null;

  const totalSetsInRoutine = useMemo(() => {
    return routine?.exercises?.reduce((sum, ex) => sum + (ex.sets || 3), 0) || 1;
  }, [routine]);

  const completedSetsCount = useMemo(() => {
    if (!routine?.exercises) return 0;
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
    const targetMatch = currentExercise.reps.match(/\d+/g);
    const targetReps = targetMatch ? parseInt(targetMatch[targetMatch.length - 1], 10) : 10;
    const reps =
      activeWorkout.exerciseReps[currentExercise.id] || targetReps;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();

    const isLastSet = currentSet >= currentExercise.sets;
    const remainingSets = currentExercise.sets - currentSet;

    // Prime TTS inside the user gesture, then let the audio engine handle the announcement queue
    if (
      audioEnabled &&
      audioMode !== "silent" &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      unlockAudio();
    }

    if (audioEnabled) {
      if (isLastSet) {
        announceExerciseComplete();
      } else if (remainingSets <= 2) {
        announceSetsRemaining(remainingSets);
      } else {
        announceExerciseComplete();
      }
    }

    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const isWorkoutFinishing = isLastSet && isLastExercise;

    if (isWorkoutFinishing) {
      if (audioEnabled) announceWorkoutComplete();
      haptics.complete();
      completeSet(
        currentExerciseIndex,
        currentSet,
        undefined,
        reps,
      );
      router.push("/workout/complete");
      return;
    }

    completeSet(
      currentExerciseIndex,
      currentSet,
      undefined,
      reps,
    );

    // Halfway workout announcement
    const halfwayIndex = Math.floor(totalExercises / 2);
    if (
      isLastSet &&
      currentExerciseIndex === halfwayIndex - 1 &&
      nextExerciseObj
    ) {
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
      setTimeout(
        () =>
          announcePrepareNext(
            nextExerciseObj.name,
            nextExerciseObj.restSeconds,
          ),
        600,
      );
    }
  };

  const handleManualFinish = async () => {
    if (audioEnabled) announceWorkoutComplete();
    haptics.complete();
    await finishWorkout();
    router.push("/workout/complete");
  };

  const handleRepeatLastSet = () => {
    const targetSet = Math.max(1, currentSet - 1);
    useAppStore.getState().setWorkoutSet(targetSet);
    triggerFeedback();
  };

  const navigateExercise = (delta: number) => {
    const newIndex = Math.max(
      0,
      Math.min(totalExercises - 1, currentExerciseIndex + delta),
    );
    goToExercise(newIndex);
    setRepsInput(
      String(activeWorkout.exerciseReps[routine.exercises[newIndex].id] ?? ""),
    );
  };

  const handleBack = () => {
    setShowExitConfirm(true);
  };

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

      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
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
          {currentExercise.name}
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

      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
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
          className="flex-shrink-0 flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest my-1 animate-fade-in-up"
        >
          <ExerciseImage
            src={currentExercise.image}
            alt={currentExercise.name}
            containerClassName="w-full h-full"
          />
        </div>

        {/* Large Illuminated Exercise HUD */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {/* Exercise Name */}
          <div className="bg-[#111116] border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <span className="font-headline-sm text-base sm:text-lg font-bold text-white truncate drop-shadow-[0_0_10px_rgba(204,255,0,0.25)]">
              {currentExercise.name}
            </span>
            <span className="text-[11px] font-mono font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-full border border-primary-container/30">
              {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>

          {/* Expanded 3-Card High-Visibility Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {/* 1. Target Reps Card (Glowing Neon Lime) */}
            <div className="bg-[#121218]/95 border-2 border-primary-container/80 rounded-2xl py-4 px-2 min-h-[110px] flex flex-col items-center justify-between shadow-[0_0_22px_rgba(204,255,0,0.28)]">
              <span className="text-xs font-label-caps text-primary-container uppercase font-bold tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary-container animate-pulse" />
                REPETICIONES
              </span>
              <span className="font-mono font-black text-3xl sm:text-4xl text-primary-container drop-shadow-[0_0_15px_rgba(204,255,0,0.6)] my-1">
                {currentExercise.reps}
              </span>
              <span className="text-[10px] font-label-caps text-zinc-400 font-bold uppercase">
                objetivo
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

        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto mt-1">
          <div className="flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant px-3 py-1">
            <span className="w-16">SERIE</span>
            <span className="flex-1 text-center">OBJETIVO</span>
            <span className="w-8 text-right">ESTADO</span>
          </div>

          {Array.from({ length: currentExercise.sets }).map((_, i) => {
            const setNum = i + 1;
            const storeSet = storeSets.find((s) => s.setNumber === setNum);
            const isCompleted = !!storeSet;
            const isCurrent = setNum === currentSet;

            if (isCompleted && storeSet) {
              return (
                <div
                  key={setNum}
                  className="flex-shrink-0 h-[46px] flex items-center justify-between px-3 bg-[#111116] border border-emerald-500/40 rounded-xl shadow-sm"
                >
                  <span className="w-16 font-bold text-emerald-400 font-mono text-xs">
                    Serie {setNum}
                  </span>
                  <span className="flex-1 text-center font-bold text-zinc-200">
                    {storeSet.reps ?? currentExercise.reps} reps
                  </span>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div
                  key={setNum}
                  className="flex-shrink-0 h-[50px] flex items-center justify-between px-3 bg-primary-container/10 border-2 border-primary-container rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.18)]"
                >
                  <span className="w-16 font-bold text-primary-container font-mono text-xs">
                    Serie {setNum}
                  </span>
                  <span className="flex-1 text-center font-bold text-primary-container text-base">
                    {currentExercise.reps} reps (Actual)
                  </span>
                  <div className="w-3 h-3 rounded-full bg-primary-container shadow-neon animate-pulse" />
                </div>
              );
            }

            return (
              <div
                key={setNum}
                className="flex-shrink-0 h-[42px] flex items-center justify-between px-3 bg-white/5 border border-white/10 rounded-xl opacity-60"
              >
                <span className="w-16 text-zinc-400 text-xs font-mono">
                  Serie {setNum}
                </span>
                <span className="flex-1 text-center text-zinc-400 text-sm">
                  {currentExercise.reps} reps
                </span>
                <Circle className="w-4 h-4 text-zinc-600" />
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
          leftIcon={<CheckCircle className="w-6 h-6" />}
          rightIcon={
            currentSet >= currentExercise.sets &&
            currentExerciseIndex < totalExercises - 1 ? (
              <ArrowRight className="w-5 h-5" />
            ) : undefined
          }
          onClick={handleComplete}
        >
          {currentSet >= currentExercise.sets &&
          currentExerciseIndex >= totalExercises - 1
            ? "FINALIZAR ENTRENAMIENTO"
            : currentSet >= currentExercise.sets
              ? "SIGUIENTE EJERCICIO"
              : "COMPLETAR SERIE"}
        </PrimaryButton>

        <div className="flex items-center gap-2 mt-2">
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
          <button
            type="button"
            onClick={handleManualFinish}
            className="px-3.5 py-2.5 rounded-xl border border-primary-container/40 bg-primary-container/10 text-primary-container font-label-caps text-xs font-bold uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5"
            title="Guardar progreso y finalizar entrenamiento"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalizar día</span>
          </button>
        </div>
      </footer>

      {showRest && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-[340px] h-[340px] rounded-full animate-ambient ${restUrgent ? "bg-error/10" : "bg-primary-container/10"} blur-3xl`}
            />
          </div>
          <div className="text-center w-full max-w-sm relative z-10">
            <span className="font-label-caps text-label-caps text-primary-container tracking-widest">
              DESCANSO
            </span>
            <div
              className={`mt-4 relative w-44 h-44 mx-auto ${restUrgent ? "" : "animate-breathe"}`}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r={circleRadius}
                  fill="none"
                  stroke="#1f1f1f"
                  strokeWidth="8"
                />
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
                  className={`font-display-timer text-[44px] tabular-nums ${restUrgent ? "animate-urgent" : "text-primary-container"}`}
                >
                  {restTime}
                </span>
                <span className="text-on-surface-variant font-label-caps text-[10px] tracking-widest">
                  SEG
                </span>
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
                  <p className="text-on-surface-variant text-xs font-label-caps uppercase">
                    A continuación
                  </p>
                  <p className="text-on-surface font-bold truncate">
                    {nextExerciseObj.name}
                  </p>
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
