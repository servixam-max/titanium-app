"use client";

import { Clock, Layers, ChevronRight, Dumbbell, Zap } from "lucide-react";
import { Routine } from "@/lib/types";

interface RoutineCardProps {
  routine: Routine;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  fuerza: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  full_body: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  hiit: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  movilidad: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  personalizado: "bg-primary-container/20 text-primary-container border-primary-container/30",
};

export default function RoutineCard({
  routine,
  onClick,
}: RoutineCardProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const isPersonalized =
    routine.categoryTag === "personalizado" || routine.day === 11;
  const isHIIT = routine.type === "hiit";

  const dayNumber = routine.day < 10 ? `0${routine.day}` : routine.day;
  const dayBadge = isPersonalized ? "EXTRA" : isHIIT ? `DÍA ${dayNumber} · HIIT` : `DÍA ${dayNumber}`;
  const categoryClass = CATEGORY_COLORS[routine.categoryTag || "fuerza"] || CATEGORY_COLORS.fuerza;

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface-container-low/90 hover:bg-surface-container/90 backdrop-blur-md rounded-2xl border border-surface-container-highest hover:border-primary-container/60 p-4 transition-all duration-200 cursor-pointer shadow-md hover:shadow-[0_4px_24px_rgba(204,255,0,0.12)] active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary-container text-black shadow-sm">
              {dayBadge}
            </span>
            <span className={`text-[10px] font-label-caps px-2 py-0.5 rounded-full border ${categoryClass} uppercase font-bold`}>
              {routine.equipment || "MANCUERNAS"}
            </span>
          </div>

          <h3 className="font-headline-sm text-base sm:text-lg text-white font-bold tracking-wide truncate group-hover:text-primary-container transition-colors">
            {routine.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-0.5">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-primary-container" />
              {routine.duration}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Layers className="w-3.5 h-3.5 text-primary-container" />
              {routine.exercises.length} ejercicios ({totalSets} series)
            </span>
          </div>
        </div>

        {/* Right CTA Indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden sm:inline-block text-xs font-bold text-primary-container font-label-caps uppercase group-hover:translate-x-0.5 transition-transform">
            Ver
          </span>
          <div className="w-9 h-9 rounded-full bg-surface-container-highest group-hover:bg-primary-container group-hover:text-black flex items-center justify-center text-on-surface-variant transition-all shadow-sm">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
