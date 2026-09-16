"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { ActiveWorkoutState } from "@/lib/types";

interface ActiveWorkoutBannerProps {
  activeWorkout: ActiveWorkoutState;
}

export default function ActiveWorkoutBanner({ activeWorkout }: ActiveWorkoutBannerProps) {
  const router = useRouter();
  if (!activeWorkout.routine) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => router.push(`/workout/${activeWorkout.mode}`)}
      className="flex h-[62px] items-center gap-3 rounded-2xl border border-white/30 bg-gradient-to-r from-primary via-[#85F754] to-[#00F59B] px-4 text-black shadow-neon-strong active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-black/20 text-black">
        <Play className="h-5 w-5 fill-current text-black" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className="block truncate text-xs font-black uppercase tracking-wider text-black">
          Continuar entrenamiento en curso
        </span>
        <span className="block truncate text-[11px] font-bold text-black/80">
          {activeWorkout.routine.title} · Ejercicio {activeWorkout.currentExerciseIndex + 1}
        </span>
      </div>
      <ArrowRight className="h-5 w-5 flex-shrink-0 text-black" />
    </motion.button>
  );
}
