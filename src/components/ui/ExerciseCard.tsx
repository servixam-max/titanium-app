import {
  Timer,
  Dumbbell,
  Play,
  ChevronRight,
} from "lucide-react";
import { Exercise } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";

interface ExerciseCardProps {
  exercise: Exercise;
  index?: number;
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
  chest: "bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/25",
  back: "bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/25",
  shoulders: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/25",
  biceps: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/25",
  triceps: "bg-violet-100 dark:bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-500/25",
  legs: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/25",
  core: "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/25",
  full_body: "bg-emerald-100 dark:bg-primary/20 text-emerald-800 dark:text-primary border-emerald-300 dark:border-primary/30",
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
  isSelected = false,
  onClick,
  compact = false,
  mode = "guided",
}: ExerciseCardProps) {
  const muscleKey = exercise.category || "full_body";
  const muscleColors = MUSCLE_COLORS[muscleKey] || MUSCLE_COLORS.full_body;

  const isIndividual = mode === "individual";

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] rounded-2xl p-3.5 flex items-center gap-3 min-h-touch-target-min transition-all duration-200 overflow-hidden cursor-pointer active:scale-[0.98] shadow-sm dark:shadow-md ${
          isIndividual
            ? "border-slate-200 dark:border-white/10 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#181d2e]"
            : isSelected
              ? "border-primary shadow-sm dark:shadow-md bg-emerald-50/50 dark:bg-[#131626]"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#181d2e]"
        }`}
    >
      {/* Exercise Image/Icon */}
      <div
        className={`rounded-full bg-slate-100 dark:bg-black/40 flex-shrink-0 flex items-center justify-center overflow-hidden border-slate-200 dark:border-white/15 relative ${compact ? "w-14 h-14" : "w-16 h-16"}`}
      >
        {exercise.image ? (
          <ExerciseImage
            src={exercise.image}
            alt={exercise.name}
            priority={true}
            size="sm"
            containerClassName="w-full h-full rounded-full"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackIcon={
              <Dumbbell className="w-7 h-7 text-primary/60" />
            }
          />
        ) : (
          <Dumbbell className="w-7 h-7 text-primary/60" />
        )}
        {index !== undefined && !isIndividual && (
          <span className="absolute top-0.5 left-0.5 bg-primary text-white text-[12px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-20">
            #{index + 1}
          </span>
        )}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-900 dark:text-white font-bold tracking-tight truncate group-hover:text-primary transition-colors">
            {exercise.name}
          </span>
        </div>

        {/* Main meta: sets × reps */}
        <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
          {exercise.sets} Series · <strong className="text-slate-900 dark:text-white">{exercise.reps}</strong> Reps
        </span>

        {/* Secondary meta: muscle badge, rest, difficulty */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1"> <span className={`font-mono text-[12px] font-bold px-2 py-0.5 rounded-full ${muscleColors}`} > {MUSCLE_LABELS[muscleKey] || muscleKey} </span> {exercise.restSeconds > 0 && ( <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#181d2e] text-slate-700 dark:text-zinc-300 flex items-center gap-1">
              <Timer className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
              {formatRest(exercise.restSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Action CTA on Card */}
      {isIndividual ? (
        <div className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm group-hover:scale-105 transition-transform flex-shrink-0 border-primary/40">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Iniciar</span>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-primary group-hover:text-white group-hover:border-primary flex items-center justify-center text-slate-400 dark:text-zinc-400 transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
