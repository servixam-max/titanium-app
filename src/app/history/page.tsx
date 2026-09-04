"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Flame,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  TrendingUp,
  Calendar,
  Trash2,
  Search,
  Zap,
  Filter,
  Layers,
  ArrowRight,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { getSessions, deleteSession, deleteExerciseFromSession, LocalSession } from "@/lib/db";
import { routines } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";
import { TrainingMode } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [filterMode, setFilterMode] = useState<TrainingMode | "all">("all");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month">("all");
  const [search, setSearch] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [exerciseDeleteConfirm, setExerciseDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSessions(currentUser?.id);
      setSessions(data);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const parseReps = (repsStr: string | undefined): number => {
    if (!repsStr) return 0;
    const match = repsStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return sessions
      .filter((s) => {
        if (filterMode !== "all" && s.mode !== filterMode) return false;
        if (filterPeriod === "week" && new Date(s.startTime) < oneWeekAgo) return false;
        if (filterPeriod === "month" && new Date(s.startTime) < oneMonthAgo) return false;
        return true;
      })
      .filter((s) => {
        if (!search.trim()) return true;
        const routine = routines.find((r) => r.day === s.routineId);
        const routineLabel = routine?.title || `Día ${s.routineId}`;
        const query = search.toLowerCase();
        return (
          routineLabel.toLowerCase().includes(query) ||
          s.mode.toLowerCase().includes(query) ||
          (s.routineId?.toString() || "").includes(query)
        );
      });
  }, [sessions, filterMode, filterPeriod, search]);

  const completed = useMemo(() => {
    return sessions.filter((s) => s.completed);
  }, [sessions]);

  const totalVolume = useMemo(() => {
    return completed.reduce((total, session) => {
      return (
        total +
        session.exercises.reduce((exTotal, ex) => {
          const routine = routines.find((r) => r.day === session.routineId);
          const exerciseDef = routine?.exercises.find((e) => e.id === ex.exerciseId);
          const baseReps = parseReps(exerciseDef?.reps);
          return (
            exTotal +
            ex.sets.reduce((sum, set) => {
              const reps = set.reps ?? baseReps;
              return sum + (set.weight && reps ? set.weight * reps : 0);
            }, 0)
          );
        }, 0)
      );
    }, 0);
  }, [completed]);

  const totalDurationSeconds = useMemo(() => {
    return completed.reduce((sum, s) => {
      if (!s.endTime) return sum;
      const dur = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000;
      return sum + Math.max(0, dur);
    }, 0);
  }, [completed]);

  const totalSetsCount = useMemo(() => {
    return completed.reduce((sum, s) => {
      return sum + s.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0);
    }, 0);
  }, [completed]);

  const formatDurationHoursMins = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateVal: string | Date) => {
    const date = new Date(dateVal);
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteSession = async (sessionId: string) => {
    haptics.tick();
    await deleteSession(sessionId);
    useAppStore.setState({
      sessions: useAppStore.getState().sessions.filter((s) => s.id !== sessionId),
    });
    setDeleteConfirm(null);
    await load();
  };

  const handleDeleteExercise = async (sessionId: string, exerciseIndex: number) => {
    haptics.tick();
    await deleteExerciseFromSession(sessionId, exerciseIndex);
    setExerciseDeleteConfirm(null);
    await load();
  };

  return (
    <div className="min-h-screen pb-[120px] bg-background text-on-background">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-4 pt-4 flex flex-col gap-5 max-w-lg mx-auto">
        {/* Header Title with User Chip */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              HISTORIAL
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Registro completo de entrenamientos y marcas
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

        {/* Hero Cyber Metrics Grid */}
        <section className="grid grid-cols-2 gap-2.5">
          {/* Metric 1: Total Volume */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                Volumen Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {(totalVolume / 1000).toFixed(1)}
                <span className="text-xs font-normal text-cyan-400 ml-1">Ton</span>
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">Carga levantada</p>
            </div>
          </div>

          {/* Metric 2: Completed Sessions */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-primary/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                Entrenos
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {completed.length}
                <span className="text-xs font-normal text-primary ml-1">sesiones</span>
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">Completados</p>
            </div>
          </div>

          {/* Metric 3: Total Time */}
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
                {formatDurationHoursMins(totalDurationSeconds)}
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">Bajo la barra</p>
            </div>
          </div>

          {/* Metric 4: Total Sets */}
          <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Series Totales
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {totalSetsCount}
                <span className="text-xs font-normal text-zinc-400 ml-1">sets</span>
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5">Series registradas</p>
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por rutina o modo..."
              className="w-full h-10 bg-[#121620] border border-white/10 rounded-xl pl-10 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all font-sans"
            />
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {/* Period Filters */}
            <button
              onClick={() => setFilterPeriod("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                filterPeriod === "all"
                  ? "bg-primary text-black shadow-neon"
                  : "bg-[#141a24] text-zinc-400 border border-white/5"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterPeriod("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                filterPeriod === "week"
                  ? "bg-primary text-black shadow-neon"
                  : "bg-[#141a24] text-zinc-400 border border-white/5"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilterPeriod("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                filterPeriod === "month"
                  ? "bg-primary text-black shadow-neon"
                  : "bg-[#141a24] text-zinc-400 border border-white/5"
              }`}
            >
              Este Mes
            </button>

            <span className="w-[1px] h-4 bg-white/10 mx-1 flex-shrink-0" />

            {/* Mode Filters */}
            <button
              onClick={() => setFilterMode(filterMode === "guided" ? "all" : "guided")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterMode === "guided"
                  ? "bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                  : "bg-[#141a24] text-zinc-400 border border-white/5"
              }`}
            >
              <Zap className="w-3 h-3" />
              Guiados
            </button>
            <button
              onClick={() => setFilterMode(filterMode === "individual" ? "all" : "individual")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterMode === "individual"
                  ? "bg-emerald-400 text-black shadow-[0_0_12px_rgba(0,245,155,0.4)]"
                  : "bg-[#141a24] text-zinc-400 border border-white/5"
              }`}
            >
              <Dumbbell className="w-3 h-3" />
              Individuales
            </button>
          </div>
        </section>

        {/* Sessions List */}
        <section className="flex flex-col gap-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-[#121620] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-[#10141c] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center my-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 mb-3">
                <Dumbbell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">Sin entrenamientos aún</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                {sessions.length === 0
                  ? "Tu historial está completamente limpio para empezar a registrar tus récords."
                  : "No hay sesiones que coincidan con los filtros seleccionados."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 px-4 py-2 bg-primary text-black font-mono font-bold text-xs rounded-xl shadow-neon flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>Empezar a Entrenar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const routine = routines.find((r) => r.day === session.routineId);
              const routineTitle = routine ? `Día ${routine.day} • ${routine.title}` : `Día ${session.routineId}`;
              const isExpanded = expandedSession === session.id;
              const durationMins = session.endTime
                ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
                : 0;

              const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

              return (
                <div
                  key={session.id}
                  className="bg-[#121620] border border-white/10 rounded-2xl overflow-hidden transition-all shadow-md hover:border-white/20"
                >
                  {/* Card Header Summary */}
                  <div
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    className="p-4 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-start gap-3">
                      {/* Mode Badge Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          session.mode === "guided"
                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {session.mode === "guided" ? (
                          <Zap className="w-5 h-5" />
                        ) : (
                          <Dumbbell className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white font-mono leading-tight">
                            {routineTitle}
                          </h4>
                          {session.completed && (
                            <span className="w-2 h-2 rounded-full bg-primary" title="Completado" />
                          )}
                        </div>

                        <span className="text-[11px] text-zinc-400 block mt-1">
                          {formatDate(session.startTime)}
                        </span>

                        {/* Metric chips */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md text-zinc-300">
                            ⏱️ {durationMins > 0 ? `${durationMins} min` : "< 1 min"}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md text-zinc-300">
                            💪 {session.exercises.length} ejer.
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-md text-zinc-300">
                            ⚡ {totalSets} series
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-zinc-400 hover:text-white p-1"
                      aria-label="Ver detalles"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-[#0e121a]">
                      <div className="space-y-3 mb-4">
                        {session.exercises.map((ex, idx) => {
                          const exerciseDef = routine?.exercises.find((e) => e.id === ex.exerciseId);
                          const exerciseName = exerciseDef?.name || `Ejercicio ${idx + 1}`;
                          return (
                            <div
                              key={ex.exerciseId + idx}
                              className="bg-[#141a24] rounded-xl p-2.5 border border-white/5 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-xs font-bold text-white block">
                                  {exerciseName}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {ex.sets.length} {ex.sets.length === 1 ? "serie" : "series"}
                                  </span>
                                  {ex.sets.some((s) => s.weight) && (
                                    <span className="text-[10px] text-primary font-mono font-bold">
                                      {Math.max(...ex.sets.map((s) => s.weight || 0))} kg máx
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {ex.sets.map((set, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                                        set.completed
                                          ? "bg-primary/20 text-primary border border-primary/40"
                                          : "bg-white/5 text-zinc-400"
                                      }`}
                                    >
                                      {set.reps || 10}
                                    </span>
                                  ))}
                                </div>

                                {exerciseDeleteConfirm === `${session.id}_${idx}` ? (
                                  <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-lg px-1.5 py-0.5">
                                    <button
                                      onClick={() => setExerciseDeleteConfirm(null)}
                                      className="text-[10px] text-zinc-400 hover:text-white px-1"
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExercise(session.id, idx)}
                                      className="text-[10px] font-bold text-red-400 hover:text-red-300 px-1"
                                    >
                                      Borrar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setExerciseDeleteConfirm(`${session.id}_${idx}`)}
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                                    title="Eliminar este ejercicio de la sesión"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Delete Session Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          ID: {session.id.slice(0, 8)}
                        </span>
                        {deleteConfirm === session.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-[11px] font-bold"
                            >
                              Confirmar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(session.id)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar sesión</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
