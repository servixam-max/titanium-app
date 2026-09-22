"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Activity,
  Sparkles,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import AnatomicalMuscleViewer from "@/components/ui/AnatomicalMuscleViewer";
import {
  computeMuscleBreakdown,
  MuscleTimeframe,
  MUSCLE_METADATA,
} from "@/lib/muscle-engine";
import { calculateStreak } from "@/lib/metrics";
import AchievementsList from "@/components/ui/AchievementsList";
import { getSessions, LocalSession } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { routines } from "@/lib/data";
import { computeAchievements } from "@/lib/gamification";

function formatDuration(seconds: number) {
  if (!seconds) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function safeFormatDate(dateStr: string | Date, options?: Intl.DateTimeFormatOptions) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "?";
    return date.toLocaleDateString(
      "es-ES",
      options || { day: "numeric", month: "short" },
    );
  } catch {
    return "?";
  }
}

export default function StatsPage() {
  const { currentUser } = useAppStore();
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [muscleTimeframe, setMuscleTimeframe] = useState<MuscleTimeframe>("week");

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSessions(currentUser?.id);
      setSessions(data);
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const completed = useMemo(
    () => sessions.filter((s) => s.completed && s.endTime),
    [sessions]
  );
  const total = completed.length;

  const totalSets = useMemo(
    () => completed.reduce((sum, s) => sum + s.exercises.reduce((e, ex) => e + ex.sets.length, 0), 0),
    [completed]
  );

  const totalReps = useMemo(
    () =>
      completed.reduce(
        (sum, s) =>
          sum +
          s.exercises.reduce(
            (e, ex) => e + ex.sets.reduce((se, set) => se + (set.reps || 0), 0),
            0
          ),
        0
      ),
    [completed]
  );

  const totalVolume = useMemo(
    () =>
      completed.reduce(
        (sum, s) =>
          sum +
          s.exercises.reduce(
            (e, ex) =>
              e +
              ex.sets.reduce(
                (se, set) => se + (set.weight || 0) * (set.reps || 0),
                0
              ),
            0
          ),
        0
      ),
    [completed]
  );

  const totalDuration = useMemo(
    () =>
      completed.reduce((sum, s) => {
        const dur = (new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()) / 1000;
        return sum + Math.max(0, dur);
      }, 0),
    [completed]
  );

  const streak = useMemo(() => calculateStreak(sessions), [sessions]);

  const { thisWeek, thisMonth } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      thisWeek: completed.filter((s) => new Date(s.endTime!) >= startOfWeek).length,
      thisMonth: completed.filter((s) => new Date(s.endTime!) >= startOfMonth).length,
    };
  }, [completed]);

  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
  const avgReps = total > 0 ? Math.round(totalReps / total) : 0;
  const lastSession = completed[0]?.endTime;

  // Recent 6 sessions for chart
  const recentSessions = useMemo(() => {
    return [...completed]
      .reverse()
      .slice(-6)
      .map((s) => {
        const volume = s.exercises.reduce(
          (sum, ex) =>
            sum + ex.sets.reduce((setSum, set) => setSum + (set.weight || 0) * (set.reps || 0), 0),
          0
        );
        const routine = routines.find((r) => r.day === s.routineId);
        return {
          id: s.id,
          title: `Día ${s.routineId}`,
          name: routine?.title || `Día ${s.routineId}`,
          volumeKg: volume,
          date: s.endTime ? new Date(s.endTime).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "",
        };
      });
  }, [completed]);

  const maxVolumeChart = useMemo(() => {
    if (recentSessions.length === 0) return 1;
    return Math.max(...recentSessions.map((s) => s.volumeKg), 500);
  }, [recentSessions]);

  // Biomechanical Muscle Breakdown
  const {
    muscleStats,
    majorGroups,
    totalEffectiveVolume,
    mostTrainedMuscle,
    leastTrainedMuscle,
  } = useMemo(
    () => computeMuscleBreakdown(sessions, muscleTimeframe),
    [sessions, muscleTimeframe]
  );

  const achievements = useMemo(
    () => computeAchievements(sessions, streak),
    [sessions, streak]
  );

  return (
    <div className="min-h-screen pb-[120px] bg-background text-on-background">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-4 pt-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Header with User Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              ESTADÍSTICAS
            </h1>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              Rendimiento global, constancia y métricas de carga
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 fx-card rounded-full shadow-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentUser?.avatarColor || "#10B981" }}
            />
            <span className="text-[13px] font-bold text-slate-800 dark:text-white">
              {currentUser?.username || "Atleta"}
            </span>
          </div>
        </div>

        {/* Hero Racha Cyber Card */}
        <section className="fx-card rounded-3xl p-5 shadow-sm dark:shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-primary/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Flame className="w-8 h-8 text-primary fill-primary animate-pulse" />
              </div>
              <div>
                <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400 block">
                  Racha Actual
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold fx-num text-slate-900 dark:text-white">
                    {streak}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {streak === 1 ? "Día consecutivo" : "Días consecutivos"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30 px-2.5 py-1 rounded-full">
                {thisWeek} ESTA SEMANA
              </span>
            </div>
          </div>
        </section>

        {/* 4 Cyber Stat Cards */}
        <section className="grid grid-cols-2 gap-2.5">
          {isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
          {/* Card 1: Sesiones */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400">
                Sesiones
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {total}
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {thisWeek} esta semana
              </p>
            </div>
          </div>

          {/* Card 2: Volumen */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-primary/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-primary">
                Volumen Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {(totalVolume / 1000).toFixed(1)}
                <span className="text-xs font-normal text-primary ml-1">Ton</span>
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {totalSets} series totales
              </p>
            </div>
          </div>

          {/* Card 3: Tiempo Total */}
          <div className="fx-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400">
                Tiempo Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {formatDuration(totalDuration)}
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Media: {formatDuration(avgDuration)}
              </p>
            </div>
          </div>

          {/* Card 4: Repeticiones */}
          <div className="fx-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400">
                Repeticiones
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {totalReps}
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Media: {avgReps} reps/ses
              </p>
            </div>
          </div>
            </>
          )}
        </section>

        {/* Resumen Periódico */}
        <section className="fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Actividad Reciente
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <div className="flex justify-between items-center py-2.5 text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Esta semana</span>
              <span className="font-bold text-primary">{thisWeek} entrenamientos</span>
            </div>
            <div className="flex justify-between items-center py-2.5 text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Este mes</span>
              <span className="font-bold text-slate-900 dark:text-white">{thisMonth} entrenamientos</span>
            </div>
            <div className="flex justify-between items-center py-2.5 text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Última sesión registrada</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {lastSession ? safeFormatDate(lastSession, { day: "numeric", month: "short", year: "numeric" }) : "--"}
              </span>
            </div>
          </div>
        </section>

        {/* Volume per Session Bar Chart */}
        {recentSessions.length > 0 && (
          <section className="fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Carga por Sesión Reciente
              </h3>
              <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                Últimas {recentSessions.length} sesiones
              </span>
            </div>

            <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-2 px-1 border-b border-slate-200 dark:border-white/10">
              {recentSessions.map((session) => {
                const heightPercent = Math.max(12, Math.round((session.volumeKg / maxVolumeChart) * 100));
                return (
                  <div key={session.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(session.volumeKg / 1000).toFixed(1)}T
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-[#0d101a] rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        className="w-full bg-primary rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-sm"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400 truncate w-full text-center mt-1">
                      {session.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Mapa Muscular Anatómico 3D de Última Generación */}
        <section className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111524] dark:to-[#0D101A] rounded-3xl p-4 sm:p-5 shadow-sm dark:shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary/10 border-primary/30 flex items-center justify-center text-primary font-bold shadow-sm">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Escenario Anatómico 3D
                  <span className="px-1.5 py-0.2 bg-primary/10 text-primary border-primary/30 rounded text-[12px] font-bold">
                    v8.5.0
                  </span>
                </h3>
                <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                  Telemetría biomecánica, hipertrofia y simetría
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-black/40 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-slate-700 dark:text-zinc-300 font-bold">Holograma</span>
            </div>
          </div>

          <AnatomicalMuscleViewer
            muscleStats={muscleStats}
            timeframe={muscleTimeframe}
            onTimeframeChange={setMuscleTimeframe}
          />

          {/* Quick Insights Highlights */}
          {totalEffectiveVolume > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/5">
              {mostTrainedMuscle && (
                <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-2.5">
                  <span className="text-[12px] text-slate-500 dark:text-zinc-400 block mb-0.5">
                    Mayor Estímulo
                  </span>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1 truncate">
                    <Flame className="w-3 h-3 fill-primary flex-shrink-0" />
                    {MUSCLE_METADATA[mostTrainedMuscle].name}
                  </span>
                  <span className="text-[12px] text-slate-400 dark:text-zinc-500 block mt-0.5">
                    {Math.round(muscleStats[mostTrainedMuscle].volumeKg)} kg acumulados
                  </span>
                </div>
              )}
              {leastTrainedMuscle && (
                <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-2.5">
                  <span className="text-[12px] text-slate-500 dark:text-zinc-400 block mb-0.5">
                    Zona a Fortalecer
                  </span>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 truncate">
                    <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    {MUSCLE_METADATA[leastTrainedMuscle].name}
                  </span>
                  <span className="text-[12px] text-slate-400 dark:text-zinc-500 block mt-0.5">
                    {Math.round(muscleStats[leastTrainedMuscle].volumeKg)} kg acumulados
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Major Groups Volume Distribution */}
          {totalEffectiveVolume > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400">
                  Distribución de Carga por Grupo
                </span>
                <span className="text-[12px] text-primary font-semibold">
                  Total: {Math.round(totalEffectiveVolume)} kg
                </span>
              </div>
              {majorGroups.map((group) => (
                <div key={group.key} className="space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-700 dark:text-zinc-300 font-bold">{group.name}</span>
                    <span className="text-slate-500 dark:text-zinc-400">
                      {Math.round(group.volume)} kg{" "}
                      <span className="text-primary font-bold">({group.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0d101a] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${group.percentage}%`,
                        backgroundColor: group.color,
                        boxShadow: group.percentage > 0 ? `0 0 8px ${group.color}66` : undefined,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Medallas y Logros */}
        <section className="fx-card rounded-2xl p-4 shadow-sm dark:shadow-lg">
          <AchievementsList achievements={achievements} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
