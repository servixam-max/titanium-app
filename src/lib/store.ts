import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Routine, TrainingMode, EquipmentPreference, WorkoutSession, ActiveWorkoutState, AudioMode } from "@/lib/types";
import { apiUrl } from "@/lib/api-config";
import { saveSession, getSessions, clearAllSessions } from "@/lib/db";

interface AppState {
  // Navigation
  currentRoute: string;
  setCurrentRoute: (route: string) => void;

  // Active Workout
  activeWorkout: ActiveWorkoutState;
  startWorkout: (routine: Routine, mode: TrainingMode, startExerciseIndex?: number) => void;
  completeSet: (exerciseIndex: number, setNumber: number, weight?: number, reps?: number, duration?: number) => void;
  previousExercise: () => void;
  goToExercise: (index: number) => void;
  resetCurrentSet: () => void;
  adjustRest: (deltaSeconds: number) => void;
  setExerciseWeight: (exerciseId: string, weight: number) => void;
  setExerciseReps: (exerciseId: string, reps: number) => void;
  startRest: (seconds?: number) => void;
  skipRest: () => void;
  tickRest: () => void;
  nextExercise: () => void;
  setWorkoutExerciseIndex: (index: number) => void;
  setWorkoutSet: (setNumber: number) => void;
  saveProgress: () => Promise<void>;
  finishWorkout: () => Promise<{ sessionId: string; completedSession: WorkoutSession } | void>;
  cancelWorkout: () => void;
  clearJustFinished: () => void;

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
  audioMode: AudioMode;
  toggleAudio: () => void;
  setAudioMode: (mode: AudioMode) => void;
  voiceRate: number;
  setVoiceRate: (rate: number) => void;
  lastExerciseWeights: Record<string, number>;
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
  exerciseWeights: {},
  exerciseReps: {},
  dbSessionId: undefined,
  justFinished: false,
};

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentRoute: "/",
      setCurrentRoute: (route) => set({ currentRoute: route }),

      // Active Workout
      activeWorkout: initialActiveWorkout,

      setExerciseWeight: (exerciseId, weight) => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            exerciseWeights: { ...activeWorkout.exerciseWeights, [exerciseId]: weight },
          },
          lastExerciseWeights: { ...get().lastExerciseWeights, [exerciseId]: weight },
        });
      },

      setExerciseReps: (exerciseId, reps) => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            exerciseReps: { ...activeWorkout.exerciseReps, [exerciseId]: reps },
          },
        });
      },

      startWorkout: (routine, mode, startExerciseIndex = 0) => {
        const session: WorkoutSession = {
          id: generateId(),
          routineId: routine.day,
          mode,
          startTime: new Date(),
          exercises: routine.exercises.map((ex) => ({
            exerciseId: ex.id,
            sets: [],
          })),
          completed: false,
        };

        // Pre-fill default reps from exercise definition
        const defaultReps: Record<string, number> = {};
        routine.exercises.forEach((ex) => {
          const match = ex.reps.match(/(\d+)/);
          if (match) {
            defaultReps[ex.id] = parseInt(match[1], 10);
          }
        });

        // Pre-fill remembered weights from previous workouts
        const rememberedWeights: Record<string, number> = {};
        const lastWeights = get().lastExerciseWeights;
        routine.exercises.forEach((ex) => {
          if (lastWeights[ex.id] !== undefined) {
            rememberedWeights[ex.id] = lastWeights[ex.id];
          }
        });

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
            exerciseWeights: rememberedWeights,
            exerciseReps: defaultReps,
            justFinished: false,
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
      audioMode: "full" as AudioMode,
      setAudioMode: (mode) => {
        set({ audioMode: mode });
        // Keep legacy flag in sync: silent disables audio, other modes enable it
        set({ audioEnabled: mode !== "silent" });
      },
      voiceRate: 1.05,
      setVoiceRate: (rate) => set({ voiceRate: Math.max(0.7, Math.min(1.5, rate)) }),
      toggleAudio: () => {
        set((state) => {
          const nextEnabled = !state.audioEnabled;
          return {
            audioEnabled: nextEnabled,
            audioMode: nextEnabled ? state.audioMode : "silent",
          };
        });
      },

      lastExerciseWeights: {},

      clearJustFinished: () => {
        set({ activeWorkout: { ...get().activeWorkout, justFinished: false } });
      },

      completeSet: (exerciseIndex, setNumber, weight, reps, duration) => {
        const { activeWorkout } = get();
        if (!activeWorkout.session) return;

        const currentExercise = activeWorkout.routine?.exercises[exerciseIndex];
        if (!currentExercise) return;

        const updatedExercises = [...activeWorkout.session.exercises];
        const exerciseLog = updatedExercises[exerciseIndex];
        if (!exerciseLog) return;

        // Use per-exercise weight/reps if not explicitly provided
        const setWeight = weight ?? activeWorkout.exerciseWeights[currentExercise.id];
        const setReps = reps ?? activeWorkout.exerciseReps[currentExercise.id];

        // Avoid duplicate set completions for the same set number
        if (exerciseLog.sets.some((s) => s.setNumber === setNumber)) {
          return;
        }

        exerciseLog.sets.push({
          setNumber,
          weight: setWeight,
          reps: setReps,
          duration,
          completed: true,
          timestamp: new Date(),
        });

        const isLastSet = setNumber >= currentExercise.sets;
        const isLastExercise = exerciseIndex >= (activeWorkout.routine?.exercises.length || 1) - 1;
        const nextRestSeconds = currentExercise.restSeconds || 60;

        const nextActiveWorkout: ActiveWorkoutState = {
          ...activeWorkout,
          session: {
            ...activeWorkout.session,
            exercises: updatedExercises,
          },
          isResting: true,
          restTimeRemaining: nextRestSeconds,
        };

        if (isLastSet) {
          if (!isLastExercise) {
            const nextIndex = exerciseIndex + 1;
            nextActiveWorkout.currentExerciseIndex = nextIndex;
            nextActiveWorkout.currentSet = 1;
          }
          // If it is the last exercise, the workout is finished right after saving the last set
        } else {
          nextActiveWorkout.currentSet = setNumber + 1;
        }

        set({ activeWorkout: nextActiveWorkout });

        // Finish workout immediately after the very last set is logged (no extra tap needed)
        if (isLastSet && isLastExercise) {
          get().finishWorkout();
        }
      },

      startRest: (seconds) => {
        const { activeWorkout } = get();
        const currentExercise = activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
        if (!currentExercise) return;

        const restSeconds = seconds ?? currentExercise.restSeconds;
        if (restSeconds <= 0) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            isResting: true,
            restTimeRemaining: restSeconds,
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

      adjustRest: (deltaSeconds) => {
        const { activeWorkout } = get();
        const currentExercise = activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
        if (!currentExercise) return;
        const newTime = Math.max(5, activeWorkout.restTimeRemaining + deltaSeconds);
        if (newTime === activeWorkout.restTimeRemaining) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            isResting: true,
            restTimeRemaining: newTime,
          },
        });
      },

      previousExercise: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.routine) return;
        const prevIndex = Math.max(0, activeWorkout.currentExerciseIndex - 1);
        set({
          activeWorkout: {
            ...activeWorkout,
            currentExerciseIndex: prevIndex,
            currentSet: 1,
            isResting: false,
            restTimeRemaining: 0,
          },
        });
      },

      goToExercise: (index) => {
        const { activeWorkout } = get();
        if (!activeWorkout.routine) return;
        const clamped = Math.max(0, Math.min(activeWorkout.routine.exercises.length - 1, index));
        set({
          activeWorkout: {
            ...activeWorkout,
            currentExerciseIndex: clamped,
            currentSet: 1,
            isResting: false,
            restTimeRemaining: 0,
          },
        });
      },

      resetCurrentSet: () => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            currentSet: 1,
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
          // Rest finished: just clear resting state. completeSet already advanced the set/exercise.
          set({
            activeWorkout: {
              ...activeWorkout,
              isResting: false,
              restTimeRemaining: 0,
            },
          });
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
        const { activeWorkout } = get();
        if (!activeWorkout.session) return;

        const completedSession: WorkoutSession = {
          ...activeWorkout.session,
          endTime: new Date(),
          completed: true,
        };

        // Save to IndexedDB first (offline-first)
        await saveSession(completedSession);
        const localSessions = await getSessions();

        // Update lastExerciseWeights from this session
        const updatedLastWeights = { ...get().lastExerciseWeights };
        completedSession.exercises.forEach((ex) => {
          ex.sets.forEach((set) => {
            if (set.weight) {
              updatedLastWeights[ex.exerciseId] = set.weight;
            }
          });
        });

        set({
          sessions: localSessions,
          activeWorkout: {
            ...initialActiveWorkout,
            justFinished: true,
            session: completedSession,
          },
          lastExerciseWeights: updatedLastWeights,
        });

        // Best-effort sync to PostgreSQL
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

          const response = await fetch(apiUrl("sessions"), {
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
            console.error("Failed to sync session to server");
            set({ dbError: "Sin sincronización con servidor" });
          } else {
            set({ dbError: null });
          }
        } catch (error) {
          console.error("Error syncing session:", error);
          set({ dbError: "Sin conexión con servidor (datos guardados localmente)" });
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
          completed: false,
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
            response = await fetch(apiUrl(`sessions/${dbSessionId}`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            response = await fetch(apiUrl("sessions"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }

          if (response.ok) {
            const data = await response.json();
            if (data.session_id && !dbSessionId) {
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

      addSession: async (session) => {
        await saveSession(session);
        const localSessions = await getSessions();
        set({ sessions: localSessions });
      },

      loadSessions: async () => {
        set({ isLoading: true, dbError: null });
        try {
          // Always load from IndexedDB first (offline-first)
          const localSessions = await getSessions();
          set({ sessions: localSessions });

          // Best-effort sync from server
          try {
            const response = await fetch(apiUrl("sessions"));
            if (response.ok) {
              const data = await response.json();
              if (data.sessions) {
                const serverSessions: WorkoutSession[] = data.sessions.map((s: Record<string, unknown>) => ({
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
                // Merge: prefer local sessions, add missing server ones
                const localIds = new Set(localSessions.map((s) => s.id));
                const merged = [
                  ...localSessions,
                  ...serverSessions.filter((s) => !localIds.has(s.id)),
                ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                set({ sessions: merged });
              }
            }
          } catch (serverErr) {
            console.warn("Server sync unavailable, using local data:", serverErr);
          }
        } catch (error) {
          console.error("Error loading sessions:", error);
          set({ dbError: "Error cargando sesiones", isLoading: false });
        } finally {
          set({ isLoading: false });
        }
      },

      clearSessions: async () => {
        try {
          await clearAllSessions();
          set({ sessions: [], dbError: null });
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
        audioMode: state.audioMode,
        voiceRate: state.voiceRate,
        equipmentPreference: state.equipmentPreference,
        activeWorkout: state.activeWorkout,
        lastExerciseWeights: state.lastExerciseWeights,
      }),
    }
  )
);
