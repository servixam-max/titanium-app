"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkipForward, ArrowRight } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import { useAppStore } from "@/lib/store";
import { warmUpExercises } from "@/lib/data";
import {
  announceWarmupComplete,
  announceExerciseStart,
  announceNextExercise,
  announceGetReady,
} from "@/lib/speech";
import {
  playBeep,
  playCountdown,
  setAudioMode,
  setVoiceRate,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import ExerciseImage from "@/components/ui/ExerciseImage";

function WarmupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfter = searchParams.get("redirect") || "/";
  const { audioEnabled, audioMode, voiceRate } = useAppStore();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleSkip = useCallback(() => {
    router.push(redirectAfter);
  }, [router, redirectAfter]);

  const handleNext = useCallback(() => {
    if (currentExerciseIndex >= warmUpExercises.length - 1) {
      router.push(redirectAfter);
    } else {
      setCurrentExerciseIndex((i) => i + 1);
      setTimeLeft(60);
    }
  }, [currentExerciseIndex, router, redirectAfter]);

  // Sync audio engine with store
  useEffect(() => {
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Announce warmup start and first exercise
  useEffect(() => {
    if (audioEnabled && warmUpExercises.length > 0) {
      announceExerciseStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce when exercise changes
  useEffect(() => {
    if (audioEnabled && currentExerciseIndex > 0) {
      const ex = warmUpExercises[currentExerciseIndex];
      if (ex) {
        setTimeout(() => {
          announceNextExercise();
        }, 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentExerciseIndex >= warmUpExercises.length - 1) {
            if (audioEnabled) {
              announceWarmupComplete();
              playBeep(1000, 0.3, "sine", 0.3);
              haptics.complete();
              // Aviso de preparación para el primer ejercicio del entreno
              if (redirectAfter !== "/") {
                setTimeout(() => announceGetReady(), 1200);
              }
            }
            router.push(redirectAfter);
            return 0;
          } else {
            setCurrentExerciseIndex((i) => i + 1);
            return 60;
          }
        }
        if (audioEnabled && prev <= 4 && prev > 1) {
          playCountdown(prev - 1);
          haptics.tick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentExerciseIndex, router, redirectAfter, audioEnabled]);

  const currentExercise = warmUpExercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / warmUpExercises.length) * 100;

  return (
    <div className="h-[100dvh] animate-page-in flex flex-col overflow-hidden bg-background">
      <TopAppBar
        title="CALENTAMIENTO"
        variant="workout"
        showBack
        backHref="/"
        showVolume
      />

      <div className="flex-shrink-0 px-4 pt-2 pb-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-primary-container font-label-caps uppercase tracking-widest text-[10px]">
            RUTINA DE ACTIVACIÓN
          </span>
          <span className="text-on-surface-variant font-label-caps uppercase tracking-widest text-[10px]">
            {currentExerciseIndex + 1} de {warmUpExercises.length}
          </span>
        </div>
        <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 text-center">
        <h2 className="font-headline-md text-headline-md">
          {currentExercise?.name}
        </h2>
        <p className="text-on-surface-variant font-body-sm mt-1">
          {currentExercise?.description}
        </p>
      </div>

      <div className="flex-shrink-0 flex-1 min-h-0 px-4">
        <div
          key={currentExerciseIndex}
          className="w-full h-full rounded-xl overflow-hidden border border-surface-container-highest relative animate-fade-in-up"
        >
          {currentExercise?.image ? (
            <ExerciseImage
              src={currentExercise.image}
              alt={currentExercise.name}
              containerClassName="w-full h-full"
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container">
              <svg
                className="w-16 h-16 text-primary-container opacity-30"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center justify-between py-2 px-4">
        <div
          className={`relative w-[120px] h-[120px] ${timeLeft <= 10 ? "" : "animate-breathe"}`}
        >
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#1f1f1f"
              strokeWidth="5"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={timeLeft <= 10 ? "#ffb4ab" : "#ccff00"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeLeft / 60)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-display-timer text-[32px] tabular-nums ${
                timeLeft <= 10 ? "animate-urgent" : "text-primary-container"
              }`}
            >
              {timeLeft}
            </span>
            <span className="text-on-surface-variant font-label-caps text-[9px] tracking-widest">
              SEG
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-label-caps text-label-caps text-on-surface-variant block">
            OBJETIVO
          </span>
          <span className="font-headline-md text-on-surface">
            {currentExercise?.reps}
          </span>
        </div>
      </div>

      <footer className="flex-shrink-0 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 bg-background border-t border-surface-container-highest">
        <div className="flex gap-2">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex-1 h-[52px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <SkipForward className="w-5 h-5" />
            Saltar
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {currentExerciseIndex >= warmUpExercises.length - 1
              ? "Empezar"
              : "Siguiente"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm bg-surface-container-low border border-surface-container-highest rounded-2xl p-6">
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              ¿Saltar calentamiento?
            </h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Se recomienda completarlo para evitar lesiones.
            </p>
            <div className="space-y-2">
              <button
                className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-transform"
                onClick={handleSkip}
              >
                Ir al entreno
              </button>
              <button
                className="w-full h-[44px] text-on-surface-variant text-sm active:scale-95"
                onClick={() => setShowExitConfirm(false)}
              >
                Continuar calentando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WarmupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-on-surface">Loading...</p>
        </div>
      }
    >
      <WarmupContent />
    </Suspense>
  );
}
