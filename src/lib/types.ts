export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: "dumbbells" | "bodyweight" | "both";
  image?: string;
  description?: string;
  tempo?: string;
  category?: string; // chest, back, shoulders, biceps, triceps, legs, core, full_body
  difficulty?: "Principiante" | "Intermedio" | "Avanzado";
  // Parsed target reps range for progression suggestions
  targetRepsMin?: number;
  targetRepsMax?: number;
}

export interface Routine {
  day: number;
  title: string;
  subtitle: string;
  type: "strength" | "hiit";
  duration: string;
  difficulty: "Intermedio" | "Avanzado" | "Cardio HIIT" | "Principiante";
  equipment: string;
  coverImage?: string;
  coverImageBodyweight?: string;
  exercises: Exercise[];
  alternativeExercises?: Exercise[];
}

export type TrainingMode = "guided" | "individual";

export interface WorkoutSession {
  id: string;
  routineId: number;
  mode: TrainingMode;
  startTime: Date;
  endTime?: Date;
  exercises: ExerciseLog[];
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface SetLog {
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
  completed: boolean;
  timestamp: Date;
}

export type EquipmentPreference = "dumbbells" | "bodyweight";

export interface ActiveWorkoutState {
  routine: Routine | null;
  mode: TrainingMode;
  currentExerciseIndex: number;
  currentSet: number;
  equipmentPref: EquipmentPreference;
  isResting: boolean;
  restTimeRemaining: number;
  session: WorkoutSession | null;
  // Per-exercise weight and reps overrides (keyed by exercise id)
  exerciseWeights: Record<string, number>;
  exerciseReps: Record<string, number>;
  dbSessionId?: string;
  // Completed flag used by celebration screen
  justFinished?: boolean;
}

// Stats types
export interface WorkoutStats {
  totalSessions: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  totalDuration: number; // seconds
  avgDuration: number;
  avgVolume: number;
  streak: number; // consecutive days
  lastSessionDate?: Date;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
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
  bmi?: number;
}

export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  created_at: string;
}