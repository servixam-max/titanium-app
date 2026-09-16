"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronRight } from "lucide-react";
import {
  DashboardHeader,
  ActiveWorkoutBanner,
  HeroWorkoutCard,
  WarmupLink,
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

const InstallPrompt = dynamic(() => import("@/components/ui/InstallPrompt"), { ssr: false });

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
    new Set(completed.map((s) => new Date(s.endTime!).toDateString()))
  ).map((d) => new Date(d));
  dates.sort((a, b) => b.getTime() - a.getTime());
  if (dates.length === 0) return 0;

  const today = new Date();
  let streak = 0;
  const check = new Date(today.getFullYear(), today.getMonth(), today.getDate());
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

function buildWeeklyStats(sessions: WorkoutSession[]) {
  const completed = sessions.filter((s) => s.completed && s.endTime);
  const totalWorkouts = completed.length;
  const totalMinutes = Math.round(
    completed.reduce((sum, s) => {
      const dur =
        s.endTime && s.startTime
          ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
          : 0;
      return sum + Math.max(0, dur);
    }, 0)
  );

  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weeklyDays = [false, false, false, false, false, false, false];
  let weeklyCount = 0;
  completed.forEach((s) => {
    const d = new Date(s.endTime!);
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      if (!weeklyDays[diffDays]) {
        weeklyDays[diffDays] = true;
        weeklyCount++;
      }
    }
  });

  const todayIndex = currentDay === 0 ? 6 : currentDay - 1;
  return { totalWorkouts, totalMinutes, weeklyDays, todayIndex, weeklyCount };
}

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

  const allDays = useMemo(() => routines.map((r) => r.day), []);
  const completeCatalog = useMemo(() => getCompleteExerciseCatalog(), []);

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);

    getSessions(currentUser?.id).then((sessions) => {
      const allSessions = sessions?.length > 0 ? sessions : storeSessions;
      setSessionsList(allSessions);
    });

    getActivePlan(currentUser?.id).then((plan) => {
      if (plan) setActivePlan(plan);
    });
    getPlans(currentUser?.id).then((plans) => {
      if (plans?.length) setSavedPlans(plans);
    });
  }, [audioMode, voiceRate, storeSessions, currentUser]);

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
    if (activePlan?.schedule?.length) {
      const completed = sessionsList.filter((s) => s.completed && s.routineId);
      const nextIdx = completed.length % activePlan.schedule.length;
      const targetDay = activePlan.schedule[nextIdx];
      const found = routines.find((r) => r.day === targetDay);
      if (found) return found;
    }

    const completed = sessionsList.filter((s) => s.completed && s.routineId);
    if (completed.length === 0) return routines[0];
    const lastRoutineId = Number(completed[0].routineId);
    if (isNaN(lastRoutineId) || lastRoutineId < 1 || lastRoutineId > 17) return routines[0];
    const nextDay = (lastRoutineId % 17) + 1;
    return routines.find((r) => r.day === nextDay) || routines[0];
  }, [sessionsList, activePlan]);

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

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return completeCatalog.filter((ex) => {
      if (q) {
        const matchName = ex.name.toLowerCase().includes(q);
        const matchDesc = ex.description?.toLowerCase().includes(q);
        const matchCat = ex.category?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      if (selectedMuscle !== "all") {
        if (selectedMuscle === "core") {
          if (ex.category !== "core") return false;
        } else if (selectedMuscle === "full_body") {
          if (ex.category !== "full_body" && ex.category !== "hiit") return false;
        } else {
          if (ex.category !== selectedMuscle) return false;
        }
      }
      if (selectedEquipment !== "all") {
        if (ex.equipment !== selectedEquipment && ex.equipment !== "both") return false;
      }
      return true;
    });
  }, [completeCatalog, searchQuery, selectedMuscle, selectedEquipment]);

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
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] h-[60%] w-[60%] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none fixed right-[-10%] bottom-[-10%] h-[60%] w-[60%] rounded-full bg-cyan-500/10 blur-[140px]" />

      <TopAppBar title="FORTIXAM" showSettings />

      <main className="relative z-10 flex flex-1 flex-col gap-4 px-4 py-3">
        <DashboardHeader
          user={currentUser}
          streak={streakCount}
          totalWorkouts={stats.totalWorkouts}
          totalMinutes={stats.totalMinutes}
          weeklyDays={stats.weeklyDays}
          todayIndex={stats.todayIndex}
          totalXP={totalXP}
        />

        <ActiveWorkoutBanner activeWorkout={activeWorkout} />

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
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Tu Misión de Hoy
                </span>
                <span className="text-[10px] font-mono font-bold text-primary flex items-center gap-1.5 bg-primary/10 border border-primary/30 px-2.5 py-0.5 rounded-full">
                  {selectedDay === 18 ? "Día 18 · Sesión Libre" : `Día ${selectedDay} de 18`}
                </span>
              </div>

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
            </div>

            {/* 2. Interactive Day Selector Hub */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Selector de Días (1 al 18)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Toca para enfocar la sesión
                </span>
              </div>
              <DayCarouselSelector
                days={allDays}
                selectedDay={selectedDay}
                onSelectDay={(day) => {
                  setSelectedDay(day);
                }}
                completedDayIds={completedTodayRoutineIds}
              />
            </div>

            {/* 3. Quick Prep & Custom Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmupLink exerciseCount={warmUpExercises.length} />

              <button
                onClick={() => {
                  haptics.selection();
                  setActiveTab("custom");
                }}
                className="group flex h-[52px] items-center gap-3 rounded-2xl border border-white/10 bg-[#121522] px-4 shadow-lg transition-all hover:border-primary/50 active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-black">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-white transition-colors group-hover:text-primary">
                    Constructor Personalizado
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-mono font-medium">
                  Series / HIIT
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-white" />
              </button>
            </div>

            {/* 4. Complete Routine Catalog Gallery (Directly visible, clean, filtered by objective) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Explorar Todas las Rutinas
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Filtra por objetivo y consulta las 18 sesiones del programa
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {filteredRoutines.length} rutinas
                </span>
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
          </div>
        )}

        {activeTab === "plans" && (
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

      <InstallPrompt />
      <BottomNav />
      <OnboardingModal />
    </div>
  );
}
