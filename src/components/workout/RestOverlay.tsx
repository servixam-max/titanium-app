"use client";

import { useEffect, useRef, useState } from "react";
import { FastForward, Plus, Minus, ArrowLeft, Volume2, VolumeX, Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import TimerCircle from "@/components/ui/TimerCircle";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ExitConfirmModal from "./ExitConfirmModal";
import {
  playRestEndAlarm,
  announceRest,
  announceCountdown,
  announceStart,
  announceTenSecondsLeft,
  announceThirtySecondsLeft,
  announceHalfRest,
  stopSpeaking,
} from "@/lib/audio";

export default function RestOverlay() {
  const router = useRouter();
  const {
    activeWorkout,
    skipRest,
    tickRest,
    adjustRest,
    cancelWorkout,
    finishWorkout,
    audioEnabled,
    toggleAudio,
  } = useAppStore();

  const prevTimeRef = useRef(activeWorkout.restTimeRemaining);
  const hasAnnouncedRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];

  // 1s tick
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
    const totalTime = currentExercise?.restSeconds || 60;

    if (timeLeft === 10 && prevTime > 10) {
      announceTenSecondsLeft(currentExercise?.name);
    }

    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTime) {
      announceCountdown(timeLeft);
    }

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

    if (timeLeft === 0 && prevTime > 0) {
      playRestEndAlarm();
      announceStart();
    }

    prevTimeRef.current = timeLeft;
  }, [
    activeWorkout.restTimeRemaining,
    activeWorkout.isResting,
    audioEnabled,
    currentExercise?.name,
    currentExercise?.restSeconds,
  ]);

  // Reset on close
  useEffect(() => {
    if (!activeWorkout.isResting) {
      stopSpeaking();
    }
  }, [activeWorkout.isResting]);

  if (!activeWorkout.isResting) return null;

  const totalTime = currentExercise?.restSeconds || 75;
  const timeLeft = activeWorkout.restTimeRemaining;
  const restUrgent = timeLeft <= 10;

  const isNewExercise = activeWorkout.currentSet === 1;
  const upcomingSet = activeWorkout.currentSet;
  const totalSets = currentExercise?.sets || 1;

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
          className="flex items-center gap-1 h-10 px-2 text-white hover:text-primary active:scale-95 transition-all"
          aria-label="Volver atrás o cancelar"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-xs font-bold font-label-caps uppercase">Salir</span>
        </button>
        <span className="text-primary font-label-caps tracking-[0.2em] text-xs uppercase font-bold">
          Descanso
        </span>
        <button
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-white active:scale-95"
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
            restUrgent ? "bg-red-500/15" : "bg-primary/10"
          }`}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto">
        <div className="flex flex-col items-center mb-4">
          <span className="text-primary font-label-caps tracking-[0.25em] text-xs uppercase mb-1">
            Intervalo de Recuperación
          </span>
          <h2 className="font-headline-lg text-headline-lg text-white uppercase">
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

        {/* Upcoming Exercise Preview Card */}
        <div className="w-full mb-6">
          <p className="text-zinc-400 font-label-caps tracking-[0.2em] text-[11px] uppercase mb-2 text-center">
            {isNewExercise ? "A continuación:" : "Continúas con:"}
          </p>
          <div className="w-full bg-[#161e2e] border border-white/10 rounded-2xl p-3 flex items-center gap-4 animate-fade-in-up shadow-lg">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#121620] flex-shrink-0 border border-white/10">
              <ExerciseImage
                src={currentExercise?.image || ""}
                alt={currentExercise?.name || "Ejercicio"}
                containerClassName="w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white font-headline-md text-headline-md truncate">
                {currentExercise?.name}
              </p>
              <div className="flex items-center gap-2 mt-1 text-zinc-400 text-xs flex-wrap">
                <span className="flex items-center gap-1 font-bold text-white">
                  <Dumbbell className="w-3.5 h-3.5 text-primary" />
                  Serie {upcomingSet} de {totalSets}
                </span>
                <span className="text-zinc-600">·</span>
                <span>{currentExercise?.reps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Adjust rest buttons */}
        <div className="flex items-center justify-center gap-3 mb-3 w-full">
          <PrimaryButton
            variant="secondary"
            size="md"
            leftIcon={<Minus className="w-4 h-4 text-primary" />}
            onClick={() => adjustRest(-15)}
            className="flex-1 max-w-[140px]"
          >
            -15s
          </PrimaryButton>
          <PrimaryButton
            variant="secondary"
            size="md"
            leftIcon={<Plus className="w-4 h-4 text-primary" />}
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
          rightIcon={<FastForward className="w-5 h-5 text-primary" />}
          onClick={() => {
            stopSpeaking();
            skipRest();
          }}
          className="max-w-[300px]"
        >
          Saltar descanso
        </PrimaryButton>
      </div>

      <ExitConfirmModal
        open={showExitConfirm}
        onSave={() => handleExit(true)}
        onCancel={() => handleExit(false)}
        onContinue={() => setShowExitConfirm(false)}
      />
    </div>
  );
}

