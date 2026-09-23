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
  Trash2,
  Search,
  Zap,
  Layers,
  ArrowRight,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { SkeletonSessionCard } from "@/components/ui/Skeleton";
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
  }, [currentUser]);

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
            <h1 className="flex items-center gap-2 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
              <Flame className="w-5 h-5 text-primary" />
              HISTORIAL
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Registro completo de entrenamientos y marcas
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

        {/* Hero Cyber Metrics Grid */}
        <section className="grid grid-cols-2 gap-2.5">
          {/* Metric 1: Total Volume */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-cyan-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400">
                Volumen Total
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {(totalVolume / 1000).toFixed(1)}
                <span className="text-xs font-normal text-cyan-600 dark:text-cyan-400 ml-1">Ton</span>
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">Carga levantada</p>
            </div>
          </div>

          {/* Metric 2: Completed Sessions */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-slate-200 dark:border-primary/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-primary">
                Entrenos
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {completed.length}
                <span className="text-xs font-normal text-primary ml-1">sesiones</span>
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">Completados</p>
            </div>
          </div>

          {/* Metric 3: Total Time */}
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
                {formatDurationHoursMins(totalDurationSeconds)}
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">Bajo la barra</p>
            </div>
          </div>

          {/* Metric 4: Total Sets */}
          <div className="fx-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm dark:shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-500 dark:text-zinc-400">
                Series Totales
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-zinc-300">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-semibold fx-num text-slate-900 dark:text-white tracking-tight">
                {totalSetsCount}
                <span className="text-xs font-normal text-slate-500 dark:text-zinc-400 ml-1">sets</span>
              </span>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">Series registradas</p>
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por rutina o modo..."
              className="w-full h-10 fx-card rounded-xl pl-10 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-all font-sans shadow-sm"
            />
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {/* Period Filters */}
            <button
              onClick={() => setFilterPeriod("all")} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${ filterPeriod ==="all"
                  ? "bg-primary text-black shadow-sm border-primary/40"
                  : "bg-white dark:bg-[#141828] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterPeriod("week")} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${ filterPeriod ==="week"
                  ? "bg-primary text-black shadow-sm border-primary/40"
                  : "bg-white dark:bg-[#141828] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilterPeriod("month")} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${ filterPeriod ==="month"
                  ? "bg-primary text-black shadow-sm border-primary/40"
                  : "bg-white dark:bg-[#141828] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
              }`}
            >
              Este Mes
            </button>

            <span className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1 flex-shrink-0" />

            {/* Mode Filters */}
            <button
              onClick={() => setFilterMode(filterMode === "guided" ? "all" : "guided")} className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1 ${ filterMode ==="guided"
                  ? "bg-cyan-600 text-white shadow-sm border-cyan-500/40"
                  : "bg-white dark:bg-[#141828] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
              }`}
            >
              <Zap className="w-3 h-3" />
              Guiados
            </button>
            <button
              onClick={() => setFilterMode(filterMode === "individual" ? "all" : "individual")} className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1 ${ filterMode ==="individual"
                  ? "bg-primary text-black shadow-sm border-primary/40"
                  : "bg-white dark:bg-[#141828] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
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
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonSessionCard key={i} />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="fx-card rounded-2xl p-8 flex flex-col items-center text-center my-4 shadow-sm dark:shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-400 mb-3">
                <Dumbbell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sin entrenamientos aún</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs">
                {sessions.length === 0
                  ? "Tu historial está completamente limpio para empezar a registrar tus récords."
                  : "No hay sesiones que coincidan con los filtros seleccionados."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 px-4 py-2 bg-primary text-black font-bold text-xs rounded-xl shadow-sm border-primary/40 flex items-center gap-1.5 active:scale-95 transition-all"
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
                  className="fx-card rounded-2xl overflow-hidden transition-all shadow-sm dark:shadow-md"
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
                            ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                            : "bg-emerald-500/15 text-primary border-primary/30"
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
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {routineTitle}
                          </h4>
                          {session.completed && (
                            <span className="w-2 h-2 rounded-full bg-primary" title="Completado" />
                          )}
                        </div>

                        <span className="text-[13px] text-slate-500 dark:text-zinc-400 block mt-1">
                          {formatDate(session.startTime)}
                        </span>

                        {/* Metric chips */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[12px] font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-slate-700 dark:text-zinc-300">
                            ⏱️ {durationMins > 0 ? `${durationMins} min` : "< 1 min"}
                          </span>
                          <span className="text-[12px] font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-slate-700 dark:text-zinc-300">
                            💪 {session.exercises.length} ejer.
                          </span>
                          <span className="text-[12px] font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md text-slate-700 dark:text-zinc-300">
                            ⚡ {totalSets} series
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white p-1"
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
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0d101a]">
                      <div className="space-y-3 mb-4">
                        {session.exercises.map((ex, idx) => {
                          const exerciseDef = routine?.exercises.find((e) => e.id === ex.exerciseId);
                          const exerciseName = exerciseDef?.name || `Ejercicio ${idx + 1}`;
                          return (
                            <div
                              key={ex.exerciseId + idx}
                              className="bg-white dark:bg-[#141828] rounded-xl p-2.5 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                  {exerciseName}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                                    {ex.sets.length} {ex.sets.length === 1 ? "serie" : "series"}
                                  </span>
                                  {ex.sets.some((s) => s.weight) && (
                                    <span className="text-[12px] text-primary font-bold">
                                      {Math.max(...ex.sets.map((s) => s.weight || 0))} kg máx
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1"> {ex.sets.map((set, sIdx) => ( <span key={sIdx} className={`w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-mono font-bold ${ set.completed ?"bg-primary/20 text-primary border-primary/40"
                                          : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-400"
                                      }`}
                                    >
                                      {set.reps || 10}
                                    </span>
                                  ))}
                                </div>

                                {exerciseDeleteConfirm === `${session.id}_${idx}` ? (
                                  <div className="flex items-center gap-1 bg-red-500/20 border-red-500/40 rounded-lg px-1.5 py-0.5">
                                    <button
                                      onClick={() => setExerciseDeleteConfirm(null)}
                                      className="text-[12px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-1"
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExercise(session.id, idx)}
                                      className="text-[12px] font-bold text-red-500 dark:text-red-400 hover:text-red-600 px-1"
                                    >
                                      Borrar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setExerciseDeleteConfirm(`${session.id}_${idx}`)}
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5">
                        <span className="text-[13px] text-slate-400 dark:text-zinc-500">
                          ID: {session.id.slice(0, 8)}
                        </span>
                        {deleteConfirm === session.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2.5 py-1 text-[13px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-[13px] font-bold shadow-sm"
                            >
                              Confirmar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(session.id)}
                            className="flex items-center gap-1 text-[13px] text-slate-400 dark:text-zinc-400 hover:text-red-500 transition-colors"
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
