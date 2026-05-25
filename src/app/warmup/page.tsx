"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkipForward, ArrowRight, X, Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { warmUpExercises } from "@/lib/data";
import { announceWarmupComplete, announceExerciseStart, announceNextExercise } from "@/lib/speech";
import { playBeep } from "@/lib/audio";

export default function WarmupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfter = searchParams.get("redirect") || "/";
  const { audioEnabled, toggleAudio } = useAppStore();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  // Announce warmup start and first exercise
  useEffect(() => {
    if (audioEnabled && warmUpExercises.length > 0) {
      const firstEx = warmUpExercises[0];
      announceExerciseStart(firstEx.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce when exercise changes
  useEffect(() => {
    if (audioEnabled && currentExerciseIndex > 0) {
      const ex = warmUpExercises[currentExerciseIndex];
      if (ex) {
        setTimeout(() => {
          announceNextExercise(ex.name);
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
            // Warmup finished - always go back to home
            if (audioEnabled) {
              announceWarmupComplete();
              playBeep(1000, 0.3, "sine", 0.3);
            }
            router.push(redirectAfter);
            return 0;
          } else {
            // Next exercise
            setCurrentExerciseIndex((i) => i + 1);
            return 60;
          }
        }
        // Countdown beeps: 3, 2, 1
        if (audioEnabled && prev <= 3) {
          playBeep(600 + (3 - prev) * 200, 0.1, "sine", 0.2);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentExerciseIndex, router, audioEnabled]);

  const currentExercise = warmUpExercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / warmUpExercises.length) * 100;

  const handleSkip = () => {
    router.push(redirectAfter);
  };

  const handleNext = () => {
    if (currentExerciseIndex >= warmUpExercises.length - 1) {
      router.push(redirectAfter);
    } else {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setTimeLeft(60);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex-shrink-0 h-[48px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <button 
          onClick={handleSkip}
          className="flex items-center justify-center w-10 h-10 text-on-surface hover:opacity-80 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider">
          CALENTAMIENTO
        </h1>
        <button 
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:opacity-80 active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Progress Bar */}
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

      {/* Exercise Name */}
      <div className="flex-shrink-0 px-4 py-2 text-center">
        <h2 className="font-headline-md text-headline-md">{currentExercise?.name}</h2>
        <p className="text-on-surface-variant font-body-sm mt-1">{currentExercise?.description}</p>
      </div>

      {/* Exercise Image */}
      <div className="flex-shrink-0 flex-1 min-h-0 px-4">
        <div className="w-full h-full rounded-xl overflow-hidden border border-surface-container-highest relative">
          {currentExercise?.image ? (
            <img
              src={currentExercise.image}
              alt={currentExercise.name}
              className="w-full h-full object-contain bg-surface-container"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container">
              <svg className="w-16 h-16 text-primary-container opacity-30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Timer & Objective */}
      <div className="flex-shrink-0 flex items-center justify-between py-2 px-4">
        <div className="relative w-[120px] h-[120px]">
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
              stroke="#ccff00"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeLeft / 60)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display-timer text-[32px] text-primary-container tabular-nums">{timeLeft}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-label-caps text-label-caps text-on-surface-variant block">OBJETIVO</span>
          <span className="font-headline-md text-on-surface">{currentExercise?.reps}</span>
        </div>
      </div>

      {/* Bottom Actions */}
      <footer className="flex-shrink-0 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 bg-background border-t border-surface-container-highest">
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 h-[52px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <SkipForward className="w-5 h-5" />
            Saltar
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {currentExerciseIndex >= warmUpExercises.length - 1 ? "Empezar" : "Siguiente"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
