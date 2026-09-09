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

  const totalExercises = routine?.exercises.length ?? 0;
  const totalSetsInRoutine = useMemo(
    () => routine?.exercises.reduce((sum, ex) => sum + (ex.sets || 3), 0) || 1,
    [routine],
  );

  const completedSetsCount = useMemo(() => {
    if (!routine) return 0;
    let count = 0;
    for (let i = 0; i < currentExerciseIndex; i++) {
      count += routine.exercises[i]?.sets || 3;
    }
    count += Math.max(0, currentSet - 1);
    return count;
  }, [currentExerciseIndex, currentSet, routine]);

  const workoutPercent = Math.min(
    100,
    Math.round((completedSetsCount / Math.max(1, totalSetsInRoutine)) * 100),
  );

  if (!routine || !currentExercise) return null;

  const isLastSet = currentSet >= currentExercise.sets;
  const isLastExercise = currentExerciseIndex >= totalExercises - 1;
  const isWorkoutFinishing = isLastSet && isLastExercise;

  const triggerFeedback = () => {
    setFlashKey((k) => k + 1);
    haptics.tick();
  };

  const handleComplete = async () => {
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

  const circuitNumber = isHIIT
    ? Math.floor(currentExerciseIndex / 3) + 1
    : undefined;
  const totalCircuits = isHIIT
    ? Math.ceil(totalExercises / 3)
    : undefined;

  const footer = isTimedSet ? (
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

        <ExerciseStage
          exercise={currentExercise}
          currentSet={currentSet}
          exerciseIndex={currentExerciseIndex}
          isHIIT={isHIIT}
          circuitNumber={circuitNumber}
          totalCircuits={totalCircuits}
          className="flex-1 min-h-0"
        />
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
