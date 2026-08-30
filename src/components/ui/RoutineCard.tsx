"use client";

import { Clock, Layers, ChevronRight, Dumbbell, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Routine } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";

interface RoutineCardProps {
  routine: Routine;
  onClick?: () => void;
  index?: number;
}

const CATEGORY_STYLES: Record<string, { badge: string; border: string }> = {
  fuerza: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "hover:border-amber-500/40",
  },
  full_body: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    border: "hover:border-emerald-500/40",
  },
  hiit: {
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    border: "hover:border-rose-500/40",
  },
  movilidad: {
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    border: "hover:border-cyan-500/40",
  },
  personalizado: {
    badge: "bg-primary-container/20 text-primary-container border-primary-container/30",
    border: "hover:border-primary-container/40",
  },
};

export default function RoutineCard({
  routine,
  onClick,
  index = 0,
}: RoutineCardProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const isPersonalized =
    routine.categoryTag === "personalizado" || routine.day === 11;
  const isHIIT = routine.type === "hiit";

  const dayNumber = routine.day < 10 ? `0${routine.day}` : routine.day;
  const dayBadge = isPersonalized ? "EXTRA" : isHIIT ? `DÍA ${dayNumber} · HIIT` : `DÍA ${dayNumber}`;
  const style = CATEGORY_STYLES[routine.categoryTag || "fuerza"] || CATEGORY_STYLES.fuerza;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.012, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative bg-[#101014]/90 hover:bg-[#15151c] backdrop-blur-xl rounded-2xl border border-white/10 ${style.border} p-3.5 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(204,255,0,0.1)] overflow-hidden`}
    >
      {/* Subtle top ambient glow strip */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-container/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-center gap-3 relative z-10">
        {/* Cover Thumbnail */}
        {routine.coverImage && (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 relative group-hover:border-primary-container/40 transition-colors">
            <ExerciseImage
              src={routine.coverImage}
              alt={routine.title}
              containerClassName="w-full h-full"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Center Info */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-container text-black shadow-[0_0_8px_rgba(204,255,0,0.3)]">
              {dayBadge}
            </span>
            <span className={`text-[9px] font-label-caps px-2 py-0.5 rounded-full border ${style.badge} uppercase font-bold tracking-wider`}>
              {routine.equipment || "MANCUERNAS"}
            </span>
          </div>

          <h3 className="font-headline-sm text-sm sm:text-base text-white font-bold tracking-wide truncate group-hover:text-primary-container transition-colors">
            {routine.title}
          </h3>

          <div className="flex items-center gap-2.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-primary-container" />
              {routine.duration}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Layers className="w-3 h-3 text-primary-container" />
              {routine.exercises.length} ej ({totalSets}s)
            </span>
          </div>
        </div>

        {/* Right CTA Indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary-container/50 group-hover:bg-primary-container group-hover:text-black flex items-center justify-center text-zinc-300 transition-all duration-300 shadow-sm">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
