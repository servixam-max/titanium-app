import {
  GripVertical,
  Timer,
  Activity,
  Dumbbell,
  Play,
  ChevronRight,
} from "lucide-react";
import { Exercise } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";

interface ExerciseCardProps {
  exercise: Exercise;
  index?: number;
  selectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  mode?: "guided" | "individual";
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Piernas",
  core: "Core",
  full_body: "Full body",
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  back: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  shoulders: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  biceps: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  triceps: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  legs: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  core: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  full_body:
    "bg-primary-container/20 text-primary-container border-primary-container/30",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Principiante: "text-emerald-300",
  Intermedio: "text-amber-300",
  Avanzado: "text-rose-300",
};

const formatRest = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
};

export default function ExerciseCard({
  exercise,
  index,
  selectable = false,
  isSelected = false,
  onClick,
  compact = false,
  mode = "guided",
}: ExerciseCardProps) {
  const muscleKey = exercise.category || "full_body";
  const muscleColors = MUSCLE_COLORS[muscleKey] || MUSCLE_COLORS.full_body;
  const difficultyColor = exercise.difficulty
    ? DIFFICULTY_COLORS[exercise.difficulty] || "text-on-surface-variant"
    : "text-on-surface-variant";

  const isIndividual = mode === "individual";

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-surface-container-low border rounded-xl p-3.5
        flex items-center gap-3 min-h-touch-target-min
        transition-all duration-200 overflow-hidden cursor-pointer
        active:scale-[0.98]
        ${
          isIndividual
            ? "hover:border-primary-container hover:bg-surface-container-high border-surface-container-highest shadow-sm"
            : isSelected
              ? "border-primary-container shadow-[0_0_18px_rgba(204,255,0,0.15)] bg-surface-container-high"
              : "border-surface-container-highest hover:border-surface-variant hover:bg-surface-container-high"
        }
      `}
    >
      {/* Exercise Image/Icon */}
      <div
        className={`
        rounded-lg bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5 relative
        ${compact ? "w-14 h-14" : "w-16 h-16"}
      `}
      >
        {exercise.image ? (
          <ExerciseImage
            src={exercise.image}
            alt={exercise.name}
            containerClassName="w-full h-full"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackIcon={
              <Dumbbell className="w-7 h-7 text-primary-container/60" />
            }
          />
        ) : (
          <Dumbbell className="w-7 h-7 text-primary-container/60" />
        )}
        {index !== undefined && !isIndividual && (
          <span className="absolute top-1 left-1 bg-black/70 backdrop-blur-sm text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
            #{index + 1}
          </span>
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-body-md text-sm text-on-background font-bold truncate group-hover:text-primary-container transition-colors">
            {exercise.name}
          </span>
        </div>

        {/* Main meta: sets × reps */}
        <span className="font-label-caps text-xs text-on-surface-variant font-medium">
          {exercise.sets} Series · <strong className="text-white">{exercise.reps}</strong> Reps
        </span>

        {/* Secondary meta: muscle badge, rest, difficulty */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span
            className={`font-label-caps text-[9px] px-2 py-0.5 rounded-full border ${muscleColors}`}
          >
            {MUSCLE_LABELS[muscleKey] || muscleKey}
          </span>

          {exercise.restSeconds > 0 && (
            <span className="font-label-caps text-[9px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant border border-surface-container-highest flex items-center gap-1">
              <Timer className="w-2.5 h-2.5" />
              {formatRest(exercise.restSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Action CTA on Card */}
      {isIndividual ? (
        <div className="flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-2 rounded-lg font-bold text-xs shadow-neon group-hover:scale-105 transition-transform flex-shrink-0">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Iniciar</span>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-surface-container-highest group-hover:bg-primary-container/20 group-hover:text-primary-container flex items-center justify-center text-on-surface-variant transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
