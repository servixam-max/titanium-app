"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronRight, ChevronDown } from "lucide-react";
import {
  DashboardHeader,
  ActiveWorkoutBanner,
  HeroWorkoutCard,
  WarmupLink,
  WarmupReminderBanner,
  CategoryFilter,
  ViewSwitcher,
  EmptyCatalogState,
  PlansView,
  type CategoryFilterValue,
  type ActiveTab,
} from "@/components/dashboard";
import DayCarouselSelector from "@/components/ui/DayCarouselSelector";
import RoutineCard from "@/components/ui/RoutineCard";
import RoutineDetailModal from "@/components/ui/RoutineDetailModal";
import ExerciseDetailModal from "@/components/ui/ExerciseDetailModal";
import ExerciseGridCard from "@/components/ui/ExerciseGridCard";
import TopAppBar from "@/components/ui/TopAppBar";
import TopAppBarSpacer from "@/components/ui/TopAppBarSpacer";
import BottomNav from "@/components/ui/BottomNav";
import ExerciseSearchBar, { MuscleCategory, EquipmentFilter } from "@/components/ui/ExerciseSearchBar";
import { CustomWorkoutBuilder } from "@/components/custom-workout";
import { routines, warmUpExercises, getCompleteExerciseCatalog } from "@/lib/data";
import { useAppStore } from "@/lib/store";
import { getSessions, getActivePlan, getPlans } from "@/lib/db";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { useSync } from "@/hooks/useSync";
import { setAudioMode, setVoiceRate } from "@/lib/audio";
import { preloadVoices } from "@/lib/speech";
import { haptics } from "@/lib/haptics";
import { Routine, WorkoutSession, Exercise, Plan } from "@/lib/types";
import { calculateTotalXP } from "@/lib/gamification";
import { computeWarmupReminder } from "@/lib/warmup-reminder";
import { calculateStreak, buildWeeklyStats, sameDay } from "@/lib/metrics";
import { filterCatalog } from "@/lib/catalog-filter";
import { sesionDeHoy, yaEntrenadoHoy } from "@/lib/weekly-plan";
import { PLANES_SEMANALES } from "@/lib/weekly-plans";
import WeeklyPlanPicker from "@/components/dashboard/WeeklyPlanPicker";

const WhatsNewModal = dynamic(() => import("@/components/ui/WhatsNewModal"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const { activeWorkout, audioMode, voiceRate, sessions: storeSessions, currentUser, startWorkout } = useAppStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("routines");
  const [audioWarmedUp, setAudioWarmedUp] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterValue>("all");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<Exercise | null>(null);
  const [sessionsList, setSessionsList] = useState<WorkoutSession[]>([]);
  useSync(60000);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleCategory>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentFilter>("all");
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);

  /**
   * Plan semanal activo (el que decide qué toca cada día de la semana).
   * Se guarda aparte de `activePlan` porque son modelos distintos: `activePlan`
   * es el plan de servidor con `schedule` por contador, y este es el semanal.
   */
  const [planSemanalId, setPlanSemanalId] = useState<string | null>(null);

  const planActivo = useMemo(
    () => (planSemanalId ? PLANES_SEMANALES.find((p) => p.id === planSemanalId) ?? null : null),
    [planSemanalId],
  );

  /** Qué toca hoy según el plan (o aviso de "elige un plan"). */
  const hoy = useMemo(() => sesionDeHoy(planActivo), [planActivo]);
  const [showAllRoutines, setShowAllRoutines] = useState(false);

  // El plan elegido se recuerda en el dispositivo: al reabrir la app debe seguir
  // diciendo lo mismo, no volver a preguntar.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("fortixam_plan_semanal");
      if (guardado) setPlanSemanalId(guardado);
    } catch {
      /* sin localStorage (SSR) no hay nada que recordar */
    }
  }, []);

  const elegirPlanSemanal = useCallback((id: string | null) => {
    setPlanSemanalId(id);
    try {
      if (id) localStorage.setItem("fortixam_plan_semanal", id);
      else localStorage.removeItem("fortixam_plan_semanal");
    } catch {
      /* modo privado: la elección dura la sesión, no es un error */
    }
  }, []);

  const allDays = useMemo(() => routines.map((r) => r.day), []);
  const completeCatalog = useMemo(() => getCompleteExerciseCatalog(), []);

  // Audio: solo depende de la configuración
  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Datos: se leen al cambiar de usuario, no cada vez que cambian las sesiones
  // (antes este efecto releía IndexedDB en cascada en cada cambio).
  useEffect(() => {
    let alive = true;
    Promise.all([
      getSessions(currentUser?.id),
      getActivePlan(currentUser?.id),
      getPlans(currentUser?.id),
    ])
      .then(([sessions, plan, plans]) => {
        if (!alive) return;
        setSessionsList(sessions?.length ? sessions : storeSessions);
        if (plan) setActivePlan(plan);
        if (plans?.length) setSavedPlans(plans);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // F2.4: aviso de calentamiento tras X días sin fuerza. Se calcula en cliente
  // (depende de "hoy") para no desincronizar el render del servidor.
  const [daysSinceStrength, setDaysSinceStrength] = useState<number | null>(null);
  const [warmupReminderDismissed, setWarmupReminderDismissed] = useState(false);

  useEffect(() => {
    const history = sessionsList.length > 0 ? sessionsList : storeSessions;
    setDaysSinceStrength(computeWarmupReminder({ sessions: history }).daysSinceLastStrength);
  }, [sessionsList, storeSessions]);

  const stats = useMemo(() => buildWeeklyStats(sessionsList), [sessionsList]);
  const streakCount = useMemo(() => calculateStreak(sessionsList), [sessionsList]);
  const totalXP = useMemo(() => calculateTotalXP(sessionsList), [sessionsList]);

  const completedTodayRoutineIds = useMemo(() => {
    const today = new Date();
    const set = new Set<number>();
    const list = sessionsList.length > 0 ? sessionsList : storeSessions;
    list
      .filter((s) => s.completed && s.endTime && sameDay(new Date(s.endTime), today))
      .forEach((s) => set.add(Number(s.routineId)));
    return set;
  }, [sessionsList, storeSessions]);

  const recommendedRoutine = useMemo(() => {
    // El plan semanal manda: si hay plan activo, la sesión de hoy sale del día
    // de la semana (lunes Día 1, martes Día 2…), no de un contador de entrenos.
    if (planActivo) {
      const hoy = sesionDeHoy(planActivo);
      if (hoy.dias.length > 0) {
        const found = routines.find((r) => r.day === hoy.dias[0]);
        if (found) return found;
      }
      // Día de descanso: no se propone sesión (la UI lo explica).
      return null;
    }

    const completed = sessionsList.filter((s) => s.completed && s.routineId);
    if (completed.length === 0) return routines[0];
    const lastRoutineId = Number(completed[0].routineId);
    if (isNaN(lastRoutineId) || lastRoutineId < 1 || lastRoutineId > 17) return routines[0];
    const nextDay = (lastRoutineId % 17) + 1;
    return routines.find((r) => r.day === nextDay) || routines[0];
  }, [sessionsList, planActivo]);

  const activeSelectedRoutine = useMemo(() => {
    return routines.find((r) => r.day === selectedDay) || recommendedRoutine || routines[0];
  }, [selectedDay, recommendedRoutine]);

  useEffect(() => {
    if (recommendedRoutine) setSelectedDay(recommendedRoutine.day);
  }, [recommendedRoutine]);

  const handleFirstInteraction = () => {
    if (!audioWarmedUp) {
      if (audioMode !== "silent") {
        import("@/lib/audio").then(({ playBeep }) => playBeep(300, 0.01, "sine", 0.01));
      }
      setAudioWarmedUp(true);
    }
  };

  const filteredRoutines = useMemo(() => {
    if (selectedCategory === "all") return routines;
    return routines.filter((r) => r.categoryTag === selectedCategory);
  }, [selectedCategory]);

  const filteredCatalog = useMemo(
    () =>
      filterCatalog({
        exercises: completeCatalog,
        query: searchQuery,
        muscle: selectedMuscle,
        equipment: selectedEquipment,
      }),
    [completeCatalog, searchQuery, selectedMuscle, selectedEquipment],
  );

  const handleStartSingleExercise = (exercise: Exercise) => {
    const singleRoutine: Routine = {
      day: 18,
      title: exercise.name,
      subtitle: exercise.description || "Ejercicio individual",
      type: "strength",
      duration: "10-15 min",
      difficulty: exercise.difficulty || "Intermedio",
      equipment: exercise.equipment === "bodyweight" ? "Peso corporal" : "Mancuernas",
      coverImage: exercise.image,
      categoryTag: "personalizado",
      exercises: [exercise],
    };
    startWorkout(singleRoutine, "individual", 0);
    router.push("/workout/individual");
  };

  const handleStartRoutineExercise = (routine: Routine, exerciseIndex: number) => {
    startWorkout(routine, "individual", exerciseIndex);
    router.push("/workout/individual");
  };

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-background pb-28 text-foreground select-none"
      onClick={handleFirstInteraction}
    >
      <div className="pointer-events-none fixed top-[-15%] left-[-15%] h-[55%] w-[55%] rounded-full bg-primary/[0.07] blur-[160px]" />

      <TopAppBar title="FORTIXAM" showSettings />

      <TopAppBarSpacer />

      {/* pt seguro: la TopAppBar es `fixed` (48 px) y el espaciador reserva su
          hueco, pero al abrir la app el WebView puede quedar con scroll previo.
          El padding superior garantiza que el saludo nunca quede debajo. */}
      <main className="relative z-10 flex flex-1 flex-col gap-7 px-5 pt-[56px] pb-28">
        <DashboardHeader
          user={currentUser}
          streak={streakCount}
          weeklyDays={stats.weeklyDays}
          todayIndex={stats.todayIndex}
          totalXP={totalXP}
        />

        <ActiveWorkoutBanner activeWorkout={activeWorkout} />

        {/* F2.4: aviso discreto y descartable; no compite con un entreno en curso */}
        {!activeWorkout.routine && !warmupReminderDismissed && (
          <WarmupReminderBanner
            daysSince={daysSinceStrength}
            onDismiss={() => setWarmupReminderDismissed(true)}
          />
        )}

        <ViewSwitcher
          value={activeTab}
          onChange={setActiveTab}
          routinesCount={routines.length}
          plansCount={savedPlans.length > 0 ? savedPlans.length : 4}
          catalogCount={completeCatalog.length}
        />

        {activeTab === "routines" && (
          <div className="flex flex-col gap-5">
            {/* 1. Hero Workout Card: Today's mission / active day */}
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="fx-section-title">Hoy</h2>
                <span className="fx-label-sm">
                  {hoy.esDescanso ? hoy.etiqueta : `Día ${selectedDay} de 18`}
                </span>
              </div>

              {/* Qué toca hoy según el plan y por qué. Si es descanso, se dice
                  en claro en vez de proponer una sesión que no corresponde. */}
              {planActivo && (
                <p className="px-1 text-[12px] leading-relaxed text-[color:var(--text-tertiary)]">
                  {hoy.motivo}
                </p>
              )}

              {hoy.esDescanso && !recommendedRoutine ? (
                <div className="fx-card flex flex-col gap-3 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-lg">
                      {hoy.descansoOpcional ? "🌤️" : "😴"}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {hoy.etiqueta}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                    {hoy.descansoOpcional
                      ? "Puedes descansar o entrenar lo que te apetezca."
                      : "Hoy toca recuperar. Mañana vuelves con más fuerza."}
                  </p>
                  {hoy.descansoOpcional && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("elige-sesion");
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="h-11 w-full rounded-xl bg-primary text-[13px] font-bold text-black transition-all active:scale-95"
                    >
                      Entrenar igualmente
                    </button>
                  )}
                </div>
              ) : (
                <HeroWorkoutCard
                  key={`hero-workout-${activeSelectedRoutine.day}`}
                  routine={activeSelectedRoutine}
                  isCompletedToday={completedTodayRoutineIds.has(activeSelectedRoutine.day)}
                  isRecommended={selectedDay === recommendedRoutine?.day}
                  onStartRoutine={() => {
                    setSelectedRoutine(activeSelectedRoutine);
                  }}
                  onStartExercise={(exerciseIndex) =>
                    handleStartRoutineExercise(activeSelectedRoutine, exerciseIndex)
                  }
                  onOpenDetails={() => {
                    setSelectedRoutine(activeSelectedRoutine);
                  }}
                />
              )}
            </section>

            {/* 2. Interactive Day Selector Hub */}
            <section id="elige-sesion" className="flex flex-col gap-3">
              <h2 className="fx-section-title px-1">Elige sesión</h2>
              <DayCarouselSelector
                days={allDays}
                selectedDay={selectedDay}
                onSelectDay={(day) => {
                  setSelectedDay(day);
                }}
                completedDayIds={completedTodayRoutineIds}
              />
            </section>

            {/* 3. Accesos rápidos: dos filas sobrias, sin bordes */}
            <section className="flex flex-col gap-2">
              <WarmupLink exerciseCount={warmUpExercises.length} />

              <button
                onClick={() => {
                  haptics.selection();
                  setActiveTab("custom");
                }}
                className="fx-inset fx-press group flex min-h-[56px] items-center gap-3 px-4 text-left"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-black">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    Crear entrenamiento
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-[color:var(--text-tertiary)]" />
              </button>
            </section>

            {/* 4. Catálogo completo (plegado por defecto) */}
            <section className="flex flex-col gap-3">
              <button
                onClick={() => {
                  haptics.selection();
                  setShowAllRoutines((prev) => !prev);
                }}
                aria-expanded={showAllRoutines}
                className="fx-inset fx-press flex w-full min-h-[48px] items-center justify-center gap-2 px-4 text-[15px] font-semibold text-foreground"
              >
                <span>{showAllRoutines ? "Ocultar rutinas" : "Ver todas las rutinas"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllRoutines ? "rotate-180" : ""}`} />
              </button>

              {showAllRoutines && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="fx-section-title">Todas las rutinas</h2>
                    <span className="fx-label-sm">{filteredRoutines.length}</span>
                  </div>

                  {/* Category Filter Pills */}
                  <CategoryFilter value={selectedCategory} onChange={setSelectedCategory} />

                  {/* Grid of Filtered Routines */}
                  <div className="flex flex-col gap-3">
                    {filteredRoutines.map((routine, index) => (
                      <RoutineCard
                        key={routine.day}
                        routine={routine}
                        index={index}
                        defaultExpanded={false}
                        isCompletedToday={completedTodayRoutineIds.has(routine.day)}
                        onClick={() => {
                          haptics.light();
                          setSelectedRoutine(routine);
                        }}
                        onStartExercise={(exerciseIndex) =>
                          handleStartRoutineExercise(routine, exerciseIndex)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "plans" && (
          <div className="flex flex-col gap-6">
            <WeeklyPlanPicker planActivoId={planSemanalId} onElegir={elegirPlanSemanal} />
            <PlansView
              activePlan={activePlan}
              savedPlans={savedPlans}
              currentUserId={currentUser?.id}
              onPlanActivated={(p) => {
                setActivePlan(p);
                getPlans(currentUser?.id).then((list) => {
                  if (list?.length) setSavedPlans(list);
                });
              }}
              onSelectRoutine={(routine) => {
                setSelectedRoutine(routine);
              }}
            />
          </div>
        )}

        {activeTab === "custom" && (
          <CustomWorkoutBuilder
            catalog={completeCatalog}
            onStartCustomWorkout={(routine, mode) => {
              startWorkout(routine, mode, 0);
              router.push(mode === "guided" ? "/workout/guided" : "/workout/individual");
            }}
          />
        )}

        {activeTab === "catalog" && (
          <div className="flex flex-col gap-4">
            <ExerciseSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedMuscle={selectedMuscle}
              onSelectMuscle={setSelectedMuscle}
              selectedEquipment={selectedEquipment}
              onSelectEquipment={setSelectedEquipment}
              totalCount={filteredCatalog.length}
            />

            {filteredCatalog.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredCatalog.map((exercise, index) => (
                  <ExerciseGridCard
                    key={exercise.id || `${exercise.name}-${index}`}
                    exercise={exercise}
                    index={index}
                    onSelect={() => {
                      haptics.light();
                      setSelectedExerciseForModal(exercise);
                    }}
                    onQuickStart={() => handleStartSingleExercise(exercise)}
                  />
                ))}
              </div>
            ) : (
              <EmptyCatalogState
                onReset={() => {
                  setSearchQuery("");
                  setSelectedMuscle("all");
                  setSelectedEquipment("all");
                }}
              />
            )}
          </div>
        )}
      </main>

      <RoutineDetailModal
        routine={selectedRoutine}
        isOpen={Boolean(selectedRoutine)}
        isCompletedToday={selectedRoutine ? completedTodayRoutineIds.has(selectedRoutine.day) : false}
        onClose={() => setSelectedRoutine(null)}
      />

      <ExerciseDetailModal
        exercise={selectedExerciseForModal}
        isOpen={Boolean(selectedExerciseForModal)}
        onClose={() => setSelectedExerciseForModal(null)}
        onStartExercise={(exercise) => {
          setSelectedExerciseForModal(null);
          handleStartSingleExercise(exercise);
        }}
      />

      <WhatsNewModal />
      <BottomNav />
      <OnboardingModal />
    </div>
  );
}
