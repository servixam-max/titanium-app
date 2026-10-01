"use client";

import { useEffect, useRef } from "react";
import { FastForward } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  announceCountdown,
  announceHalfRest,
  announceStart,
  announceTenSecondsLeft,
  announceThirtySecondsLeft,
  playRestEndAlarm,
  stopSpeaking,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import {
  formatRestClock,
  isRestUrgent,
  restRemainingFraction,
} from "@/lib/rest-timer";
import { cn } from "@/lib/utils";

/**
 * Descanso flotante del modo individual (F2.2).
 *
 * Antes el descanso tapaba la pantalla completa: durante el reloj no se podía
 * tocar nada. Ahora es una tarjeta pegada bajo la cabecera que descuenta sin
 * bloquear: se puede ajustar peso/reps, revisar el ejercicio o registrar ya la
 * serie siguiente si se está listo. Mantiene los avisos de voz de mitad y del
 * último tramo (30 s, 10 s, 3-2-1) y añade el toque de fin de descanso, que
 * ahora sí suena al cumplirse el tiempo.
 */
export default function RestBar() {
  const { activeWorkout, tickRest, adjustRest, skipRest, audioEnabled } =
    useAppStore();

  const resting = activeWorkout.isResting;
  const timeLeft = activeWorkout.restTimeRemaining;
  const currentExercise =
    activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];

  const prevTimeRef = useRef(activeWorkout.restTimeRemaining);
  const prevRestingRef = useRef(resting);

  // Reloj del descanso: un tick por segundo
  useEffect(() => {
    if (!resting) return;
    const interval = setInterval(() => tickRest(), 1000);
    return () => clearInterval(interval);
  }, [resting, tickRest]);

  // Vibración corta al empezar un descanso nuevo
  useEffect(() => {
    if (resting && !prevRestingRef.current) haptics.restStart();
    prevRestingRef.current = resting;
  }, [resting]);

  // Avisos de voz del tramo final y fin de descanso
  useEffect(() => {
    const prevTime = prevTimeRef.current;
    const totalTime = currentExercise?.restSeconds || 60;

    if (!resting) {
      // tickRest apaga isResting justo al llegar a 0: si veníamos del último
      // segundo, el descanso terminó solo y toca avisar.
      if (audioEnabled && prevTime === 1 && timeLeft === 0) {
        playRestEndAlarm();
        announceStart();
      }
      prevTimeRef.current = timeLeft;
      return;
    }

    if (audioEnabled) {
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
    }

    prevTimeRef.current = timeLeft;
  }, [resting, timeLeft, audioEnabled, currentExercise?.name, currentExercise?.restSeconds]);

  // Al cerrarse, cortar la voz en curso
  useEffect(() => {
    if (!resting) stopSpeaking();
  }, [resting]);

  if (!resting) return null;

  const totalTime = currentExercise?.restSeconds || 75;
  const urgent = isRestUrgent(timeLeft);
  const fraction = restRemainingFraction(timeLeft, totalTime);
  const isNewExercise = activeWorkout.currentSet === 1;
  const upcomingSet = activeWorkout.currentSet;
  const totalSets = currentExercise?.sets || 1;
  const detail = isNewExercise
    ? `A continuación: ${currentExercise?.name ?? "el siguiente ejercicio"}`
    : `${currentExercise?.name ?? "Ejercicio"} · serie ${upcomingSet} de ${totalSets}`;

  return (
    <div className="sticky top-0 z-40 flex-shrink-0 bg-background py-1">
      <div
        role="timer"
        aria-label="Descanso en curso"
        className="overflow-hidden rounded-2xl bg-[var(--fx-card-strong)] shadow-[var(--fx-elevation-high)] animate-fade-in-up"
      >
        {/* Hilo de progreso del descanso */}
        <div className="h-1 w-full bg-[var(--fx-hairline)]">
          <div
            className={cn(
              "h-full rounded-r-full transition-all duration-1000 ease-linear",
              urgent ? "bg-red-500" : "bg-primary",
            )}
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>

        <div className="px-3.5 py-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 pb-0.5">
              <p className="fx-label-sm">Descanso</p>
              <p className="truncate text-[13px] leading-snug text-[color:var(--text-secondary)]">
                {detail}
              </p>
            </div>
            <span
              className={cn(
                "fx-num shrink-0 text-[24px] font-bold leading-none",
                urgent ? "text-red-600 dark:text-red-400" : "text-primary",
              )}
            >
              {formatRestClock(timeLeft)}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustRest(-15)}
              className="fx-press flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-[var(--fx-inset)] text-[14px] font-semibold text-foreground"
            >
              -15 s
            </button>
            <button
              type="button"
              onClick={() => adjustRest(15)}
              className="fx-press flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-[var(--fx-inset)] text-[14px] font-semibold text-foreground"
            >
              +15 s
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                skipRest();
              }}
              className="fx-press flex min-h-[48px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary/10 px-4 text-[14px] font-semibold text-emerald-700 dark:text-primary"
            >
              <FastForward className="h-4 w-4" />
              Saltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
