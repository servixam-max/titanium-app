// =========================================================
// FORTIXAM v8 — Syncable domain types
// All timestamps are ISO strings for server/client serialization.
// =========================================================

export interface SyncableEntity {
  id: string;
  clientId: string;
  ownerUserId: string;
  createdAt: string;
  modifiedAt: string;
  version: number;
  deleted?: boolean;
  syncedAt?: string;
  syncError?: string;
}

// =========================================================
// Catalog
// =========================================================

export type EquipmentType = "dumbbells" | "bodyweight" | "both";
export type Difficulty = "Principiante" | "Intermedio" | "Avanzado" | "Cardio HIIT";
export type MuscleCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "core"
  | "full_body"
  | "hiit"
  | "mobility"
  | "arms";

export interface Exercise extends Partial<Omit<SyncableEntity, "id">> {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: EquipmentType;
  image?: string;
  description?: string;
  tempo?: string;
  category?: MuscleCategory;
  difficulty?: Difficulty;
  workSeconds?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  techniqueTips?: string[];
  alternatives?: string[]; // exercise ids
  tags?: string[];
}

export type ExerciseGroupType = "straight" | "superset" | "giant" | "circuit" | "dropset";

export interface ExerciseGroup {
  id: string;
  type: ExerciseGroupType;
  exerciseIds: string[];
  rounds?: number;
  restAfterGroup: number;
}

export interface Routine extends Partial<SyncableEntity> {
  day: number;
  title: string;
  subtitle: string;
  type: "strength" | "hiit";
  duration: string;
  difficulty: Difficulty;
  equipment: string;
  coverImage?: string;
  coverImageBodyweight?: string;
  categoryTag?: "fuerza" | "full_body" | "hiit" | "movilidad" | "personalizado";
  rounds?: number;
  exercises: Exercise[];
  alternativeExercises?: Exercise[];
  groups?: ExerciseGroup[];
  authorId?: string;
  isCommunity?: boolean;
  tags?: string[];
  planId?: string;
}

export interface Plan extends Partial<SyncableEntity> {
  name: string;
  description: string;
  goal?: TrainingGoal;
  level?: ExperienceLevel;
  daysPerWeek: number;
  weeks: number;
  schedule: number[]; // routine day numbers per week, in order (legacy plans)
  active?: boolean;
  recommended?: boolean;
  tags: string[];
}

export interface PlannedSession extends SyncableEntity {
  planId: string;
  dayIndex: number; // 1-based within the week
  weekIndex: number; // 1-based
  routineId?: string;
  routineDay?: number; // legacy fallback
  notes?: string;
  completed: boolean;
  scheduledDate?: string;
}

// =========================================================
// Workout logging
// =========================================================

export type TrainingMode = "guided" | "individual";
export type EquipmentPreference = "dumbbells" | "bodyweight";
export type AudioMode = "full" | "beeps" | "voice" | "silent";
export type TrainingGoal = "strength" | "hypertrophy" | "fat_loss" | "endurance" | "mobility";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface SetLog extends SyncableEntity {
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
  rpe?: number; // 1-10 rate of perceived exertion
  completed: boolean;
  timestamp: string;
  side?: "left" | "right" | "both";
}

export interface ExerciseLog extends SyncableEntity {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: SetLog[];
  targetSets?: number;
  targetReps?: string;
  restSeconds?: number;
  groupId?: string;
}

export interface WorkoutSession extends SyncableEntity {
  routineId: string | number; // legacy day number or new routine id
  routineName?: string;
  mode: TrainingMode;
  startTime: string;
  endTime?: string;
  exercises: ExerciseLog[];
  completed: boolean;
  durationSeconds?: number;
  totalSets?: number;
  totalReps?: number;
  totalVolume?: number;
  notes?: string;
}

export interface ActiveWorkoutState {
  routine: Routine | null;
  mode: TrainingMode;
  currentExerciseIndex: number;
  currentSet: number;
  currentRound?: number;
  equipmentPref: EquipmentPreference;
  isResting: boolean;
  restTimeRemaining: number;
  isPreparing: boolean;
  prepTimeRemaining: number;
  isWorking: boolean;
  workTimeRemaining: number;
  session: WorkoutSession | null;
  exerciseWeights: Record<string, number>;
  exerciseReps: Record<string, number>;
  dbSessionId?: string;
  justFinished?: boolean;
  // v8: editing support
  editedExercises?: ExerciseLog[];
}

// =========================================================
// User & Profile
// =========================================================

export interface UserAccount extends SyncableEntity {
  username: string;
  email: string;
  passwordHash?: string; // only local legacy; server never stores plain text
  avatarColor?: string;
  lastLogin?: string;
  authProvider?: "local" | "google" | "apple";
  serverUserId?: string;
}

export interface UserProfile extends SyncableEntity {
  userId: string;
  username: string;
  email: string;
  avatarColor?: string;
  goal?: TrainingGoal;
  level?: ExperienceLevel;
  daysPerWeek?: number;
  equipment?: EquipmentType[];
  birthDate?: string;
  heightCm?: number;
  weightGoal?: number;
  restrictions?: string[];
  onboardingComplete: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  audioMode: AudioMode;
  voiceRate: number;
  equipmentPreference: EquipmentPreference;
  theme: "dark" | "light" | "system";
  highContrast: boolean;
  language: string;
  restTimerAutoStart: boolean;
  restTimerAdaptive: boolean;
}

// =========================================================
// Body metrics
// =========================================================

export interface WeightEntry extends SyncableEntity {
  weight: number;
  date: string;
}

export interface WeightStats {
  current: number;
  previous: number;
  diff: number;
  average: number;
  min: number;
  max: number;
  trend: "up" | "down" | "stable";
  entries: number;
  history: WeightEntry[];
  bmi?: number;
}

// =========================================================
// Stats & Gamification
// =========================================================

export interface WorkoutStats {
  totalSessions: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  totalDuration: number; // seconds
  avgDuration: number;
  avgVolume: number;
  streak: number;
  lastSessionDate?: string;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  weeklyGoal?: number;
  weeklyDaysCompleted?: boolean[];
}

export interface Achievement extends SyncableEntity {
  key: string;
  title: string;
  description: string;
  unlockedAt?: string;
  progress: number;
  target: number;
  completed: boolean;
  icon?: string;
  color?: string;
}

export interface PersonalRecord extends SyncableEntity {
  exerciseId: string;
  exerciseName: string;
  metric: "1rm" | "weight" | "reps" | "volume";
  value: number;
  date: string;
  setId: string;
}

// =========================================================
// Sync
// =========================================================

export interface SyncState extends SyncableEntity {
  lastSyncAt?: string;
  lastServerVersion?: number;
  deviceId: string;
  status: "idle" | "syncing" | "error";
  error?: string;
}

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueItem extends SyncableEntity {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  attempts: number;
  lastError?: string;
}

export interface SyncPayload {
  clientId: string;
  lastSyncAt?: string;
  changes: Array<{
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    data: unknown;
  }>;
}

// =========================================================
// Legacy aliases (for gradual migration)
// =========================================================

export type SetLogV8 = SetLog;
export type ExerciseLogV8 = ExerciseLog;
export type LocalSession = WorkoutSession;
export type LocalWeightEntry = WeightEntry;
