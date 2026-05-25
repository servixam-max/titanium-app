import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Routine, TrainingMode, EquipmentPreference, WorkoutSession, ActiveWorkoutState } from "@/lib/types";

interface AppState {
  // Navigation
  currentRoute: string;
  setCurrentRoute: (route: string) => void;

  // Active Workout
  activeWorkout: ActiveWorkoutState;
  startWorkout: (routine: Routine, mode: TrainingMode, startExerciseIndex?: number) => void;
  completeSet: (exerciseIndex: number, setNumber: number, weight?: number, reps?: number, duration?: number) => void;
  startRest: () => void;
  skipRest: () => void;
  tickRest: () => void;
  nextExercise: () => void;
  setWorkoutExerciseIndex: (index: number) => void;
  setWorkoutSet: (setNumber: number) => void;
  setWorkoutWeight: (weight: number | undefined) => void;
  saveProgress: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => void;

  // History
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  loadSessions: () => Promise<void>;
  clearSessions: () => Promise<void>;
  isLoading: boolean;
  dbError: string | null;

  // Global Preferences
  equipmentPreference: EquipmentPreference;
  setEquipmentPreference: (pref: EquipmentPreference) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
}

const initialActiveWorkout: ActiveWorkoutState = {
  routine: null,
  mode: "individual",
  currentExerciseIndex: 0,
  currentSet: 1,
  equipmentPref: "dumbbells",
  isResting: false,
  restTimeRemaining: 0,
  session: null,
  workoutWeight: undefined,
  dbSessionId: undefined,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentRoute: "/",
      setCurrentRoute: (route) => set({ currentRoute: route }),

      // Active Workout
      activeWorkout: initialActiveWorkout,
      
      setWorkoutWeight: (weight) => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            workoutWeight: weight,
          },
        });
      },
      
      startWorkout: (routine, mode, startExerciseIndex = 0) => {
        // Safari mobile needs HTTPS for crypto.randomUUID, use fallback
        const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        
        const session: WorkoutSession = {
          id: sessionId,
          routineId: routine.day,
          mode,
          startTime: new Date(),
          exercises: routine.exercises.map((ex) => ({
            exerciseId: ex.id,
            sets: [],
          })),
          completed: false,
        };

        set({
          activeWorkout: {
            routine,
            mode,
            currentExerciseIndex: startExerciseIndex,
            currentSet: 1,
            equipmentPref: get().equipmentPreference,
            isResting: false,
            restTimeRemaining: 0,
            session,
            workoutWeight: undefined,
          },
        });
      },

      // Global Preferences
      equipmentPreference: "dumbbells" as EquipmentPreference,
      setEquipmentPreference: (pref) => {
        set({ equipmentPreference: pref });
        const { activeWorkout } = get();
        if (activeWorkout.routine?.type === "hiit") {
          set({
            activeWorkout: { ...activeWorkout, equipmentPref: pref },
          });
        }
      },

      audioEnabled: true,
      toggleAudio: () => {
        set((state) => ({ audioEnabled: !state.audioEnabled }));
      },

      completeSet: (exerciseIndex, setNumber, weight, reps, duration) => {
        const { activeWorkout } = get();
        if (!activeWorkout.session) return;

        const updatedExercises = [...activeWorkout.session.exercises];
        const exerciseLog = updatedExercises[exerciseIndex];
        if (!exerciseLog) return;
        
        // Use global workoutWeight if no explicit weight provided
        const setWeight = weight ?? activeWorkout.workoutWeight;
        
        exerciseLog.sets.push({
          setNumber,
          weight: setWeight,
          reps: undefined, // Reps come from exercise definition, not user input
          duration,
          completed: true,
          timestamp: new Date(),
        });

        set({
          activeWorkout: {
            ...activeWorkout,
            session: {
              ...activeWorkout.session,
              exercises: updatedExercises,
            },
          },
        });

        if (activeWorkout.mode === "guided") {
          get().startRest();
        }
      },

      startRest: () => {
        const { activeWorkout } = get();
        const currentExercise = activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
        if (!currentExercise) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            isResting: true,
            restTimeRemaining: currentExercise.restSeconds,
          },
        });
      },

      skipRest: () => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            isResting: false,
            restTimeRemaining: 0,
          },
        });
      },

      tickRest: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.isResting || activeWorkout.restTimeRemaining <= 0) return;

        const newTime = activeWorkout.restTimeRemaining - 1;
        
        if (newTime <= 0) {
          const currentExercise = activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
          if (currentExercise && activeWorkout.currentSet >= currentExercise.sets) {
            get().nextExercise();
          } else {
            set({
              activeWorkout: {
                ...activeWorkout,
                isResting: false,
                restTimeRemaining: 0,
                currentSet: activeWorkout.currentSet + 1,
              },
            });
          }
        } else {
          set({
            activeWorkout: {
              ...activeWorkout,
              restTimeRemaining: newTime,
            },
          });
        }
      },

      nextExercise: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.routine) return;

        const nextIndex = activeWorkout.currentExerciseIndex + 1;
        if (nextIndex >= activeWorkout.routine.exercises.length) {
          get().finishWorkout();
        } else {
          set({
            activeWorkout: {
              ...activeWorkout,
              currentExerciseIndex: nextIndex,
              currentSet: 1,
              isResting: false,
              restTimeRemaining: 0,
            },
          });
        }
      },

      setWorkoutExerciseIndex: (index) => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            currentExerciseIndex: index,
            currentSet: 1,
          },
        });
      },

      setWorkoutSet: (setNumber) => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            currentSet: setNumber,
          },
        });
      },

      finishWorkout: async () => {
        const { activeWorkout, sessions } = get();
        if (!activeWorkout.session) return;

        const completedSession: WorkoutSession = {
          ...activeWorkout.session,
          endTime: new Date(),
          completed: true,
        };

        // Save to localStorage first
        set({
          sessions: [...sessions, completedSession],
          activeWorkout: initialActiveWorkout,
        });

        // Save to PostgreSQL
        try {
          const routine = activeWorkout.routine;
          if (!routine) return;

          const totalSets = completedSession.exercises.reduce(
            (sum, ex) => sum + ex.sets.length, 0
          );
          const totalReps = completedSession.exercises.reduce(
            (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0), 0
          );
          const totalVolume = completedSession.exercises.reduce(
            (sum, ex) => sum + ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0), 0
          );
          const durationSeconds = completedSession.endTime 
            ? Math.round((completedSession.endTime.getTime() - completedSession.startTime.getTime()) / 1000)
            : 0;

          const response = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              routine_id: completedSession.routineId,
              routine_name: routine.title,
              mode: completedSession.mode,
              start_time: completedSession.startTime.toISOString(),
              end_time: completedSession.endTime?.toISOString(),
              duration_seconds: durationSeconds,
              total_sets: totalSets,
              total_reps: totalReps,
              total_volume: totalVolume,
              completed: true,
              exercises: completedSession.exercises.map((ex, idx) => ({
                exercise_id: ex.exerciseId,
                exercise_name: routine.exercises[idx]?.name || ex.exerciseId,
                exercise_order: idx + 1,
                target_sets: routine.exercises[idx]?.sets || 0,
                target_reps: routine.exercises[idx]?.reps || "",
                rest_seconds: routine.exercises[idx]?.restSeconds || 60,
                sets: ex.sets.map((set) => ({
                  set_number: set.setNumber,
                  weight: set.weight,
                  reps: set.reps,
                  duration_seconds: set.duration,
                  completed: set.completed,
                })),
              })),
            }),
          });

          if (!response.ok) {
            console.error("Failed to save to database");
            set({ dbError: "Error guardando en base de datos" });
          } else {
            set({ dbError: null });
          }
        } catch (error) {
          console.error("Error saving session:", error);
          set({ dbError: "Error de conexión con base de datos" });
        }
      },

      cancelWorkout: () => {
        set({ activeWorkout: initialActiveWorkout });
      },

      // Auto-save progress for individual mode
      saveProgress: async () => {
        const { activeWorkout } = get();
        if (!activeWorkout.session || !activeWorkout.routine) return;

        const session = activeWorkout.session;
        const routine = activeWorkout.routine;
        
        const totalSets = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.length, 0
        );
        const totalReps = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0), 0
        );
        const totalVolume = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0), 0
        );
        const durationSeconds = Math.round(
          (new Date().getTime() - session.startTime.getTime()) / 1000
        );

        const payload = {
          routine_id: session.routineId,
          routine_name: routine.title,
          mode: session.mode,
          start_time: session.startTime.toISOString(),
          end_time: new Date().toISOString(),
          duration_seconds: durationSeconds,
          total_sets: totalSets,
          total_reps: totalReps,
          total_volume: totalVolume,
          completed: false, // Still in progress
          exercises: session.exercises.map((ex, idx) => ({
            exercise_id: ex.exerciseId,
            exercise_name: routine.exercises[idx]?.name || ex.exerciseId,
            exercise_order: idx + 1,
            target_sets: routine.exercises[idx]?.sets || 0,
            target_reps: routine.exercises[idx]?.reps || "",
            rest_seconds: routine.exercises[idx]?.restSeconds || 60,
            sets: ex.sets.map((set) => ({
              set_number: set.setNumber,
              weight: set.weight,
              reps: set.reps,
              duration_seconds: set.duration,
              completed: set.completed,
            })),
          })),
        };

        try {
          let response;
          const dbSessionId = activeWorkout.dbSessionId;

          if (dbSessionId) {
            // Update existing session
            response = await fetch(`/api/sessions/${dbSessionId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            // Create new partial session
            response = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }

          if (response.ok) {
            const data = await response.json();
            if (data.session_id && !dbSessionId) {
              // Save the DB session ID for future updates
              set({
                activeWorkout: {
                  ...activeWorkout,
                  dbSessionId: data.session_id,
                },
              });
            }
            set({ dbError: null });
          } else {
            set({ dbError: "Error guardando progreso" });
          }
        } catch (error) {
          console.error("Error saving progress:", error);
          set({ dbError: "Error de conexión" });
        }
      },

      // History
      sessions: [],
      isLoading: false,
      dbError: null,

      addSession: (session) => {
        set((state) => ({
          sessions: [...state.sessions, session],
        }));
      },

      loadSessions: async () => {
        set({ isLoading: true, dbError: null });
        try {
          const response = await fetch("/api/sessions");
          if (response.ok) {
            const data = await response.json();
            if (data.sessions) {
              // Transform DB sessions to app format
              const transformedSessions: WorkoutSession[] = data.sessions.map((s: Record<string, unknown>) => ({
                id: s.id as string,
                routineId: s.routine_id as number,
                mode: s.mode as TrainingMode,
                startTime: new Date(s.start_time as string),
                endTime: s.end_time ? new Date(s.end_time as string) : undefined,
                completed: s.completed as boolean,
                exercises: ((s.exercises as Record<string, unknown>[]) || []).map((ex) => ({
                  exerciseId: ex.exercise_id as string,
                  sets: ((ex.sets as Record<string, unknown>[]) || []).map((set) => ({
                    setNumber: set.set_number as number,
                    weight: set.weight ? Number(set.weight) : undefined,
                    reps: set.reps ? Number(set.reps) : undefined,
                    duration: set.duration_seconds as number,
                    completed: set.completed as boolean,
                    timestamp: new Date(s.start_time as string),
                  })),
                })),
              }));
              set({ sessions: transformedSessions, isLoading: false });
            }
          }
        } catch (error) {
          console.error("Error loading sessions:", error);
          set({ dbError: "Error cargando sesiones", isLoading: false });
        }
      },

      clearSessions: async () => {
        try {
          const response = await fetch("/api/sessions", { method: "DELETE" });
          if (response.ok) {
            set({ sessions: [], dbError: null });
          }
        } catch (error) {
          console.error("Error clearing sessions:", error);
          set({ dbError: "Error eliminando sesiones" });
        }
      },
    }),
    {
      name: "titanium-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        audioEnabled: state.audioEnabled,
        equipmentPreference: state.equipmentPreference,
        activeWorkout: state.activeWorkout,
      }),
    }
  )
);
