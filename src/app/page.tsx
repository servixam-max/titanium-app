"use client";

import RoutineCard from "@/components/ui/RoutineCard";
import TopAppBar from "@/components/ui/TopAppBar";
import { routines, warmUpExercises } from "@/lib/data";
import { Flame, Play, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { setAudioMode, setVoiceRate } from "@/lib/audio";
import { preloadVoices } from "@/lib/speech";
import { useAppStore } from "@/lib/store";
import { getSessions } from "@/lib/db";
import { WorkoutSession } from "@/lib/types";
import { APP_VERSION } from "@/lib/ota-sync";

const InstallPrompt = dynamic(() => import("@/components/ui/InstallPrompt"), {
  ssr: false,
});

type CategoryFilter = "all" | "fuerza" | "full_body" | "hiit" | "movilidad" | "personalizado";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function calculateStreak(sessions: WorkoutSession[]) {
  if (!sessions || sessions.length === 0) return 0;
  const completed = sessions.filter((s) => s.completed && s.endTime);
  const dates = Array.from(
    new Set(completed.map((s) => new Date(s.endTime!).toDateString())),
  ).map((d) => new Date(d));
  dates.sort((a, b) => b.getTime() - a.getTime());
  if (dates.length === 0) return 0;

  const today = new Date();
  let streak = 0;
  const check = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  if (!dates.some((d) => sameDay(d, check))) {
    check.setDate(check.getDate() - 1);
  }
  for (const d of dates) {
    if (sameDay(d, check)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (d < check) {
      break;
    }
  }
  return streak;
}

export default function Dashboard() {
  const router = useRouter();
  const { activeWorkout, audioMode, voiceRate } = useAppStore();
  const [audioWarmedUp, setAudioWarmedUp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);

    // Load streak from IndexedDB
    getSessions().then((sessions) => {
      setStreakCount(calculateStreak(sessions));
    });
  }, [audioMode, voiceRate]);

  const handleFirstInteraction = () => {
    if (!audioWarmedUp) {
      if (audioMode !== "silent") {
        import("@/lib/audio").then(({ playBeep }) =>
          playBeep(300, 0.01, "sine", 0.01),
        );
      }
      setAudioWarmedUp(true);
    }
  };

  const filteredRoutines = useMemo(() => {
    if (selectedCategory === "all") return routines;
    return routines.filter((r) => r.categoryTag === selectedCategory);
  }, [selectedCategory]);

  return (
    <div
      className="h-[100dvh] animate-page-in flex flex-col overflow-hidden bg-background"
      onClick={handleFirstInteraction}
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-surface-variant/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />

      <TopAppBar title="FORTIXAM" showSettings />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-3 relative z-10">
        {/* Welcome & Streak Banner */}
        <div className="relative flex-shrink-0 flex items-center justify-between gap-3 bg-surface-container-lowest/60 backdrop-blur-xl border border-surface-container-highest/50 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden group">
          {/* Subtle animated border top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-container/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="min-w-0 z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider">
                FORTIXAM v{APP_VERSION}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-primary-container animate-pulse" />
            </div>
            <h2 className="font-headline-md text-headline-md font-bold truncate bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-container to-white animate-gradient-x">
              ¡Vamos xam!
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 truncate">
              Tu cuerpo escucha todo lo que tu mente dice.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-surface-container-high/80 border border-primary-container/40 flex-shrink-0 shadow-[0_0_15px_rgba(204,255,0,0.15)] z-10">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-primary-container fill-primary-container animate-soft-pulse" />
              <span className="font-bold text-primary-container text-lg leading-none">
                {streakCount}
              </span>
            </div>
            <span className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-tighter mt-0.5">
              {streakCount === 1 ? "Día" : "Días"}
            </span>
          </div>
        </div>

        {/* Quick Warmup */}
        <Link
          href="/warmup"
          className="flex-shrink-0 h-[52px] bg-surface-container-high border border-primary-container/30 rounded-xl flex items-center gap-3 px-3.5 hover:bg-surface-container-high active:scale-95 transition-all shadow-rest"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary-container" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-body-md text-sm font-bold text-primary-container block truncate">
              Calentamiento Rápido
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              {warmUpExercises.length} ejercicios · 60s por ejercicio
            </span>
          </div>
          <svg
            className="w-4 h-4 text-primary-container flex-shrink-0"
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
            className="flex-shrink-0 h-[58px] bg-primary-container text-on-primary-container rounded-xl flex items-center gap-3 px-3.5 active:scale-95 transition-all shadow-neon"
          >
            <div className="w-8 h-8 rounded-lg bg-on-primary-container/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-on-primary-container fill-current" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="font-body-md text-sm font-bold block truncate">
                Continuar entrenamiento
              </span>
              <span className="font-label-caps text-[10px] text-on-primary-container/80">
                {activeWorkout.routine.title} · Ejercicio{" "}
                {activeWorkout.currentExerciseIndex + 1}
              </span>
            </div>
            <svg
              className="w-4 h-4 flex-shrink-0"
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

        {/* Category Filter Chips */}
        <div className="flex-shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "Todas" },
            { id: "full_body", label: "Full Body" },
            { id: "fuerza", label: "Fuerza" },
            { id: "hiit", label: "HIIT" },
            { id: "movilidad", label: "Movilidad" },
            { id: "personalizado", label: "Libre" },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-label-caps whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                    : "bg-surface-container-low text-on-surface-variant border border-surface-container-highest hover:text-on-surface"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Routines List - scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-headline-sm text-sm font-bold border-l-4 border-primary-container pl-2.5">
              Rutinas ({filteredRoutines.length})
            </h3>
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="text-[11px] text-primary-container hover:underline"
              >
                Ver todas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-[140px] pr-0.5">
            {filteredRoutines.map((routine, index) => (
              <div
                key={routine.day}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <RoutineCard
                  routine={routine}
                  showEquipmentToggle={
                    routine.type === "hiit" &&
                    Boolean(routine.alternativeExercises)
                  }
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
