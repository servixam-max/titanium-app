"use client";

import { FastForward, Plus, Minus, Dumbbell, Hash, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import TimerCircle from "@/components/ui/TimerCircle";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  playBeep,
  playRestEndAlarm,
  announceRest,
  announceCountdown,
  announceStart,
  announceTenSecondsLeft,
  stopSpeaking,
  announceThirtySecondsLeft,
  announceHalfRest,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";

export default function RestTimer() {
  const router = useRouter();
  const {
    activeWorkout,
    skipRest,
    tickRest,
    adjustRest,
    cancelWorkout,
    audioEnabled,
    toggleAudio,
  } = useAppStore();
  const prevTimeRef = useRef(activeWorkout.restTimeRemaining);
  const hasAnnouncedRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (!activeWorkout.isResting) return;

    const interval = setInterval(() => {
      tickRest();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout.isResting, tickRest]);

  // Announce rest start once
  useEffect(() => {
    if (activeWorkout.isResting && !hasAnnouncedRef.current && audioEnabled) {
      const restSec = activeWorkout.restTimeRemaining;
      announceRest(restSec);
      hasAnnouncedRef.current = true;
    }
    if (!activeWorkout.isResting) {
      hasAnnouncedRef.current = false;
    }
  }, [activeWorkout.isResting, activeWorkout.restTimeRemaining, audioEnabled]);

  // Sound + voice countdown
  useEffect(() => {
    if (!activeWorkout.isResting || !audioEnabled) return;

    const timeLeft = activeWorkout.restTimeRemaining;
    const prevTime = prevTimeRef.current;
    const totalTime =
      activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex]
        ?.restSeconds || 60;

    // 10s warning before set starts, announcing next exercise
    if (timeLeft === 10 && prevTime > 10) {
      const nextName = hasNextExercise ? nextExercise?.name : currentExercise?.name;
      announceTenSecondsLeft(nextName);
    }

    // Voice countdown: 3, 2, 1
    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTime) {
      announceCountdown(timeLeft);
    }

    // Half-rest and 30s contextual announcements
    if (totalTime >= 60 && prevTime > 30 && timeLeft === 30) {
      announceThirtySecondsLeft();
    }
    if (
      totalTime >= 60 &&
      prevTime > Math.floor(totalTime / 2) &&
      timeLeft === Math.floor(totalTime / 2)
    ) {
      announceHalfRest(timeLeft);
    }

    // Rest ended
    if (timeLeft === 0 && prevTime > 0) {
      playRestEndAlarm();
      announceStart();
    }

    prevTimeRef.current = timeLeft;
  }, [
    activeWorkout.restTimeRemaining,
    activeWorkout.isResting,
    audioEnabled,
    activeWorkout.routine,
    activeWorkout.currentExerciseIndex,
  ]);

  // Reset on close
  useEffect(() => {
    if (!activeWorkout.isResting) {
      stopSpeaking();
    }
  }, [activeWorkout.isResting]);

  if (!activeWorkout.isResting) return null;

  const currentExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
  const totalTime = currentExercise?.restSeconds || 75;
  const timeLeft = activeWorkout.restTimeRemaining;
  const restUrgent = timeLeft <= 10;

  const isLastSet = activeWorkout.currentSet >= (currentExercise?.sets || 1);
  const nextExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex + 1];
  const hasNextExercise = isLastSet && !!nextExercise;

  const handleExit = async (save: boolean) => {
    stopSpeaking();
    if (save) {
      await useAppStore.getState().finishWorkout();
      setShowExitConfirm(false);
      router.push("/workout/complete");
    } else {
      cancelWorkout();
      setShowExitConfirm(false);
      router.push("/");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a]/98 backdrop-blur-md flex flex-col justify-between p-4 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 h-[56px] flex items-center justify-between px-2 w-full z-20">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:text-primary-container active:scale-95 transition-all"
          aria-label="Volver atrás o cancelar"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-xs font-bold font-label-caps uppercase">Salir</span>
        </button>
        <span className="text-primary-container font-label-caps tracking-[0.2em] text-xs uppercase font-bold">
          DESCANSO
        </span>
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

      {/* Pulsing neon halo background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[520px] h-[520px] rounded-full blur-[120px] animate-ambient ${restUrgent ? "bg-error/15" : "bg-primary-container/12"}`}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto">
        <div className="flex flex-col items-center mb-4">
          <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase">
            Recupera
          </h2>
        </div>

        <TimerCircle
          seconds={timeLeft}
          total={totalTime}
          size={260}
          strokeWidth={10}
          urgent={restUrgent}
          label="segundos"
          className="mb-6"
        />

        {/* Next Exercise Preview Card */}
        <div className="w-full mb-6">
          <p className="text-on-surface-variant font-label-caps tracking-[0.2em] text-[11px] uppercase mb-2 text-center">
            {hasNextExercise ? "A continuación" : "Continúas con"}
          </p>
          <div className="w-full bg-surface-container-high border border-surface-container-highest rounded-2xl p-3 flex items-center gap-4 animate-fade-in-up">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-surface-container-highest">
              <ExerciseImage
                src={
                  (hasNextExercise
                    ? nextExercise?.image
                    : currentExercise?.image) || ""
                }
                alt={
                  (hasNextExercise
                    ? nextExercise?.name
                    : currentExercise?.name) || "Ejercicio"
                }
                containerClassName="w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-on-surface font-headline-md text-headline-md truncate">
                {hasNextExercise ? nextExercise?.name : currentExercise?.name}
              </p>
              <div className="flex items-center gap-3 mt-1 text-on-surface-variant text-xs">
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5 text-primary-container" />
                  {hasNextExercise
                    ? `${nextExercise?.sets || 0} series`
                    : `Serie ${activeWorkout.currentSet + 1} de ${currentExercise?.sets || 0}`}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-primary-container" />
                  {hasNextExercise
                    ? nextExercise?.reps
                    : `${currentExercise?.reps} reps`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time adjust controls */}
        <div className="flex items-center justify-center gap-4 mb-4 w-full">
          <PrimaryButton
            variant="secondary"
            size="md"
            leftIcon={<Minus className="w-4 h-4 text-primary-container" />}
            onClick={() => adjustRest(-15)}
            className="flex-1 max-w-[140px]"
          >
            -15s
          </PrimaryButton>
          <PrimaryButton
            variant="secondary"
            size="md"
            leftIcon={<Plus className="w-4 h-4 text-primary-container" />}
            onClick={() => adjustRest(15)}
            className="flex-1 max-w-[140px]"
          >
            +15s
          </PrimaryButton>
        </div>

        {/* Skip Button */}
        <PrimaryButton
          variant="secondary"
          size="md"
          rightIcon={<FastForward className="w-5 h-5 text-primary-container" />}
          onClick={() => {
            stopSpeaking();
            skipRest();
          }}
          className="max-w-[300px]"
        >
          Saltar descanso
        </PrimaryButton>
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm bg-surface-container-low border border-surface-container-highest rounded-2xl p-6 shadow-2xl">
            <SectionTitle align="center" className="mb-2">
              ¿Salir del entreno?
            </SectionTitle>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Puedes guardar el progreso realizado o cancelar el entrenamiento.
            </p>
            <div className="space-y-2.5">
              <PrimaryButton onClick={() => handleExit(true)}>
                Guardar y salir
              </PrimaryButton>
              <PrimaryButton variant="danger" onClick={() => handleExit(false)}>
                Cancelar entreno
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 text-center text-sm font-bold text-on-surface-variant hover:text-white"
              >
                Continuar entrenando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
