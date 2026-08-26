"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Flame,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  TrendingUp,
  Calendar,
  Trash2,
  Search,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { getSessions, deleteSession } from "@/lib/db";
import { routines } from "@/lib/data";
import { WorkoutSession } from "@/lib/types";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [filter, setFilter] = useState<"all" | "guided" | "individual">("all");
  const [search, setSearch] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const data = await getSessions();
    setSessions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  const parseReps = (repsStr: string | undefined): number => {
    if (!repsStr) return 0;
    const match = repsStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const filteredSessions = sessions
    .filter((s) => {
      if (filter === "all") return true;
      return s.mode === filter;
    })
    .filter((s) => {
      const routine = routines.find((r) => r.day === s.routineId);
      const routineLabel = routine?.title || `Día ${s.routineId}`;
      return (
        routineLabel.toLowerCase().includes(search.toLowerCase()) ||
        s.mode.toLowerCase().includes(search.toLowerCase())
      );
    });

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const completed = sessions.filter((s) => s.completed && s.endTime);
  const guidedCount = completed.filter((s) => s.mode === "guided").length;
  const individualCount = completed.filter(
    (s) => s.mode === "individual",
  ).length;
  const completedCount = completed.length;

  const totalVolume = sessions.reduce((total, session) => {
    return (
      total +
      session.exercises.reduce((exTotal, ex) => {
        const routine = routines.find((r) => r.day === session.routineId);
        const exerciseDef = routine?.exercises.find(
          (e) => e.id === ex.exerciseId,
        );
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

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    setDeleteConfirm(null);
    load();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-[120px] animate-page-in">
        <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />
        <main className="w-full px-container-padding pt-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-surface-container-high rounded-lg animate-pulse"
              />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[120px]">
      <TopAppBar title="FORTIXAM" showBack backHref="/" showSettings />

      <main className="w-full px-container-padding pt-4 flex flex-col gap-section-gap">
        <section className="mt-4">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
            Tu Progreso
          </h2>
          <p className="font-body-lg text-body-lg text-secondary mt-base">
            Mantén la disciplina. Sigue sumando.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-primary-container" />
            </div>
            <div>
              <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
                {completedCount}
              </span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">
                COMPLETADOS
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-primary-container" />
            </div>
            <div>
              <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
                {(totalVolume / 1000).toFixed(1)}T
              </span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">
                VOLUMEN TOTAL
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-container" />
            </div>
            <div>
              <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
                {guidedCount}
              </span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">
                GUIADOS
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary-container" />
            </div>
            <div>
              <span className="font-headline-lg text-headline-lg text-primary-container block leading-none">
                {individualCount}
              </span>
              <span className="font-label-caps text-[10px] text-on-surface-variant">
                INDIVIDUALES
              </span>
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            id="session-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar rutina..."
            className="w-full h-[44px] pl-10 pr-4 bg-surface-container-low border border-surface-container-highest rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary-container"
            aria-label="Buscar rutina en historial"
          />
        </div>

        <div className="flex p-1 bg-surface-container-low border border-surface-container-highest rounded-full">
          {(["all", "guided", "individual"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-full font-label-caps text-label-caps transition-all ${
                filter === f
                  ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                  : "bg-transparent text-on-surface-variant"
              }`}
            >
              {f === "all"
                ? "Todos"
                : f === "guided"
                  ? "Guiados"
                  : "Individuales"}
            </button>
          ))}
        </div>

        <section className="flex flex-col gap-stack-gap">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Registros
          </h3>

          {!mounted ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-surface-container-high rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-body-md text-body-md text-on-surface-variant">
                No hay entrenamientos{" "}
                {filter !== "all" || search ? "con estos filtros " : ""}
                registrados.
              </p>
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">
                ¡Empieza tu primer entrenamiento!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-base">
              {filteredSessions
                .slice()
                .reverse()
                .map((session) => {
                  const sessionVolume = session.exercises.reduce(
                    (total, ex) => {
                      const routine = routines.find(
                        (r) => r.day === session.routineId,
                      );
                      const exerciseDef = routine?.exercises.find(
                        (e) => e.id === ex.exerciseId,
                      );
                      const baseReps = parseReps(exerciseDef?.reps);
                      return (
                        total +
                        ex.sets.reduce((sum, set) => {
                          const reps = set.reps ?? baseReps;
                          return (
                            sum + (set.weight && reps ? set.weight * reps : 0)
                          );
                        }, 0)
                      );
                    },
                    0,
                  );

                  const isHIIT = session.exercises.some(
                    (ex) =>
                      ex.exerciseId.includes("d3") ||
                      ex.exerciseId.includes("d9"),
                  );
                  const completedExercises = session.exercises.filter(
                    (ex) => ex.sets.length > 0,
                  ).length;
                  const totalExercises = session.exercises.length;
                  const isExpanded = expandedSession === session.id;
                  const duration = session.endTime
                    ? Math.round(
                        (new Date(session.endTime).getTime() -
                          new Date(session.startTime).getTime()) /
                          1000,
                      )
                    : 0;
                  const routineTitle =
                    routines.find((r) => r.day === session.routineId)?.title ||
                    `Día ${session.routineId}`;

                  return (
                    <div
                      key={session.id}
                      className="bg-surface-container-low border border-surface-container-highest rounded-lg overflow-hidden group"
                    >
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            setExpandedSession(isExpanded ? null : session.id)
                          }
                          className="flex-1 p-stack-gap flex items-center gap-stack-gap text-left active:scale-[0.98] transition-transform"
                        >
                          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                            {isHIIT ? (
                              <Flame className="w-6 h-6 text-primary-container" />
                            ) : (
                              <CheckCircle className="w-6 h-6 text-primary-container" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-body-md text-body-md text-on-background font-bold truncate">
                                {routineTitle}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]">
                                {completedExercises}/{totalExercises}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="font-label-caps text-label-caps text-on-surface-variant capitalize">
                                {formatDate(session.startTime)}
                              </p>
                              {duration > 0 && (
                                <span className="flex items-center gap-1 font-label-caps text-[10px] text-on-surface-variant">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(duration)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                          )}
                        </button>
                        <div className="pr-3">
                          {deleteConfirm === session.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-error text-xs font-bold px-2 py-1 hover:opacity-80"
                              >
                                SÍ
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-on-surface-variant text-xs font-bold px-2 py-1 hover:opacity-80"
                              >
                                NO
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(session.id)}
                              className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-stack-gap pb-stack-gap border-t border-surface-container-highest">
                          {session.exercises
                            .filter((ex) => ex.sets.length > 0)
                            .map((ex) => {
                              const routine = routines.find(
                                (r) => r.day === session.routineId,
                              );
                              const exerciseDef = routine?.exercises.find(
                                (e) => e.id === ex.exerciseId,
                              );
                              const exerciseName =
                                exerciseDef?.name || ex.exerciseId;
                              const exerciseReps = exerciseDef?.reps || "";

                              return (
                                <div
                                  key={ex.exerciseId}
                                  className="py-3 border-b border-surface-container-highest last:border-b-0"
                                >
                                  <h5 className="font-body-md text-body-md font-bold text-primary-container mb-2">
                                    {exerciseName}{" "}
                                    <span className="text-on-surface-variant font-normal">
                                      ({exerciseReps})
                                    </span>
                                  </h5>
                                  <div className="grid grid-cols-3 gap-2">
                                    {ex.sets.map((set, setIdx) => (
                                      <div
                                        key={setIdx}
                                        className="bg-surface-container-high rounded-lg p-2 text-center"
                                      >
                                        <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">
                                          Serie {set.setNumber}
                                        </span>
                                        <span className="font-body-md text-body-md font-bold text-on-surface">
                                          {set.weight
                                            ? `${set.weight}kg`
                                            : "--"}
                                        </span>
                                        {" · "}
                                        <span className="font-body-md text-body-md font-bold text-primary-container">
                                          {set.reps ?? "--"}
                                        </span>
                                        <span className="text-[10px] text-on-surface-variant">
                                          {" "}
                                          reps
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          {session.exercises.every(
                            (ex) => ex.sets.length === 0,
                          ) && (
                            <p className="text-center py-4 font-body-md text-on-surface-variant">
                              No hay series registradas
                            </p>
                          )}
                          {sessionVolume > 0 && (
                            <div className="mt-3 pt-3 border-t border-surface-container-high">
                              <p className="font-label-caps text-label-caps text-primary-container text-right">
                                Volumen: {(sessionVolume / 1000).toFixed(2)}T
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
