"use client";

import RoutineCard from "@/components/ui/RoutineCard";
import RoutineDetailModal from "@/components/ui/RoutineDetailModal";
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
import { Routine, WorkoutSession } from "@/lib/types";
import { APP_VERSION } from "@/lib/ota-sync";
import { motion } from "framer-motion";

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
  const { activeWorkout, audioMode, voiceRate, sessions: storeSessions } = useAppStore();
  const [audioWarmedUp, setAudioWarmedUp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [sessionsList, setSessionsList] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalMinutes: 0,
    weeklyDays: [false, false, false, false, false, false, false],
    todayIndex: 0,
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 13) return "Buenos días";
    if (hour >= 13 && hour < 21) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);

    // Load streak & weekly stats from IndexedDB or store
    getSessions().then((sessions) => {
      const allSessions = sessions && sessions.length > 0 ? sessions : storeSessions;
      setSessionsList(allSessions);
      setStreakCount(calculateStreak(allSessions));

      const completed = allSessions.filter((s) => s.completed && s.endTime);
      const totalWorkouts = completed.length;
      const totalMinutes = Math.round(
        completed.reduce((sum, s) => {
          const dur =
            s.endTime && s.startTime
              ? (new Date(s.endTime).getTime() -
                  new Date(s.startTime).getTime()) /
                60000
              : 0;
          return sum + Math.max(0, dur);
        }, 0)
      );

      const now = new Date();
      const currentDay = now.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + mondayOffset
      );
      monday.setHours(0, 0, 0, 0);

      const daysTrained = [false, false, false, false, false, false, false];
      completed.forEach((s) => {
        const d = new Date(s.endTime!);
        const diffDays = Math.floor(
          (d.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays >= 0 && diffDays < 7) {
          daysTrained[diffDays] = true;
        }
      });

      const todayIdx = currentDay === 0 ? 6 : currentDay - 1;

      setStats({
        totalWorkouts,
        totalMinutes,
        weeklyDays: daysTrained,
        todayIndex: todayIdx,
      });
    });
  }, [audioMode, voiceRate, storeSessions]);

  const completedTodayRoutineIds = useMemo(() => {
    const today = new Date();
    const set = new Set<number>();
    const list = sessionsList.length > 0 ? sessionsList : storeSessions;
    list
      .filter((s) => s.completed && s.endTime && sameDay(new Date(s.endTime), today))
      .forEach((s) => set.add(Number(s.routineId)));
    return set;
  }, [sessionsList, storeSessions]);

  const handleFirstInteraction = () => {
    if (!audioWarmedUp) {
      if (audioMode !== "silent") {
        import("@/lib/audio").then(({ playBeep }) =>
          playBeep(300, 0.01, "sine", 0.01)
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
      className="h-[100dvh] flex flex-col overflow-hidden bg-[#080808] text-white select-none"
      onClick={handleFirstInteraction}
    >
      {/* Background Cyber Ambient Mesh Glows */}
      <div className="fixed top-[-15%] left-[-15%] w-[55%] h-[55%] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[55%] h-[55%] bg-primary-container/5 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />

      <TopAppBar title="FORTIXAM" showSettings />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2.5 relative z-10">
        {/* Welcome & Streak Banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex-shrink-0 flex flex-col gap-2.5 bg-[#111116]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] overflow-hidden group"
        >
          {/* Subtle animated border top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-container/60 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 z-10">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  FORTIXAM v{APP_VERSION}
                </span>
                <Sparkles className="w-3 h-3 text-primary-container animate-pulse" />
              </div>
              <h2 className="font-headline-md text-lg sm:text-xl font-bold truncate text-white mt-0.5 tracking-tight">
                ¡{greeting}, xam!
              </h2>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-primary-container/40 flex-shrink-0 shadow-[0_0_15px_rgba(204,255,0,0.15)] z-10">
              <Flame className="w-4 h-4 text-primary-container fill-primary-container animate-pulse" />
              <div className="flex flex-col">
                <span className="font-bold text-primary-container text-base leading-none font-mono">
                  {streakCount}
                </span>
                <span className="text-[8px] font-label-caps text-zinc-400 uppercase tracking-tighter font-bold">
                  {streakCount === 1 ? "Día" : "Días"}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Consistency Tracker */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {["L", "M", "X", "J", "V", "S", "D"].map((dayName, idx) => {
                const trained = stats.weeklyDays[idx];
                const isToday = idx === stats.todayIndex;
                return (
                  <div
                    key={dayName}
                    className={`w-7 h-7 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all ${
                      trained
                        ? "bg-primary-container text-black shadow-[0_0_8px_rgba(204,255,0,0.4)]"
                        : isToday
                          ? "border border-primary-container/80 text-primary-container bg-primary-container/10"
                          : "bg-white/5 text-zinc-500 border border-white/5"
                    }`}
                    title={`${dayName}: ${trained ? "Completado" : isToday ? "Hoy" : "Pendiente"}`}
                  >
                    <span>{dayName}</span>
                  </div>
                );
              })}
            </div>

            {/* Micro Stats */}
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 pl-2">
              <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5">
                ⚡ <strong className="text-white">{stats.totalWorkouts}</strong>
              </span>
              <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5">
                ⏱️ <strong className="text-white">{stats.totalMinutes}m</strong>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Warmup */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Link
            href="/warmup"
            className="flex-shrink-0 h-[52px] bg-[#111116]/80 hover:bg-[#16161d] border border-primary-container/30 hover:border-primary-container/60 rounded-xl flex items-center gap-3 px-3.5 active:scale-98 transition-all shadow-md group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-container group-hover:text-black transition-colors">
              <Zap className="w-4 h-4 text-primary-container group-hover:text-black transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-body-md text-sm font-bold text-white group-hover:text-primary-container block truncate transition-colors">
                Calentamiento Rápido
              </span>
              <span className="font-label-caps text-[10px] text-zinc-400">
                {warmUpExercises.length} ejercicios · 60s por ejercicio
              </span>
            </div>
            <svg
              className="w-4 h-4 text-zinc-400 group-hover:text-primary-container group-hover:translate-x-0.5 transition-all flex-shrink-0"
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
        </motion.div>

        {/* Resume Workout Banner */}
        {activeWorkout.routine && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => router.push(`/workout/${activeWorkout.mode}`)}
            className="flex-shrink-0 h-[58px] bg-primary-container text-black rounded-xl flex items-center gap-3 px-3.5 active:scale-98 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] font-bold"
          >
            <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-black fill-current" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="text-sm font-bold block truncate">
                Continuar entrenamiento
              </span>
              <span className="text-[10px] font-label-caps text-black/80">
                {activeWorkout.routine.title} · Ejercicio{" "}
                {activeWorkout.currentExerciseIndex + 1}
              </span>
            </div>
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
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
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-label-caps whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "text-black font-bold"
                    : "text-zinc-400 hover:text-white bg-zinc-900/80 border border-white/10"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-category-chip"
                    className="absolute inset-0 bg-primary-container rounded-full shadow-[0_0_12px_rgba(204,255,0,0.3)] -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Routines List - scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-headline-sm text-sm font-bold border-l-3 border-primary-container pl-2 text-white">
              Rutinas ({filteredRoutines.length})
            </h3>
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="text-[11px] text-primary-container hover:underline font-bold"
              >
                Ver todas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pb-[130px] pr-0.5">
            {filteredRoutines.map((routine, index) => (
              <RoutineCard
                key={routine.day}
                routine={routine}
                index={index}
                isCompletedToday={completedTodayRoutineIds.has(routine.day)}
                onClick={() => setSelectedRoutine(routine)}
              />
            ))}
          </div>
        </div>
      </main>

      <RoutineDetailModal
        routine={selectedRoutine}
        isOpen={Boolean(selectedRoutine)}
        isCompletedToday={selectedRoutine ? completedTodayRoutineIds.has(selectedRoutine.day) : false}
        onClose={() => setSelectedRoutine(null)}
      />

      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
