"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import RestTimer from "@/components/ui/RestTimer";
import WorkTimer from "@/components/ui/WorkTimer";
import {
  announceExerciseComplete,
  announceNextExercise,
  announcePrepareNext,
  announceExerciseStart,
  announceRest,
  announceWorkoutComplete,
  setAudioMode as setGlobalAudioMode,
  setVoiceRate as setGlobalVoiceRate,
  unlockAudio,
} from "@/lib/audio";
import { countSetsDonePerRound, decideSupersetAdvance, SupersetAdvance } from "@/lib/supersets";
import { haptics } from "@/lib/haptics";
import { getExerciseNote } from "@/lib/workout-notes";
import { getAllRecords, ExerciseRecord } from "@/lib/records";
import { useLastPerformance } from "@/hooks/useLastPerformance";
import { useStoreHydrated, hasPersistedWorkout } from "@/hooks/useStoreHydrated";
import {
  WorkoutShell,
  ExerciseStage,
  ExerciseDotProgress,
  SetLogger,
  ExitConfirmModal,
} from "@/components/workout";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TimerCircle from "@/components/ui/TimerCircle";
import { useRenderProbe } from "@/hooks/useRenderProbe";

export default function GuidedWorkout() {
  const router = useRouter();
  useRenderProbe("guided-page");
  // F4.4 — suscripción por campo, nunca al store entero. Los ticks de 1 Hz
  // (descanso, preparación, intervalo de trabajo) viven en activeWorkout; con
  // la suscripción global esta pantalla entera se repintaba en cada tic. Aquí
  // solo se selecciona lo que se pinta: durante el descanso a pantalla completa
  // (RestTimer) esta página ya no se re-renderiza ni una vez por segundo.
  // prepTimeRemaining sí se selecciona: es el contador que la propia pantalla
  // de preparación muestra mientras está visible.
  const routine = useAppStore((s) => s.activeWorkout.routine);
  const currentExerciseIndex = useAppStore((s) => s.activeWorkout.currentExerciseIndex);
  const currentSet = useAppStore((s) => s.activeWorkout.currentSet);
  const currentRoundValue = useAppStore((s) => s.activeWorkout.currentRound);
  const justFinished = useAppStore((s) => s.activeWorkout.justFinished);
  const sessionCompleted = useAppStore((s) => s.activeWorkout.session?.completed);
  const sessionExercises = useAppStore((s) => s.activeWorkout.session?.exercises);
  const isPreparing = useAppStore((s) => s.activeWorkout.isPreparing);
  const prepTimeRemaining = useAppStore((s) => s.activeWorkout.prepTimeRemaining);
  const isWorking = useAppStore((s) => s.activeWorkout.isWorking);
  const isResting = useAppStore((s) => s.activeWorkout.isResting);
  const exerciseWeights = useAppStore((s) => s.activeWorkout.exerciseWeights);
  const exerciseReps = useAppStore((s) => s.activeWorkout.exerciseReps);
  const completeSet = useAppStore((s) => s.completeSet);
  const finishWorkout = useAppStore((s) => s.finishWorkout);
  const setExerciseReps = useAppStore((s) => s.setExerciseReps);
  const setExerciseWeight = useAppStore((s) => s.setExerciseWeight);
  const goToExercise = useAppStore((s) => s.goToExercise);
  const startPrep = useAppStore((s) => s.startPrep);
  const tickPrep = useAppStore((s) => s.tickPrep);
  const skipPrep = useAppStore((s) => s.skipPrep);
  const skipWork = useAppStore((s) => s.skipWork);
  const setExerciseNote = useAppStore((s) => s.setExerciseNote);
  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const audioMode = useAppStore((s) => s.audioMode);
  const voiceRate = useAppStore((s) => s.voiceRate);
  const toggleAudio = useAppStore((s) => s.toggleAudio);
  const currentUser = useAppStore((s) => s.currentUser);

  const [flashKey, setFlashKey] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const hydrated = useStoreHydrated();
  const [recordsMap, setRecordsMap] = useState<Map<string, ExerciseRecord>>(new Map());

  useEffect(() => {
    getAllRecords(currentUser?.id).then(setRecordsMap).catch(console.error);
  }, [currentUser?.id]);

  const currentRound = currentRoundValue ?? 1;
  const totalRounds = routine?.rounds ?? 1;
  const currentExercise = routine?.exercises[currentExerciseIndex];
  const currentNote = getExerciseNote(sessionExercises, currentExercise?.id);
  const { last: lastPerformance, suggestion } = useLastPerformance(currentExercise);
  const isHIIT = routine?.type === "hiit";
  const timedSeconds =
    currentExercise?.workSeconds ??
    (() => {
      const m = /(\d+)\s*s/i.exec(currentExercise?.reps || "");
      return m ? Number(m[1]) : 0;
    })();
  const isTimedSet = timedSeconds > 0;

  // Redirect if workout just finished or no routine.
  // Se espera a la rehidratación: sin esto, abrir o recargar la URL del
  // entreno expulsaba a la home antes de que el estado persistido cargara.
  useEffect(() => {
    if (!hydrated) return;
    if (justFinished && sessionCompleted) {
      router.push("/workout/complete");
      return;
    }
    if (!routine) {
      // Si el entreno está en el almacenamiento pero aún no en el store
      // (carrera de hidratación), no se expulsa al usuario: se espera.
      if (hasPersistedWorkout()) return;
      router.push("/");
      return;
    }
  }, [hydrated, routine, justFinished, sessionCompleted, router]);

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
      !isPreparing &&
      !isWorking &&
      !isResting &&
      !justFinished
    ) {
      startPrep(10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routine,
    isTimedSet,
    timedSeconds,
    isPreparing,
    isWorking,
    isResting,
    justFinished,
    currentExerciseIndex,
    currentSet,
  ]);

  // Tick the HIIT preparation countdown
  useEffect(() => {
    if (!isPreparing) return;
    const interval = setInterval(() => {
      tickPrep();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPreparing, tickPrep]);

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

  const handleComplete = async (rpe?: number) => {
    if (isFinishing) return;
    setIsFinishing(true);
    if (isWorking) skipWork();

    const targetMatch = currentExercise.reps.match(/\d+/g);
    const targetReps = targetMatch
      ? parseInt(targetMatch[targetMatch.length - 1], 10)
      : 10;
    const reps = exerciseReps[currentExercise.id] || targetReps;
    setExerciseReps(currentExercise.id, reps);

    triggerFeedback();

    // Superserie (F2.3): anticipa la decisión del store (serie simulada) para
    // anunciar la cadena directa sin descanso intermedio.
    const setsDoneSimulated = countSetsDonePerRound(
      sessionExercises,
      routine.exercises,
      currentRound,
    ).map((done, idx) => (idx === currentExerciseIndex ? done + 1 : done));
    const supersetAdvance: SupersetAdvance | null = decideSupersetAdvance({
      exercises: routine.exercises,
      setsDone: setsDoneSimulated,
      exerciseIndex: currentExerciseIndex,
    });
    const announcedPartner =
      supersetAdvance && supersetAdvance.restSeconds === 0
        ? routine.exercises[supersetAdvance.exerciseIndex]
        : undefined;

    if (isWorkoutFinishing) {
      completeSet(currentExerciseIndex, currentSet, undefined, reps, undefined, rpe);
      if (audioEnabled) announceWorkoutComplete();
      await finishWorkout();
      router.push("/workout/complete");
      return;
    }
    setIsFinishing(false);

    if (announcedPartner) {
      // Superserie: se pasa directo al siguiente ejercicio del par, sin descanso.
      if (audioEnabled) {
        announceExerciseComplete();
        setTimeout(() => {
          if (audioEnabled) announceNextExercise(announcedPartner.name);
        }, 1200);
      }
    } else if (isLastSet) {
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

    completeSet(currentExerciseIndex, currentSet, undefined, reps, undefined, rpe);
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

  const footer = isPreparing ? (
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
        if (isWorking) skipWork();
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
      weight={exerciseWeights[currentExercise.id] || 0}
      reps={exerciseReps[currentExercise.id] || 0}
      note={currentNote}
      showRepeat={currentSet > 1}
      existingRecord={recordsMap.get(currentExercise.id)}
      lastPerformance={lastPerformance}
      suggestion={suggestion}
      onWeightChange={(w) => setExerciseWeight(currentExercise.id, w)}
      onRepsChange={(r) => setExerciseReps(currentExercise.id, r)}
      onNoteChange={(text) => setExerciseNote(currentExercise.id, text)}
      onComplete={handleComplete}
      onRepeatLastSet={handleRepeatLastSet}
    />
  );

  return (
    <>
      {flashKey > 0 && (
        <div
          key={flashKey}
          className="fixed inset-0 z-[70] bg-primary/30 pointer-events-none animate-flash"
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
            <span className="text-primary font-bold text-[13px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {workoutPercent}% COMPLETADO
            </span>
            <span className="text-zinc-400 font-bold text-[13px]">
              SERIE {completedSetsCount}/{totalSetsInRoutine}
            </span>
          </div>
          <ExerciseDotProgress
            exercises={routine.exercises}
            currentExerciseIndex={currentExerciseIndex}
            onSelect={(idx) => goToExercise(idx)}
          />
        </div>

        {isPreparing ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <h2 className="font-headline-lg text-headline-lg text-white text-center mb-2">
              Preparado/a?
            </h2>
            <p className="text-zinc-400 text-sm mb-6 text-center">
              Empieza en {prepTimeRemaining} segundos
            </p>
            <TimerCircle
              seconds={prepTimeRemaining}
              total={10}
              size={220}
              strokeWidth={10}
              label="segundos"
              className="mb-6"
            />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`exercise-${currentExerciseIndex}-${currentExercise.id}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
              className="flex-1 min-h-0"
            >
              <ExerciseStage
                exercise={currentExercise}
                currentSet={currentSet}
                exerciseIndex={currentExerciseIndex}
                isHIIT={isHIIT}
                circuitNumber={circuitNumber}
                totalCircuits={totalCircuits}
                routine={routine}
                className="h-full"
              />
            </motion.div>
          </AnimatePresence>
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
