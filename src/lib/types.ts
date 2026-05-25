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
}

export interface Routine {
  day: number;
  title: string;
  subtitle: string;
  type: "strength" | "hiit";
  duration: string;
  difficulty: "Intermedio" | "Avanzado" | "Cardio HIIT";
  equipment: string;
  coverImage?: string; // Portada default (mancuernas)
  coverImageBodyweight?: string; // Portada alternativa (sin material)
  exercises: Exercise[];
  alternativeExercises?: Exercise[]; // For HIIT day toggle
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
  duration?: number; // For timed exercises (HIIT)
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
  workoutWeight?: number; // Global weight for the entire workout session
  dbSessionId?: string; // PostgreSQL session ID for auto-save
}
