"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import RestTimer from "@/components/ui/RestTimer";
import WorkTimer from "@/components/ui/WorkTimer";
import {
  announceExerciseComplete,
  announcePrepareNext,
  announceExerciseStart,
  announceRest,
  announceWorkoutComplete,
  setAudioMode as setGlobalAudioMode,
  setVoiceRate as setGlobalVoiceRate,
  unlockAudio,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import {
  WorkoutShell,
  ExerciseStage,
  ExerciseDotProgress,
  SetLogger,
  ExitConfirmModal,
} from "@/components/workout";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TimerCircle from "@/components/ui/TimerCircle";

export default function GuidedWorkout() {
  const router = useRouter();
  const {
    activeWorkout,
    completeSet,
    finishWorkout,
    setExerciseReps,
    setExerciseWeight,
    goToExercise,
    startWork,
    startPrep,
    tickPrep,
    skipPrep,
    skipWork,
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
  } = useAppStore();

  const [flashKey, setFlashKey] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const routine = activeWorkout.routine;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex;
  const currentSet = activeWorkout.currentSet;
  const currentRound = activeWorkout.currentRound ?? 1;
  const totalRounds = routine?.rounds ?? 1;
  const currentExercise = routine?.exercises[currentExerciseIndex];
  const isHIIT = routine?.type === "hiit";
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

  // Speak exercise start with exercise name when switching exercises
  useEffect(() => {
    if (!routine || !currentExercise) return;
    if (audioEnabled && audioMode !== "silent") {
      unlockAudio();
      const timer = setTimeout(() => {
        announceExerciseStart(currentExercise.name);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, audioEnabled]);

  // Auto-start the 10s HIIT preparation before the work timer
  useEffect(() => {
    if (
      routine &&
      isTimedSet &&
      !activeWorkout.isPreparing &&
      !activeWorkout.isWorking &&
      !activeWorkout.isResting &&
      !activeWorkout.justFinished
    ) {
      startPrep(10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routine,
    isTimedSet,
    timedSeconds,
    activeWorkout.isPreparing,
    activeWorkout.isWorking,
    activeWorkout.isResting,
    activeWorkout.justFinished,
    currentExerciseIndex,
    currentSet,
  ]);

  // Tick the HIIT preparation countdown
  useEffect(() => {
    if (!activeWorkout.isPreparing) return;
    const interval = setInterval(() => {
      tickPrep();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout.isPreparing, tickPrep]);

  // Confirm before leaving the page
  const onBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  }, []);

  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [onBeforeUnload]);

  const totalExercises = routine?.exercises.length ?? 0;
  const totalSetsInRoutine = useMemo(
    () =>
      (routine?.exercises.reduce((sum, ex) => sum + (ex.sets || 3), 0) || 1) *
      totalRounds,
    [routine, totalRounds],
  );

  const completedSetsCount = useMemo(() => {
    if (!routine) return 0;
    const setsPerRound = routine.exercises.reduce(
      (sum, ex) => sum + (ex.sets || 3),
      0,
    );
    const completedRounds = Math.max(0, currentRound - 1);
    let count = completedRounds * setsPerRound;
    for (let i = 0; i < currentExerciseIndex; i++) {
      count += routine.exercises[i]?.sets || 3;
    }
    count += Math.max(0, currentSet - 1);
    return count;
  }, [currentExerciseIndex, currentSet, currentRound, routine]);

  const workoutPercent = Math.min(
    100,
    Math.round((completedSetsCount / Math.max(1, totalSetsInRoutine)) * 100),
  );

  if (!routine || !currentExercise) return null;

  const isLastSet = currentSet >= currentExercise.sets;
  const isLastExercise = currentExerciseIndex >= totalExercises - 1;
  const isLastRound = currentRound >= totalRounds;
  const isWorkoutFinishing = isLastSet && isLastExercise && isLastRound;

  const triggerFeedback = () => {
    setFlashKey((k) => k + 1);
    haptics.tick();
  };

  const [isFinishing, setIsFinishing] = useState(false);

  const handleComplete = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    if (activeWorkout.isWorking) skipWork();

    const targetMatch = currentExercise.reps.match(/\d+/g);
    const targetReps = targetMatch
      ? parseInt(targetMatch[targetMatch.length - 1], 10)
      : 10;
    const reps = activeWorkout.exerciseReps[currentExercise.id] || targetReps;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();

    if (isWorkoutFinishing) {
      completeSet(currentExerciseIndex, currentSet, undefined, reps);
      if (audioEnabled) announceWorkoutComplete();
      await finishWorkout();
      router.push("/workout/complete");
      return;
    }
    setIsFinishing(false);

    if (isLastSet) {
      const nextEx = routine.exercises[currentExerciseIndex + 1];
      if (nextEx && audioEnabled) {
        announcePrepareNext(nextEx.name, currentExercise.restSeconds);
      } else if (audioEnabled) {
        announceExerciseComplete();
      }
    } else {
      if (audioEnabled) {
        announceExerciseComplete();
        setTimeout(() => {
          if (audioEnabled) announceRest(currentExercise.restSeconds);
        }, 1200);
      }
    }

    completeSet(currentExerciseIndex, currentSet, undefined, reps);
  };

  const handleRepeatLastSet = () => {
    const targetSet = Math.max(1, currentSet - 1);
    useAppStore.getState().setWorkoutSet(targetSet);
    haptics.tick();
  };

  const handleExit = async (save: boolean) => {
    if (save) {
      await finishWorkout();
      setShowExitConfirm(false);
      router.push("/workout/complete");
    } else {
      useAppStore.getState().cancelWorkout();
      setShowExitConfirm(false);
      router.push("/");
    }
  };

  const circuitNumber = isHIIT ? currentRound : undefined;
  const totalCircuits = isHIIT ? totalRounds : undefined;

  const footer = activeWorkout.isPreparing ? (
    <PrimaryButton
      leftIcon={<CheckCircle className="w-6 h-6" />}
      onClick={() => {
        skipPrep();
      }}
    >
      EMPEZAR YA
    </PrimaryButton>
  ) : isTimedSet ? (
    <PrimaryButton
      leftIcon={<CheckCircle className="w-6 h-6" />}
      onClick={() => {
        if (activeWorkout.isWorking) skipWork();
        handleComplete();
      }}
    >
      {isWorkoutFinishing ? "FINALIZAR" : "COMPLETAR SERIE"}
    </PrimaryButton>
  ) : (
    <SetLogger
      exercise={currentExercise}
      isLastSet={isLastSet}
      isLastExercise={isLastExercise}
      weight={activeWorkout.exerciseWeights[currentExercise.id] || 0}
      reps={activeWorkout.exerciseReps[currentExercise.id] || 0}
      showRepeat={currentSet > 1}
      onWeightChange={(w) => setExerciseWeight(currentExercise.id, w)}
      onRepsChange={(r) => setExerciseReps(currentExercise.id, r)}
      onComplete={handleComplete}
      onRepeatLastSet={handleRepeatLastSet}
    />
  );

  return (
    <>
      {flashKey > 0 && (
        <div
          key={flashKey}
          className="fixed inset-0 z-[70] bg-primary-container/30 pointer-events-none animate-flash"
          onAnimationEnd={() => setFlashKey(0)}
        />
      )}
      <WorkoutShell
        title="ENTRENAMIENTO"
        progress={workoutPercent}
        showBack
        onBack={() => setShowExitConfirm(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        footer={footer}
      >
        {/* Mini progress line info */}
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
          <ExerciseDotProgress
            exercises={routine.exercises}
            currentExerciseIndex={currentExerciseIndex}
            onSelect={(idx) => goToExercise(idx)}
          />
        </div>

        {activeWorkout.isPreparing ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase text-center mb-2">
              Preparado/a?
            </h2>
            <p className="text-on-surface-variant text-sm mb-6 text-center">
              Empieza en {activeWorkout.prepTimeRemaining} segundos
            </p>
            <TimerCircle
              seconds={activeWorkout.prepTimeRemaining}
              total={10}
              size={220}
              strokeWidth={10}
              label="segundos"
              className="mb-6"
            />
          </div>
        ) : (
          <ExerciseStage
            exercise={currentExercise}
            currentSet={currentSet}
            exerciseIndex={currentExerciseIndex}
            isHIIT={isHIIT}
            circuitNumber={circuitNumber}
            totalCircuits={totalCircuits}
            className="flex-1 min-h-0"
          />
        )}
      </WorkoutShell>
      <RestTimer />
      <WorkTimer />

      <ExitConfirmModal
        open={showExitConfirm}
        onSave={() => handleExit(true)}
        onCancel={() => handleExit(false)}
        onContinue={() => setShowExitConfirm(false)}
      />
    </>
  );
}
