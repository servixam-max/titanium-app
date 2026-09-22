import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { localStorageWithDates } from "./storage";
import {
  Routine,
  TrainingMode,
  EquipmentPreference,
  WorkoutSession,
  ActiveWorkoutState,
  AudioMode,
} from "@/lib/types";
import { saveSession, getSessions, clearAllSessions, generateId, nowIso, makeSyncable } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getActiveUser, getActiveUserId, logoutUser } from "./auth";
import { UserAccount } from "@/lib/types";
import { calculateAdaptiveRest } from "./workout";
import { AppTheme, applyTheme, getStoredTheme } from "./theme";

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
    rpe?: number,
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
  startPrep: (seconds?: number) => void;
  tickPrep: () => void;
  skipPrep: () => void;
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
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
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
  currentRound: 1,
  equipmentPref: "dumbbells",
  isResting: false,
  restTimeRemaining: 0,
  isPreparing: false,
  prepTimeRemaining: 0,
  isWorking: false,
  workTimeRemaining: 0,
  session: null,
  exerciseWeights: {},
  exerciseReps: {},
  dbSessionId: undefined,
  justFinished: false,
};

// Guard contra dobles llamadas a finishWorkout (tap del usuario y
// auto-finish del último set pueden coincidir): la segunda espera a la primera.
let finishPromise: Promise<
  { sessionId: string; completedSession: WorkoutSession } | undefined
> | null = null;

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
        const ownerUserId = getActiveUserId() || "xam-seed-id";
        const session: WorkoutSession = {
          ...makeSyncable(ownerUserId),
          routineId: routine.day,
          routineName: routine.title,
          mode,
          startTime: nowIso(),
          exercises: routine.exercises.map((ex, idx) => ({
            ...makeSyncable(ownerUserId),
            exerciseId: ex.id || generateId(),
            exerciseName: ex.name,
            order: idx,
            sets: [],
          })),
          completed: false,
        };

        // Pre-fill default reps from exercise definition
        const defaultReps: Record<string, number> = {};
        routine.exercises.forEach((ex) => {
          if (ex.reps) {
            const match = ex.reps.match(/(\d+)/);
            if (match) {
              defaultReps[ex.id] = parseInt(match[1], 10);
            }
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
            currentRound: 1,
            equipmentPref: get().equipmentPreference,
            isResting: false,
            restTimeRemaining: 0,
            isPreparing: false,
            prepTimeRemaining: 0,
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
      theme: "dark" as AppTheme,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
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

      completeSet: (exerciseIndex, setNumber, weight, reps, duration, rpe) => {
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

        const setOwnerUserId = getActiveUserId() || "xam-seed-id";
        if (existingSetIndex >= 0) {
          exerciseLog.sets[existingSetIndex] = {
            ...makeSyncable(setOwnerUserId),
            setNumber,
            weight: setWeight,
            reps: setReps,
            duration,
            rpe,
            completed: true,
            timestamp: nowIso(),
          };
        } else {
          exerciseLog.sets.push({
            ...makeSyncable(setOwnerUserId),
            setNumber,
            weight: setWeight,
            reps: setReps,
            duration,
            rpe,
            completed: true,
            timestamp: nowIso(),
          });
        }

        // Mark exercise as recent when any set is completed
        get().markExerciseRecent(currentExercise.id);

        const totalSets = currentExercise.sets ?? 3;
        const isLastSet = setNumber >= totalSets;
        const isLastExercise =
          exerciseIndex >= (activeWorkout.routine?.exercises.length || 1) - 1;
        const rounds = activeWorkout.routine?.rounds ?? 1;
        const currentRound = activeWorkout.currentRound ?? 1;
        const isLastRound = currentRound >= rounds;
        const isWorkoutFinishing = isLastSet && isLastExercise && isLastRound;
        // El descanso prescrito manda; solo se adapta por esfuerzo real (RPE)
        // y por series largas por tiempo.
        const lastSetDuration = duration || (currentExercise.workSeconds ? currentExercise.workSeconds : undefined);
        const nextRestSeconds = isWorkoutFinishing
          ? 0
          : calculateAdaptiveRest({
              baseRestSeconds: currentExercise.restSeconds || 75,
              lastSetRpe: rpe,
              lastSetDuration,
            });

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
          } else if (!isLastRound) {
            // HIIT circuit: advance to next round and restart from first exercise
            nextActiveWorkout.currentExerciseIndex = 0;
            nextActiveWorkout.currentSet = 1;
            nextActiveWorkout.currentRound = currentRound + 1;
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
            isPreparing: false,
            prepTimeRemaining: 0,
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
      startPrep: (seconds = 10) => {
        const { activeWorkout } = get();
        if (!activeWorkout.routine) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            isPreparing: true,
            prepTimeRemaining: seconds,
            isWorking: false,
            workTimeRemaining: 0,
          },
        });
      },

      tickPrep: () => {
        const { activeWorkout } = get();
        if (!activeWorkout.isPreparing || activeWorkout.prepTimeRemaining <= 0)
          return;

        const newTime = activeWorkout.prepTimeRemaining - 1;
        if (newTime <= 0) {
          set({
            activeWorkout: {
              ...activeWorkout,
              isPreparing: false,
              prepTimeRemaining: 0,
            },
          });
          // Auto-start the actual work interval when prep ends
          get().startWork();
        } else {
          set({
            activeWorkout: {
              ...activeWorkout,
              prepTimeRemaining: newTime,
            },
          });
        }
      },

      skipPrep: () => {
        const { activeWorkout } = get();
        set({
          activeWorkout: {
            ...activeWorkout,
            isPreparing: false,
            prepTimeRemaining: 0,
          },
        });
        get().startWork();
      },

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
            isPreparing: false,
            prepTimeRemaining: 0,
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
        const rounds = activeWorkout.routine.rounds ?? 1;
        const currentRound = activeWorkout.currentRound ?? 1;
        if (nextIndex >= activeWorkout.routine.exercises.length) {
          if (currentRound < rounds) {
            set({
              activeWorkout: {
                ...activeWorkout,
                currentExerciseIndex: 0,
                currentSet: 1,
                currentRound: currentRound + 1,
                isResting: false,
                restTimeRemaining: 0,
                isWorking: false,
                workTimeRemaining: 0,
              },
            });
          } else {
            get().finishWorkout();
          }
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
        if (finishPromise) return finishPromise;
        finishPromise = (async () => {
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
          endTime: activeWorkout.session.endTime || nowIso(),
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

        // El envío al servidor lo hace el motor de sync (cola en IndexedDB):
        // una sola vía, con el detalle del entrenamiento incluido.
        return { sessionId: completedSession.id, completedSession };
        })();
        try {
          return await finishPromise;
        } finally {
          finishPromise = null;
        }
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
          endTime: nowIso(),
          completed: false,
        });

        // El envío al servidor lo hace el motor de sync (cola en IndexedDB);
        // aquí solo se persiste en local para no perder progreso.
        set({ dbError: null });
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
      storage: createJSONStorage(() => localStorageWithDates),
      partialize: (state) => {
        // Persist active workout data, but never transient timer/animation state
        const persistedActiveWorkout: ActiveWorkoutState = state.activeWorkout
          .routine
          ? {
              ...state.activeWorkout,
              isResting: false,
              restTimeRemaining: 0,
              isPreparing: false,
              prepTimeRemaining: 0,
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
          theme: state.theme,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Apply theme immediately on rehydration
        const storedTheme = state.theme || getStoredTheme();
        applyTheme(storedTheme);
        // Ensure transient flags are never resumed from storage
        if (state.activeWorkout.routine) {
          state.activeWorkout.isResting = false;
          state.activeWorkout.restTimeRemaining = 0;
          state.activeWorkout.isPreparing = false;
          state.activeWorkout.prepTimeRemaining = 0;
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
