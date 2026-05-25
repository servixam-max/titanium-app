"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Flame, ChevronDown, ChevronUp } from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import BottomNav from "@/components/ui/BottomNav";
import { useAppStore } from "@/lib/store";
import { routines } from "@/lib/data";

type FilterMode = "all" | "guided" | "individual";

export default function HistoryPage() {
  const { sessions, loadSessions } = useAppStore();

  const [filter, setFilter] = useState<FilterMode>("all");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSessions(); // Load from PostgreSQL
  }, [loadSessions]);

  // Helper to extract numeric reps from string (e.g. "12" -> 12, "30s" -> 30, "10-12" -> 11)
  const parseReps = (repsStr: string | undefined): number => {
    if (!repsStr) return 0;
    const match = repsStr.match(/(\d+)/);
    if (!match) return 0;
    return parseInt(match[1], 10);
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    return s.mode === filter;
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

  const formatTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const guidedCount = sessions.filter(
    (s) => s.mode === "guided" && s.completed
  ).length;
  const individualCount = sessions.filter(
    (s) => s.mode === "individual" && s.completed
  ).length;

  return (
    <div className="min-h-screen pb-[100px]">
      <TopAppBar title="FORTIXAM" showSettings />

      <main className="w-full px-container-padding pt-[80px] flex flex-col gap-section-gap">
        {/* Header */}
        <section className="mt-4">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
            Tu Progreso
          </h2>
          <p className="font-body-lg text-body-lg text-secondary mt-base">
            Mantén la disciplina. Sigue sumando.
          </p>
        </section>

        {/* Simple Stats */}
        <section className="flex gap-stack-gap">
          <div className="flex-1 bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap text-center">
            <span className="font-headline-lg text-headline-lg text-primary-container block">
              {guidedCount}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Guiados
            </span>
          </div>
          <div className="flex-1 bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap text-center">
            <span className="font-headline-lg text-headline-lg text-primary-container block">
              {individualCount}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Individuales
            </span>
          </div>
          <div className="flex-1 bg-surface-container-low border border-surface-container-highest rounded-xl p-stack-gap text-center">
            <span className="font-headline-lg text-headline-lg text-primary-container block">
              {sessions.length}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              Total
            </span>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="flex p-1 bg-surface-container-low border border-surface-container-highest rounded-full">
          {(["all", "guided", "individual"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-full font-label-caps text-label-caps transition-all ${
                filter === f
                  ? "bg-primary-container text-on-primary-container font-bold shadow-neon"
                  : "bg-transparent text-on-surface-variant"
              }`}
            >
              {f === "all" ? "Todos" : f === "guided" ? "Guiados" : "Individuales"}
            </button>
          ))}
        </div>

        {/* Activity List */}
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
                {filter !== "all" ? "de este tipo " : ""}registrados.
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
                      const routine = routines.find((r) => r.day === session.routineId);
                      const exerciseDef = routine?.exercises.find((e) => e.id === ex.exerciseId);
                      const baseReps = parseReps(exerciseDef?.reps);
                      return (
                        total +
                        ex.sets.reduce((sum, set) => {
                          return sum + (set.weight ? set.weight * baseReps : 0);
                        }, 0)
                      );
                    },
                    0
                  );

                  const isHIIT = session.exercises.some((ex) =>
                    ex.exerciseId.includes("d3")
                  );

                  const completedExercises = session.exercises.filter(
                    (ex) => ex.sets.length > 0
                  ).length;
                  const totalExercises = session.exercises.length;
                  const isExpanded = expandedSession === session.id;

                  return (
                    <div
                      key={session.id}
                      className="bg-surface-container-low border border-surface-container-highest rounded-lg overflow-hidden"
                    >
                      {/* Summary Row */}
                      <button
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : session.id)
                        }
                        className="w-full p-stack-gap flex items-center gap-stack-gap text-left active:scale-[0.98] transition-transform"
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
                              Día {session.routineId}{" "}
                              {session.mode === "individual"
                                ? "• Individual"
                                : "• Guiado"}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]">
                              {completedExercises}/{totalExercises}
                            </span>
                          </div>
                          <p className="font-label-caps text-label-caps text-on-surface-variant">
                            {formatDate(session.startTime)} a las{" "}
                            {formatTime(session.startTime)}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                        )}
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-stack-gap pb-stack-gap border-t border-surface-container-highest">
                          {session.exercises
                            .filter((ex) => ex.sets.length > 0)
                            .map((ex) => {
                              const routine = routines.find(
                                (r) => r.day === session.routineId
                              );
                              const exerciseDef = routine?.exercises.find(
                                (e) => e.id === ex.exerciseId
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
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          {session.exercises.every(
                            (ex) => ex.sets.length === 0
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
