"use client";

import RoutineCard from "@/components/ui/RoutineCard";
import RoutineDetailModal from "@/components/ui/RoutineDetailModal";
import TopAppBar from "@/components/ui/TopAppBar";
import { routines, warmUpExercises } from "@/lib/data";
import {
  Flame,
  Play,
  Sparkles,
  Zap,
  ChevronRight,
  Clock,
  Dumbbell,
  ArrowRight,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Layers,
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { haptics } from "@/lib/haptics";

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
  const { activeWorkout, audioMode, voiceRate, sessions: storeSessions, currentUser } = useAppStore();
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
    weeklyCount: 0,
  });

  const { greetingText, GreetingIcon } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 13) {
      return { greetingText: "Buenos días", GreetingIcon: Sunrise };
    }
    if (hour >= 13 && hour < 20) {
      return { greetingText: "Buenas tardes", GreetingIcon: Sun };
    }
    return { greetingText: "Buenas noches", GreetingIcon: Moon };
  }, []);

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);

    getSessions(currentUser?.id).then((sessions) => {
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
      let weekCount = 0;
      completed.forEach((s) => {
        const d = new Date(s.endTime!);
        const diffDays = Math.floor(
          (d.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays >= 0 && diffDays < 7) {
          if (!daysTrained[diffDays]) {
            daysTrained[diffDays] = true;
            weekCount++;
          }
        }
      });

      const todayIdx = currentDay === 0 ? 6 : currentDay - 1;

      setStats({
        totalWorkouts,
        totalMinutes,
        weeklyDays: daysTrained,
        todayIndex: todayIdx,
        weeklyCount: weekCount,
      });
    });
  }, [audioMode, voiceRate, storeSessions, currentUser]);

  const completedTodayRoutineIds = useMemo(() => {
    const today = new Date();
    const set = new Set<number>();
    const list = sessionsList.length > 0 ? sessionsList : storeSessions;
    list
      .filter((s) => s.completed && s.endTime && sameDay(new Date(s.endTime), today))
      .forEach((s) => set.add(Number(s.routineId)));
    return set;
  }, [sessionsList, storeSessions]);

  // Next recommended workout based on user's recent training history
  const recommendedRoutine = useMemo(() => {
    const completed = sessionsList.filter((s) => s.completed && s.routineId);
    if (completed.length === 0) return routines[0];
    const lastRoutineId = Number(completed[0].routineId);
    if (isNaN(lastRoutineId) || lastRoutineId < 1 || lastRoutineId > 10) {
      return routines[0];
    }
    const nextDay = (lastRoutineId % 10) + 1;
    return routines.find((r) => r.day === nextDay) || routines[0];
  }, [sessionsList]);

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
      className="h-[100dvh] flex flex-col overflow-hidden bg-[#080B10] text-white select-none"
      onClick={handleFirstInteraction}
    >
      {/* Background Cyber Ambient Mesh Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <TopAppBar title="FORTIXAM" showSettings />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-3 relative z-10 overflow-hidden">
        {/* Welcome & Consistency Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex-shrink-0 bg-gradient-to-br from-[#111622]/90 to-[#141B2A]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                <GreetingIcon className="w-3.5 h-3.5 text-primary" />
                <span>{greetingText}</span>
              </div>
              <h2 className="font-mono text-xl sm:text-2xl font-black text-white truncate tracking-tight mt-0.5">
                {currentUser?.username || "Atleta"}
              </h2>
            </div>

            {/* Streak Counter Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/50 border border-primary/40 flex-shrink-0 shadow-[0_0_15px_rgba(0,245,155,0.2)]">
              <Flame className="w-4 h-4 text-primary fill-primary animate-pulse" />
              <div className="flex flex-col text-right">
                <span className="font-black text-primary text-base leading-none font-mono">
                  {streakCount}
                </span>
                <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-tighter">
                  {streakCount === 1 ? "Día racha" : "Días racha"}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Consistency Bar */}
          <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {["L", "M", "X", "J", "V", "S", "D"].map((dayName, idx) => {
                const trained = stats.weeklyDays[idx];
                const isToday = idx === stats.todayIndex;
                return (
                  <div
                    key={dayName}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-mono font-black transition-all ${
                      trained
                        ? "bg-primary text-black shadow-neon"
                        : isToday
                          ? "border-2 border-primary/90 text-primary bg-primary/10 shadow-[0_0_8px_rgba(0,245,155,0.3)]"
                          : "bg-white/5 text-zinc-500 border border-white/5"
                    }`}
                  >
                    <span>{dayName}</span>
                  </div>
                );
              })}
            </div>

            {/* Micro Stats */}
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 pl-2">
              <span className="bg-white/5 px-2 py-1 rounded-xl border border-white/5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <strong className="text-white">{stats.totalWorkouts}</strong>
              </span>
              <span className="bg-white/5 px-2 py-1 rounded-xl border border-white/5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <strong className="text-white">{stats.totalMinutes}m</strong>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Active Workout Resumption (If any) */}
        {activeWorkout.routine && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => router.push(`/workout/${activeWorkout.mode}`)}
            className="flex-shrink-0 h-[58px] bg-gradient-to-r from-primary to-emerald-400 text-black rounded-2xl flex items-center gap-3 px-4 active:scale-98 transition-all shadow-[0_0_20px_rgba(0,245,155,0.3)] font-mono font-black cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-black fill-current" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="text-xs font-black uppercase tracking-wider block truncate">
                Continuar entrenamiento
              </span>
              <span className="text-[10px] font-bold text-black/80 truncate block">
                {activeWorkout.routine.title} · Ejercicio {activeWorkout.currentExerciseIndex + 1}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </motion.button>
        )}

        {/* Hero Card: Recommended Today's Workout */}
        {!activeWorkout.routine && recommendedRoutine && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="flex-shrink-0 bg-gradient-to-br from-[#131a2b] via-[#161f33] to-[#101524] border-2 border-primary/40 rounded-3xl p-4 shadow-[0_4px_25px_rgba(0,245,155,0.12)] relative overflow-hidden group"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-primary">
                  Siguiente en tu plan
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {recommendedRoutine.duration}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-mono text-base font-black text-white truncate group-hover:text-primary transition-colors">
                  Día {recommendedRoutine.day} · {recommendedRoutine.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    {recommendedRoutine.exercises.length} ejercicios
                  </span>
                  <span>•</span>
                  <span className="text-zinc-300 font-bold uppercase">
                    {recommendedRoutine.equipment || "Mancuernas"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  haptics.light();
                  setSelectedRoutine(recommendedRoutine);
                }}
                className="h-10 px-4 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-neon hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
              >
                <span>Empezar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Quick Warmup Bar */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <Link
            href="/warmup"
            onClick={() => haptics.selection()}
            className="flex-shrink-0 h-[48px] bg-[#111622]/80 hover:bg-[#141b2a] border border-white/10 hover:border-cyan-400/40 rounded-2xl flex items-center gap-3 px-3.5 active:scale-98 transition-all shadow-md group"
          >
            <div className="w-7 h-7 rounded-xl bg-cyan-400/15 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400 group-hover:text-black transition-colors">
              <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:text-black transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-400 block truncate transition-colors">
                Calentamiento y Movilidad Articular
              </span>
            </div>
            <span className="font-mono text-[10px] text-zinc-400 group-hover:text-white transition-colors">
              {warmUpExercises.length} ej (60s)
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-all flex-shrink-0" />
          </Link>
        </motion.div>

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
                onClick={() => {
                  haptics.selection();
                  setSelectedCategory(cat.id as CategoryFilter);
                }}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                  isSelected
                    ? "text-black font-black"
                    : "text-zinc-400 hover:text-white bg-[#111622] border border-white/10"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-category-chip"
                    className="absolute inset-0 bg-primary rounded-xl shadow-neon -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Routines List - Scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider border-l-2 border-primary pl-2 text-white">
              Catálogo de Rutinas ({filteredRoutines.length})
            </h3>
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="text-[11px] text-cyan-400 hover:underline font-mono font-bold cursor-pointer"
              >
                Ver todas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pb-[110px] pr-0.5">
            {filteredRoutines.map((routine, index) => (
              <RoutineCard
                key={routine.day}
                routine={routine}
                index={index}
                isCompletedToday={completedTodayRoutineIds.has(routine.day)}
                onClick={() => {
                  haptics.light();
                  setSelectedRoutine(routine);
                }}
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
