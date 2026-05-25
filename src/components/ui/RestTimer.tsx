"use client";

import { FastForward } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { playBeep, playRestEndAlarm } from "@/lib/audio";
import {
  announceRest,
  announceCountdown,
  announceStart,
  announceNextExercise,
  stopSpeaking,
} from "@/lib/speech";

export default function RestTimer() {
  const { activeWorkout, skipRest, tickRest, audioEnabled } = useAppStore();
  const prevTimeRef = useRef(activeWorkout.restTimeRemaining);
  const hasAnnouncedRef = useRef(false);

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

    // Voice countdown: 3, 2, 1
    if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== prevTime) {
      announceCountdown(timeLeft);
      playBeep(1000, 0.12, "sine", 0.25);
    }

    // Rest ended
    if (timeLeft === 0 && prevTime > 0) {
      playRestEndAlarm();
      announceStart();
      const nextEx = activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
      if (nextEx) {
        setTimeout(() => announceNextExercise(nextEx.name), 800);
      }
    }

    prevTimeRef.current = timeLeft;
  }, [activeWorkout.restTimeRemaining, activeWorkout.isResting, audioEnabled]);

  // Reset on close
  useEffect(() => {
    if (!activeWorkout.isResting) {
      stopSpeaking();
    }
  }, [activeWorkout.isResting]);

  if (!activeWorkout.isResting) return null;

  const totalTime =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex]
      ?.restSeconds || 60;
  const timeLeft = activeWorkout.restTimeRemaining;
  const progress = timeLeft / totalTime;

  // SVG circle math
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const nextExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
  const isLastSet = activeWorkout.currentSet >= (nextExercise?.sets || 1);

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-safe flex flex-col items-center justify-center p-container-padding transition-all duration-300">
      <div className="absolute top-12 flex flex-col items-center">
        <span className="text-primary-container font-label-caps tracking-[0.3em] mb-2">
          MODO GUIADO
        </span>
        <h2 className="font-headline-lg-mobile text-on-surface uppercase">
          Descanso
        </h2>
      </div>

      {/* Circular Timer */}
      <div className="relative w-72 h-72 flex items-center justify-center mb-12">
        <svg className="w-full h-full">
          <circle
            cx="144"
            cy="144"
            fill="none"
            r={radius}
            stroke="#262626"
            strokeWidth="8"
          />
          <circle
            className="timer-circle"
            cx="144"
            cy="144"
            fill="none"
            r={radius}
            stroke="#ccff00"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display-timer text-display-timer text-primary-container neon-glow tabular-nums">
            {timeLeft}
          </span>
          <span className="font-headline-md text-headline-md text-primary-container mt-8 ml-1">
            s
          </span>
        </div>
      </div>

      {/* Next Exercise Info */}
      <div className="text-center mb-12">
        <p className="text-on-surface-variant font-label-caps tracking-widest mb-2 uppercase">
          A continuación:
        </p>
        <h4 className="font-headline-md text-on-surface">
          {nextExercise?.name}
          {isLastSet ? " (Siguiente Ejercicio)" : `(Serie ${activeWorkout.currentSet + 1})`}
        </h4>
      </div>

      {/* Skip Button */}
      <button
        onClick={() => {
          stopSpeaking();
          skipRest();
        }}
        className="w-full bg-surface-container-high text-on-surface font-headline-md h-touch-target-min py-4 rounded-2xl border border-surface-container-highest active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        Saltar Descanso
        <FastForward className="w-5 h-5" />
      </button>
    </div>
  );
}
