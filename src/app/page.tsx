"use client";

import RoutineCard from "@/components/ui/RoutineCard";
import TopAppBar from "@/components/ui/TopAppBar";
import { routines, warmUpExercises } from "@/lib/data";
import { Flame, Play } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { setAudioMode, setVoiceRate } from "@/lib/audio";
import { preloadVoices } from "@/lib/speech";
import { useAppStore } from "@/lib/store";

const InstallPrompt = dynamic(() => import("@/components/ui/InstallPrompt"), {
  ssr: false,
});

export default function Dashboard() {
  const router = useRouter();
  const { activeWorkout, audioMode, voiceRate } = useAppStore();
  const [audioWarmedUp, setAudioWarmedUp] = useState(false);

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  const handleFirstInteraction = () => {
    if (!audioWarmedUp) {
      // Warm up AudioContext with a tiny beep if audio is not silent
      if (audioMode !== "silent") {
        import("@/lib/audio").then(({ playBeep }) =>
          playBeep(300, 0.01, "sine", 0.01),
        );
      }
      setAudioWarmedUp(true);
    }
  };

  return (
    <div
      className="h-[100dvh] animate-page-in flex flex-col overflow-hidden bg-background"
      onClick={handleFirstInteraction}
    >
      <TopAppBar title="FORTIXAM" showSettings />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-3 gap-3">
        {/* Welcome Text */}
        <div className="flex-shrink-0">
          <h2 className="font-headline-md text-headline-md text-primary-container">
            ¡Vamos xam!
          </h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">
            Tu cuerpo escucha todo lo que tu mente dice.
          </p>
        </div>

        {/* Quick Warmup */}
        <Link
          href="/warmup"
          className="flex-shrink-0 h-[56px] bg-surface-container-high border border-primary-container/30 rounded-xl flex items-center gap-3 px-3 hover:bg-surface-container-high active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-primary-container" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-body-md text-body-md font-bold text-primary-container block truncate">
              Calentamiento Rápido
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              {warmUpExercises.length} ejercicios · 60 segundos
            </span>
          </div>
          <svg
            className="w-5 h-5 text-primary-container flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

        {/* Resume Workout Banner */}
        {activeWorkout.routine && (
          <button
            onClick={() => router.push(`/workout/${activeWorkout.mode}`)}
            className="flex-shrink-0 h-[64px] bg-primary-container text-on-primary-container rounded-xl flex items-center gap-3 px-4 active:scale-95 transition-all shadow-neon"
          >
            <div className="w-10 h-10 rounded-full bg-on-primary-container/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-on-primary-container fill-current" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="font-body-md text-body-md font-bold block truncate">
                Continuar entrenamiento
              </span>
              <span className="font-label-caps text-[10px] text-on-primary-container/80">
                {activeWorkout.routine.title} · Ejercicio{" "}
                {activeWorkout.currentExerciseIndex + 1}
              </span>
            </div>
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Routines List - scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="flex-shrink-0 font-headline-sm text-headline-sm border-l-4 border-primary-container pl-3 mb-2">
            Elegir Rutina
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pb-[140px]">
            {routines.map((routine, index) => (
              <div
                key={routine.day}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <RoutineCard
                  routine={routine}
                  showEquipmentToggle={routine.day === 3}
                />
              </div>
            ))}
          </div>
        </div>
      </main>

      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
