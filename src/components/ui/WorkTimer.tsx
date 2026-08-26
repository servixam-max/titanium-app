"use client";

import { FastForward } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import TimerCircle from "@/components/ui/TimerCircle";
import ExerciseImage from "@/components/ui/ExerciseImage";
import PrimaryButton from "@/components/ui/PrimaryButton";
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
 * and completeSet() starts the following rest — so this overlay just
 * renders countdown + sounds and offers a manual "finish now" button.
 */
export default function WorkTimer() {
  const { activeWorkout, tickWork, skipWork, completeSet, audioEnabled } =
    useAppStore();
  const prevTimeRef = useRef(activeWorkout.workTimeRemaining);
  const hasAnnouncedRef = useRef(false);
  const endAnnouncedRef = useRef(false);

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

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0a0a]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Pulsing neon halo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[520px] h-[520px] rounded-full blur-[120px] animate-ambient ${
            workUrgent ? "bg-error/15" : "bg-primary-container/12"
          }`}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <span className="text-primary-container font-label-caps tracking-[0.3em] text-xs mb-2">
            {isHIIT
              ? `CIRCUITO ${circuitNumber} DE ${totalCircuits}`
              : "TRABAJO"}
          </span>
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
          size={288}
          strokeWidth={10}
          urgent={workUrgent}
          label="segundos"
          className="mb-8"
        />

        <div className="w-full mb-8">
          <p className="text-on-surface-variant font-label-caps tracking-[0.2em] text-[11px] uppercase mb-3 text-center">
            ¡Dalo todo!
          </p>
          <div className="w-full bg-surface-container-high border border-surface-container-highest rounded-2xl p-3 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-surface-container-highest">
              <ExerciseImage
                src={currentExercise?.image || ""}
                alt={currentExercise?.name || "Ejercicio"}
                containerClassName="w-full h-full"
              />
            </div>
            <p className="text-on-surface-variant text-sm flex-1">
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
    </div>
  );
}
