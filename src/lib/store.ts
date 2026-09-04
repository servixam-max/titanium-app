import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Routine,
  TrainingMode,
  EquipmentPreference,
  WorkoutSession,
  ActiveWorkoutState,
  AudioMode,
} from "@/lib/types";
import { apiUrl, isApiEnabled } from "@/lib/api-config";
import { saveSession, getSessions, clearAllSessions } from "@/lib/db";
import { logger } from "@/lib/logger";
import { syncToServer, syncFromServer } from "@/lib/ota-sync";
import { UserAccount, getActiveUser, getActiveUserId, logoutUser } from "./auth";

interface AppState {
  // Authentication & Profile
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  loadUserData: (user: UserAccount | null) => Promise<void>;
  logout: () => void;

  // Navigation
  currentRoute: string;
  setCurrentRoute: (route: string) => void;

  // Active Workout
  activeWorkout: ActiveWorkoutState;
  startWorkout: (
    routine: Routine,
    mode: TrainingMode,
    startExerciseIndex?: number,
  ) => void;
  completeSet: (
    exerciseIndex: number,
    setNumber: number,
    weight?: number,
    reps?: number,
    duration?: number,
  ) => void;
  previousExercise: () => void;
  goToExercise: (index: number) => void;
  resetCurrentSet: () => void;
  adjustRest: (deltaSeconds: number) => void;
  setExerciseWeight: (exerciseId: string, weight: number) => void;
  setExerciseReps: (exerciseId: string, reps: number) => void;
  startRest: (seconds?: number) => void;
  skipRest: () => void;
  tickRest: () => void;
  startWork: (seconds?: number) => void;
  tickWork: () => void;
  skipWork: () => void;
  nextExercise: () => void;
  setWorkoutExerciseIndex: (index: number) => void;
  setWorkoutSet: (setNumber: number) => void;
  saveProgress: () => Promise<void>;
  finishWorkout: () => Promise<{
    sessionId: string;
    completedSession: WorkoutSession;
  } | void>;
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
  lastAudioMode: AudioMode;
  toggleAudio: () => void;
  setAudioMode: (mode: AudioMode) => void;
  voiceRate: number;
  setVoiceRate: (rate: number) => void;
  lastExerciseWeights: Record<string, number>;

  // Favorites / recents
  favoriteExerciseIds: string[];
  recentExerciseIds: string[];
  addFavoriteExercise: (exerciseId: string) => void;
  removeFavoriteExercise: (exerciseId: string) => void;
  markExerciseRecent: (exerciseId: string) => void;

  // Onboarding
  onboardingComplete: boolean;
  completeOnboarding: () => void;
}

const initialActiveWorkout: ActiveWorkoutState = {
  routine: null,
  mode: "individual",
  currentExerciseIndex: 0,
  currentSet: 1,
  equipmentPref: "dumbbells",
  isResting: false,
  restTimeRemaining: 0,
  isWorking: false,
  workTimeRemaining: 0,
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
      // Authentication & Profile
      currentUser: null,

      setCurrentUser: (user) => {
        set({ currentUser: user });
        if (user) {
          get().loadUserData(user);
        } else {
          set({ sessions: [], activeWorkout: initialActiveWorkout });
        }
      },

      loadUserData: async (user) => {
        if (!user) {
          set({ sessions: [], currentUser: null });
          return;
        }
        set({ isLoading: true });
        try {
          const userSessions = await getSessions(user.id);
          set({ sessions: userSessions, currentUser: user });
        } catch (err) {
          logger.error("Error loading user data:", err);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        logoutUser();
        set({
          currentUser: null,
          sessions: [],
          activeWorkout: initialActiveWorkout,
        });
      },

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
            exerciseWeights: {
              ...activeWorkout.exerciseWeights,
              [exerciseId]: weight,
            },
          },
          lastExerciseWeights: {
            ...get().lastExerciseWeights,
            [exerciseId]: weight,
          },
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
            isWorking: false,
            workTimeRemaining: 0,
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
      lastAudioMode: "full" as AudioMode,
      setAudioMode: (mode) => {
        set((state) => ({
          audioMode: mode,
          audioEnabled: mode !== "silent",
          lastAudioMode: mode !== "silent" ? mode : state.lastAudioMode,
        }));
      },
      voiceRate: 0.92,
      setVoiceRate: (rate) =>
        set({ voiceRate: Math.max(0.6, Math.min(1.4, rate)) }),
      toggleAudio: () => {
        set((state) => {
          const nextEnabled = !state.audioEnabled;
          const nextMode = nextEnabled ? state.lastAudioMode : "silent";
          return {
            audioEnabled: nextEnabled,
            audioMode: nextMode,
          };
        });
      },

      lastExerciseWeights: {},

      favoriteExerciseIds: [],
      recentExerciseIds: [],

      addFavoriteExercise: (exerciseId) => {
        set((state) => ({
          favoriteExerciseIds: Array.from(
            new Set([...state.favoriteExerciseIds, exerciseId]),
          ),
        }));
      },

      removeFavoriteExercise: (exerciseId) => {
        set((state) => ({
          favoriteExerciseIds: state.favoriteExerciseIds.filter(
            (id) => id !== exerciseId,
          ),
        }));
      },

      markExerciseRecent: (exerciseId) => {
        set((state) => ({
          recentExerciseIds: Array.from(
            new Set([exerciseId, ...state.recentExerciseIds]),
          ).slice(0, 10),
        }));
      },

      onboardingComplete: false,
      completeOnboarding: () => set({ onboardingComplete: true }),

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
        const setWeight =
          weight ?? activeWorkout.exerciseWeights[currentExercise.id];
        const setReps = reps ?? activeWorkout.exerciseReps[currentExercise.id];

        // If this set was already recorded, update it instead of rejecting
        const existingSetIndex = exerciseLog.sets.findIndex(
          (s) => s.setNumber === setNumber,
        );

        if (existingSetIndex >= 0) {
          exerciseLog.sets[existingSetIndex] = {
            setNumber,
            weight: setWeight,
            reps: setReps,
            duration,
            completed: true,
            timestamp: new Date(),
          };
        } else {
          exerciseLog.sets.push({
            setNumber,
            weight: setWeight,
            reps: setReps,
            duration,
            completed: true,
            timestamp: new Date(),
          });
        }

        // Mark exercise as recent when any set is completed
        get().markExerciseRecent(currentExercise.id);

        const isLastSet = setNumber >= currentExercise.sets;
        const isLastExercise =
          exerciseIndex >= (activeWorkout.routine?.exercises.length || 1) - 1;
        const isWorkoutFinishing = isLastSet && isLastExercise;
        const nextRestSeconds = currentExercise.restSeconds || 75;

        const nextActiveWorkout: ActiveWorkoutState = {
          ...activeWorkout,
          session: {
            ...activeWorkout.session,
            exercises: updatedExercises,
          },
          isWorking: false,
          workTimeRemaining: 0,
          isResting: !isWorkoutFinishing, // NEVER rest if finishing workout
          restTimeRemaining: isWorkoutFinishing ? 0 : nextRestSeconds,
        };

        if (isLastSet) {
          if (!isLastExercise) {
            const nextIndex = exerciseIndex + 1;
            nextActiveWorkout.currentExerciseIndex = nextIndex;
            nextActiveWorkout.currentSet = 1;
          }
        } else {
          nextActiveWorkout.currentSet = setNumber + 1;
        }

        set({ activeWorkout: nextActiveWorkout });

        // Finish workout immediately after the very last set is logged
        if (isWorkoutFinishing) {
          get().finishWorkout();
        }
      },

      startRest: (seconds) => {
        const { activeWorkout } = get();
        const currentExercise =
          activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
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
        if (!activeWorkout.isResting) return;
        const newTime = Math.max(
          5,
          activeWorkout.restTimeRemaining + deltaSeconds,
        );
        if (newTime === activeWorkout.restTimeRemaining) return;
        set({
          activeWorkout: {
            ...activeWorkout,
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
            isWorking: false,
            workTimeRemaining: 0,
          },
        });
      },

      goToExercise: (index) => {
        const { activeWorkout } = get();
        if (!activeWorkout.routine) return;
        const clamped = Math.max(
          0,
          Math.min(activeWorkout.routine.exercises.length - 1, index),
        );
        set({
          activeWorkout: {
            ...activeWorkout,
            currentExerciseIndex: clamped,
            currentSet: 1,
            isResting: false,
            restTimeRemaining: 0,
            isWorking: false,
            workTimeRemaining: 0,
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
            isWorking: false,
            workTimeRemaining: 0,
          },
        });
      },

      tickRest: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.isResting || activeWorkout.restTimeRemaining <= 0)
          return;

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

      // Work-interval countdown (HIIT time-based sets). When it hits 0, the set
      // is auto-completed via completeSet(), which owns progression + rest start.
      startWork: (seconds) => {
        const { activeWorkout } = get();
        const currentExercise =
          activeWorkout.routine?.exercises[activeWorkout.currentExerciseIndex];
        if (!currentExercise) return;

        const workSeconds =
          seconds ??
          currentExercise.workSeconds ??
          (() => {
            const m = /(\d+)\s*s/i.exec(currentExercise.reps || "");
            return m ? Number(m[1]) : 0;
          })();
        if (!workSeconds || workSeconds <= 0) return;

        set({
          activeWorkout: {
            ...activeWorkout,
            isWorking: true,
            workTimeRemaining: workSeconds,
          },
        });
      },

      skipWork: () => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            isWorking: false,
            workTimeRemaining: 0,
          },
        });
      },

      tickWork: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.isWorking || activeWorkout.workTimeRemaining <= 0)
          return;

        const newTime = activeWorkout.workTimeRemaining - 1;

        if (newTime <= 0) {
          const currentExercise =
            activeWorkout.routine?.exercises[
              activeWorkout.currentExerciseIndex
            ];
          const totalWork =
            currentExercise?.workSeconds ??
            (() => {
              const m = /(\d+)\s*s/i.exec(currentExercise?.reps || "");
              return m ? Number(m[1]) : 0;
            })() ??
            activeWorkout.workTimeRemaining;
          set({
            activeWorkout: {
              ...activeWorkout,
              isWorking: false,
              workTimeRemaining: 0,
            },
          });
          if (get().audioEnabled) {
            import("./audio").then(({ announceWorkEnd }) => announceWorkEnd());
            import("./haptics").then(({ haptics }) => haptics.countdownEnd());
          }
          // Auto-complete the current set: logs it (with real elapsed duration), advances, and starts rest.
          get().completeSet(
            activeWorkout.currentExerciseIndex,
            activeWorkout.currentSet,
            undefined,
            undefined,
            totalWork,
          );
        } else {
          set({
            activeWorkout: {
              ...activeWorkout,
              workTimeRemaining: newTime,
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
              isWorking: false,
              workTimeRemaining: 0,
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
        if (!activeWorkout.session) {
          const latest = get().sessions.find((s) => s.completed);
          return latest ? { sessionId: latest.id, completedSession: latest } : undefined;
        }

        // If already completed and saved, return immediately
        if (activeWorkout.session.completed && activeWorkout.justFinished) {
          return { sessionId: activeWorkout.session.id, completedSession: activeWorkout.session };
        }

        const currentRoutine = activeWorkout.routine;

        const completedSession: WorkoutSession = {
          ...activeWorkout.session,
          endTime: activeWorkout.session.endTime || new Date(),
          completed: true,
        };

        // Save to IndexedDB first (offline-first) scoped to current user
        const currentUserId = get().currentUser?.id || getActiveUserId() || "xam-seed-id";
        await saveSession(completedSession, currentUserId);
        const localSessions = await getSessions(currentUserId);

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
            routine: currentRoutine, // KEEP ROUTINE SO COMPONENTS DON'T REDIRECT TO HOME PREMATURELY
            justFinished: true,
            session: completedSession,
          },
          lastExerciseWeights: updatedLastWeights,
        });

        // Best-effort sync to PostgreSQL (only if an API base URL is configured)
        if (!isApiEnabled()) {
          set({ dbError: null });
          return { sessionId: completedSession.id, completedSession };
        }

        try {
          const routine = activeWorkout.routine;
          if (!routine) return { sessionId: completedSession.id, completedSession };

          const totalSets = completedSession.exercises.reduce(
            (sum, ex) => sum + ex.sets.length,
            0,
          );
          const totalReps = completedSession.exercises.reduce(
            (sum, ex) =>
              sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
            0,
          );
          const totalVolume = completedSession.exercises.reduce(
            (sum, ex) =>
              sum +
              ex.sets.reduce(
                (s, set) => s + (set.weight || 0) * (set.reps || 0),
                0,
              ),
            0,
          );
          const durationSeconds = completedSession.endTime
            ? Math.round(
                (completedSession.endTime.getTime() -
                  completedSession.startTime.getTime()) /
                  1000,
              )
            : 0;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

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
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            logger.error("Failed to sync session to server");
            set({ dbError: "Sin sincronización con servidor" });
          } else {
            set({ dbError: null });
          }
        } catch (error) {
          logger.error("Error syncing session:", error);
          set({
            dbError: "Sin conexión con servidor (datos guardados localmente)",
          });
        }

        return { sessionId: completedSession.id, completedSession };
      },

      cancelWorkout: () => {
        set({ activeWorkout: initialActiveWorkout });
      },

      // Auto-save progress for individual mode (local + best-effort server if configured)
      saveProgress: async () => {
        const { activeWorkout } = get();
        if (!activeWorkout.session || !activeWorkout.routine) return;

        // Always persist current progress to IndexedDB first
        await saveSession({
          ...activeWorkout.session,
          endTime: new Date(),
          completed: false,
        });

        // Optional server sync only if API is configured
        if (!isApiEnabled()) {
          set({ dbError: null });
          return;
        }

        const session = activeWorkout.session;
        const routine = activeWorkout.routine;

        const totalSets = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.length,
          0,
        );
        const totalReps = session.exercises.reduce(
          (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
          0,
        );
        const totalVolume = session.exercises.reduce(
          (sum, ex) =>
            sum +
            ex.sets.reduce(
              (s, set) => s + (set.weight || 0) * (set.reps || 0),
              0,
            ),
          0,
        );
        const durationSeconds = Math.round(
          (new Date().getTime() - session.startTime.getTime()) / 1000,
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
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          let response;
          const dbSessionId = activeWorkout.dbSessionId;

          if (dbSessionId) {
            response = await fetch(apiUrl(`sessions/${dbSessionId}`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } else {
            response = await fetch(apiUrl("sessions"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          }
          clearTimeout(timeoutId);

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
            set({ dbError: "Progreso guardado localmente" });
          }
        } catch (error) {
          logger.error("Error saving progress:", error);
          set({ dbError: "Progreso guardado localmente" });
        }
      },

      // History
      sessions: [],
      isLoading: false,
      dbError: null,

      addSession: async (session) => {
        const userId = get().currentUser?.id;
        await saveSession(session, userId);
        const localSessions = await getSessions(userId);
        set({ sessions: localSessions });
      },

      loadSessions: async () => {
        set({ isLoading: true, dbError: null });
        try {
          const userId = get().currentUser?.id;
          const localSessions = await getSessions(userId);
          set({ sessions: localSessions });
        } catch (error) {
          logger.error("Error loading sessions:", error);
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
          logger.error("Error clearing sessions:", error);
          set({ dbError: "Error eliminando sesiones" });
        }
      },
    }),
    {
      name: "titanium-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Persist active workout data, but never transient timer/animation state
        const persistedActiveWorkout: ActiveWorkoutState = state.activeWorkout
          .routine
          ? {
              ...state.activeWorkout,
              isResting: false,
              restTimeRemaining: 0,
              isWorking: false,
              workTimeRemaining: 0,
              justFinished: false,
            }
          : initialActiveWorkout;
        return {
          sessions: state.sessions,
          audioEnabled: state.audioEnabled,
          audioMode: state.audioMode,
          voiceRate: state.voiceRate,
          equipmentPreference: state.equipmentPreference,
          activeWorkout: persistedActiveWorkout,
          lastExerciseWeights: state.lastExerciseWeights,
          favoriteExerciseIds: state.favoriteExerciseIds,
          recentExerciseIds: state.recentExerciseIds,
          onboardingComplete: state.onboardingComplete,
          lastAudioMode: state.lastAudioMode,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Ensure transient flags are never resumed from storage
        if (state.activeWorkout.routine) {
          state.activeWorkout.isResting = false;
          state.activeWorkout.restTimeRemaining = 0;
          state.activeWorkout.isWorking = false;
          state.activeWorkout.workTimeRemaining = 0;
          state.activeWorkout.justFinished = false;
        }
        // Hydrate active user and load user data
        const activeUser = getActiveUser();
        if (activeUser) {
          state.currentUser = activeUser;
          state.loadUserData(activeUser);
        } else {
          state.currentUser = null;
          state.sessions = [];
        }
      },
    },
  ),
);
