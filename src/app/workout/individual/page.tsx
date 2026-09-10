"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  announceExerciseComplete,
  announceRest,
  announceWorkoutComplete,
  announceSetsRemaining,
  announcePrepareNext,
  setAudioMode,
  setVoiceRate,
  unlockAudio,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import {
  WorkoutShell,
  ExerciseStage,
  ExerciseDotProgress,
  SetLogger,
  RestOverlay,
  ExitConfirmModal,
} from "@/components/workout";

export default function IndividualWorkout() {
  const router = useRouter();
  const {
    activeWorkout,
    completeSet,
    finishWorkout,
    cancelWorkout,
    goToExercise,
    setExerciseReps,
    setExerciseWeight,
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

  // Read exercise query param once if provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const exParam = params.get("exercise");
      if (exParam !== null) {
        const idx = Number(exParam);
        if (!isNaN(idx) && routine && idx >= 0 && idx < routine.exercises.length) {
          goToExercise(idx);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [routine, activeWorkout.justFinished, activeWorkout.session?.completed, router]);

  // Sync audio engine
  useEffect(() => {
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

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

  if (!routine || !currentExercise) return null;

  const workoutPercent = Math.min(
    100,
    Math.round((completedSetsCount / Math.max(1, totalSetsInRoutine)) * 100),
  );

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
    const targetMatch = currentExercise.reps.match(/\d+/g);
    const targetReps = targetMatch
      ? parseInt(targetMatch[targetMatch.length - 1], 10)
      : 10;
    const reps = activeWorkout.exerciseReps[currentExercise.id] || targetReps;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();

    const remainingSets = currentExercise.sets - currentSet;

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

    if (isWorkoutFinishing) {
      completeSet(currentExerciseIndex, currentSet, undefined, reps);
      if (audioEnabled) announceWorkoutComplete();
      haptics.complete();
      await finishWorkout();
      router.push("/workout/complete");
      return;
    }
    setIsFinishing(false);

    completeSet(currentExerciseIndex, currentSet, undefined, reps);

    if (!isLastSet && audioEnabled) {
      setTimeout(() => announceRest(currentExercise.restSeconds), 800);
    } else if (isLastSet) {
      const nextEx = routine.exercises[currentExerciseIndex + 1];
      if (nextEx && audioEnabled) {
        setTimeout(
          () => announcePrepareNext(nextEx.name, nextEx.restSeconds),
          1000,
        );
      }
    }
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
      cancelWorkout();
      setShowExitConfirm(false);
      router.push("/");
    }
  };

  const navigateExercise = (delta: number) => {
    const newIndex = Math.max(0, Math.min(totalExercises - 1, currentExerciseIndex + delta));
    goToExercise(newIndex);
  };

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
        title={currentExercise.name}
        progress={workoutPercent}
        showBack
        onBack={() => setShowExitConfirm(true)}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        footer={
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
        }
      >
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateExercise(-1)}
              disabled={currentExerciseIndex === 0}
              className="p-2 text-on-surface-variant disabled:opacity-30 active:scale-95"
              aria-label="Ejercicio anterior"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <ExerciseDotProgress
              exercises={routine.exercises}
              currentExerciseIndex={currentExerciseIndex}
              onSelect={(idx) => goToExercise(idx)}
            />
            <button
              onClick={() => navigateExercise(1)}
              disabled={currentExerciseIndex >= totalExercises - 1}
              className="p-2 text-on-surface-variant disabled:opacity-30 active:scale-95"
              aria-label="Ejercicio siguiente"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ExerciseStage
          exercise={currentExercise}
          currentSet={currentSet}
          exerciseIndex={currentExerciseIndex}
          className="flex-1 min-h-0"
        />
      </WorkoutShell>

      <RestOverlay />

      <ExitConfirmModal
        open={showExitConfirm}
        onSave={() => handleExit(true)}
        onCancel={() => handleExit(false)}
        onContinue={() => setShowExitConfirm(false)}
      />
    </>
  );
}
