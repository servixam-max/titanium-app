"use client";

import { FastForward, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import TimerCircle from "@/components/ui/TimerCircle";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";
import {
  playBeep,
  announceCountdown,
  announceTenSecondsLeft,
  announceWorkStart,
  announceWorkEnd,
  announceCircuit,
  stopSpeaking,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";

/**
 * Full-screen WORK interval timer for time-based (HIIT) sets.
 * The store's tickWork() auto-completes the set when it reaches 0
 * and completeSet() starts the following rest.
 */
export default function WorkTimer() {
  const router = useRouter();
  const {
    activeWorkout,
    tickWork,
    skipWork,
    completeSet,
    cancelWorkout,
    finishWorkout,
    audioEnabled,
    toggleAudio,
  } = useAppStore();
  const prevTimeRef = useRef(activeWorkout.workTimeRemaining);
  const hasAnnouncedRef = useRef(false);
  const endAnnouncedRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // 1s tick
  useEffect(() => {
    if (!activeWorkout.isWorking) return;
    const interval = setInterval(() => {
      tickWork();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout.isWorking, tickWork]);

  // Announce "¡Trabajo!" + circuit once when work starts
  useEffect(() => {
    if (activeWorkout.isWorking && !hasAnnouncedRef.current && audioEnabled) {
      hasAnnouncedRef.current = true;
      endAnnouncedRef.current = false;
      announceWorkStart();
      if (activeWorkout.routine?.type === "hiit") {
        const per = 3;
        const total = Math.ceil(
          (activeWorkout.routine.exercises.length || 1) / per,
        );
        const cur = Math.floor(activeWorkout.currentExerciseIndex / per) + 1;
        // Only announce the circuit block on its first exercise
        const isFirstOfCircuit =
          activeWorkout.currentExerciseIndex % per === 0 &&
          activeWorkout.currentSet === 1;
        if (isFirstOfCircuit) {
          setTimeout(() => announceCircuit(cur, total), 1200);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout.isWorking, audioEnabled]);

  // Countdown sounds: 10s warning + 3-2-1
  useEffect(() => {
    if (!activeWorkout.isWorking || !audioEnabled) return;

    const timeLeft = activeWorkout.workTimeRemaining;
    const prevTime = prevTimeRef.current;

    if (timeLeft === 10 && prevTime > 10 && timeLeft !== prevTime) {
      announceTenSecondsLeft();
    }

    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTime) {
      announceCountdown(timeLeft);
      playBeep(1000, 0.12, "sine", 0.25);
      haptics.tick();
    }

    // Work interval just ended → "¡Tiempo!"
    if (timeLeft === 0 && prevTime > 0 && !endAnnouncedRef.current) {
      endAnnouncedRef.current = true;
      announceWorkEnd();
      haptics.countdownEnd();
    }

    prevTimeRef.current = timeLeft;
  }, [activeWorkout.workTimeRemaining, activeWorkout.isWorking, audioEnabled]);

  // Reset on open/close
  useEffect(() => {
    if (!activeWorkout.isWorking) {
      hasAnnouncedRef.current = false;
      stopSpeaking();
    }
  }, [activeWorkout.isWorking]);

  if (!activeWorkout.isWorking) return null;

  const currentExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
  const isHIIT = activeWorkout.routine?.type === "hiit";
  const exercisesPerCircuit = 3;
  const circuitNumber = isHIIT
    ? Math.floor(activeWorkout.currentExerciseIndex / exercisesPerCircuit) + 1
    : 0;
  const totalCircuits = isHIIT
    ? Math.ceil(
        (activeWorkout.routine?.exercises.length || 1) / exercisesPerCircuit,
      )
    : 0;

  const timeLeft = activeWorkout.workTimeRemaining;
  const workUrgent = timeLeft <= 10;
  const total =
    currentExercise?.workSeconds ??
    (() => {
      const m = /(\d+)\s*s/i.exec(currentExercise?.reps || "");
      return m ? Number(m[1]) : 45;
    })();

  const handleFinishNow = () => {
    stopSpeaking();
    const elapsed =
      (currentExercise?.workSeconds ??
        (() => {
          const m = /(\d+)\s*s/i.exec(currentExercise?.reps || "");
          return m ? Number(m[1]) : 45;
        })()) - activeWorkout.workTimeRemaining;
    skipWork();
    completeSet(
      activeWorkout.currentExerciseIndex,
      activeWorkout.currentSet,
      undefined,
      undefined,
      Math.max(1, elapsed),
    );
  };

  const handleExit = async (save: boolean) => {
    stopSpeaking();
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
          {isHIIT ? `CIRCUITO ${circuitNumber}/${totalCircuits}` : "TRABAJO"}
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

      {/* Pulsing neon halo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[520px] h-[520px] rounded-full blur-[120px] animate-ambient ${
            workUrgent ? "bg-error/15" : "bg-primary-container/12"
          }`}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto">
        <div className="flex flex-col items-center mb-4">
          <h2 className="font-headline-lg text-headline-lg text-on-surface uppercase text-center">
            {currentExercise?.name}
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Serie {activeWorkout.currentSet} de {currentExercise?.sets}
          </p>
        </div>

        <TimerCircle
          seconds={timeLeft}
          total={total}
          size={260}
          strokeWidth={10}
          urgent={workUrgent}
          label="segundos"
          className="mb-6"
        />

        <div className="w-full mb-6">
          <div className="w-full bg-surface-container-high border border-surface-container-highest rounded-2xl p-3 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-surface-container-highest">
              <ExerciseImage
                src={currentExercise?.image || ""}
                alt={currentExercise?.name || "Ejercicio"}
                containerClassName="w-full h-full"
              />
            </div>
            <p className="text-on-surface-variant text-sm flex-1 line-clamp-2">
              {currentExercise?.description}
            </p>
          </div>
        </div>

        <PrimaryButton
          variant="secondary"
          size="md"
          rightIcon={<FastForward className="w-5 h-5 text-primary-container" />}
          onClick={handleFinishNow}
          className="max-w-[300px]"
        >
          Terminar antes
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
