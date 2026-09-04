"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flame,
  Dumbbell,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  Activity,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { getSessions, LocalSession } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { routines } from "@/lib/data";

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

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function calculateStreak(sessions: LocalSession[]) {
  if (sessions.length === 0) return 0;
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

export default function StatsPage() {
  const { currentUser } = useAppStore();
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [currentUser?.id]);

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

  // Weekly & Monthly calculations
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeek = useMemo(
    () => completed.filter((s) => new Date(s.endTime!) >= startOfWeek).length,
    [completed, startOfWeek]
  );

  const thisMonth = useMemo(
    () => completed.filter((s) => new Date(s.endTime!) >= startOfMonth).length,
    [completed, startOfMonth]
  );

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

  return (
    <div className="min-h-screen pb-[120px] bg-background text-on-background">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-4 pt-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Header with User Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              ESTADÍSTICAS
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Rendimiento global, constancia y métricas de carga
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141a24] border border-white/10 rounded-full">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentUser?.avatarColor || "#10B981" }}
            />
            <span className="text-[11px] font-mono font-bold text-white uppercase">
              {currentUser?.username || "Atleta"}
            </span>
          </div>
        </div>

        {/* Hero Racha Cyber Card */}
        <section className="bg-gradient-to-br from-[#121622] to-[#151b2a] border border-primary/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-cyan-400/20 border border-primary/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(0,245,155,0.3)]">
                <Flame className="w-8 h-8 text-primary fill-primary animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  Racha Actual
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-white">
                    {streak}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary uppercase">
                    {streak === 1 ? "Día consecutivo" : "Días consecutivos"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2.5 py-1 rounded-full">
                {thisWeek} ESTA SEMANA
              </span>
            </div>
          </div>
        </section>

        {/* 4 Cyber Stat Cards */}
        <section className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Sesiones */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                Sesiones
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {total}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                {thisWeek} esta semana
              </p>
            </div>
          </div>

          {/* Card 2: Volumen */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-primary/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                Volumen Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {(totalVolume / 1000).toFixed(1)}
                <span className="text-xs font-normal text-primary ml-1">Ton</span>
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                {totalSets} series totales
              </p>
            </div>
          </div>

          {/* Card 3: Tiempo Total */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Tiempo Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {formatDuration(totalDuration)}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                Media: {formatDuration(avgDuration)}
              </p>
            </div>
          </div>

          {/* Card 4: Repeticiones */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Repeticiones
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {totalReps}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                Media: {avgReps} reps/ses
              </p>
            </div>
          </div>
        </section>

        {/* Resumen Periódico */}
        <section className="bg-[#121620] border border-white/10 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Actividad Reciente
          </h3>
          <div className="divide-y divide-white/5">
            <div className="flex justify-between items-center py-2.5 text-xs font-mono">
              <span className="text-zinc-400">Esta semana</span>
              <span className="font-bold text-primary">{thisWeek} entrenamientos</span>
            </div>
            <div className="flex justify-between items-center py-2.5 text-xs font-mono">
              <span className="text-zinc-400">Este mes</span>
              <span className="font-bold text-white">{thisMonth} entrenamientos</span>
            </div>
            <div className="flex justify-between items-center py-2.5 text-xs font-mono">
              <span className="text-zinc-400">Última sesión registrada</span>
              <span className="font-bold text-cyan-400">
                {lastSession ? safeFormatDate(lastSession, { day: "numeric", month: "short", year: "numeric" }) : "--"}
              </span>
            </div>
          </div>
        </section>

        {/* Volume per Session Cyber Bar Chart */}
        {recentSessions.length > 0 && (
          <section className="bg-[#121620] border border-white/10 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Carga por Sesión Reciente
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">
                Últimas {recentSessions.length} sesiones
              </span>
            </div>

            <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-2 px-1 border-b border-white/10">
              {recentSessions.map((session) => {
                const heightPercent = Math.max(12, Math.round((session.volumeKg / maxVolumeChart) * 100));
                return (
                  <div key={session.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(session.volumeKg / 1000).toFixed(1)}T
                    </span>
                    <div className="w-full bg-[#161c28] rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-[0_0_8px_rgba(0,245,155,0.4)]"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 truncate w-full text-center mt-1">
                      {session.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
