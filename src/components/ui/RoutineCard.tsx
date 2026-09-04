"use client";

import { useState } from "react";
import { Clock, Layers, ChevronRight, ChevronDown, ChevronUp, Play, CheckCircle2, Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Routine } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { haptics } from "@/lib/haptics";

interface RoutineCardProps {
  routine: Routine;
  onClick?: () => void;
  onStartExercise?: (exerciseIndex: number) => void;
  index?: number;
  isCompletedToday?: boolean;
  defaultExpanded?: boolean;
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
  onStartExercise,
  index = 0,
  isCompletedToday = false,
  defaultExpanded = false,
}: RoutineCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const isPersonalized =
    routine.categoryTag === "personalizado" || routine.day === 13;
  const isHIIT = routine.type === "hiit";

  const dayNumber = routine.day < 10 ? `0${routine.day}` : routine.day;
  const dayBadge = isPersonalized ? "EXTRA" : isHIIT ? `DÍA ${dayNumber} · HIIT` : `DÍA ${dayNumber}`;
  const style = CATEGORY_STYLES[routine.categoryTag || "fuerza"] || CATEGORY_STYLES.fuerza;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.25),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group relative ${
        isCompletedToday
          ? "bg-[#0b1512]/95 border-emerald-500/50 shadow-[0_0_20px_rgba(0,245,155,0.15)]"
          : `bg-gradient-to-br from-[#121620] via-[#141b2a] to-[#111522] border-white/10 ${style.border}`
      } backdrop-blur-xl rounded-3xl border transition-all duration-300 shadow-xl overflow-hidden`}
    >
      {/* Subtle top ambient glow strip */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main Card Header / Overview */}
      <div
        onClick={onClick}
        className="p-4 flex items-center gap-3.5 cursor-pointer active:bg-white/[0.02] transition-colors"
      >
        {/* Cover Thumbnail - Increased to 68px */}
        {routine.coverImage && (
          <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden bg-black/40 border border-white/15 flex-shrink-0 relative group-hover:border-primary/50 transition-colors shadow-md">
            <ExerciseImage
              src={routine.coverImage}
              alt={routine.title}
              containerClassName="w-full h-full"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Center Info */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full bg-primary text-black shadow-neon">
              {dayBadge}
            </span>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${style.badge} uppercase font-bold tracking-wider`}
            >
              {routine.equipment || "MANCUERNAS"}
            </span>
            {isCompletedToday && (
              <span className="font-mono text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400 text-black shadow-[0_0_10px_rgba(52,211,153,0.5)] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                HECHO HOY
              </span>
            )}
          </div>

          <h3 className="font-mono text-base font-bold text-white tracking-tight truncate group-hover:text-primary transition-colors mt-0.5">
            {routine.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {routine.duration}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {routine.exercises.length} ej ({totalSets} series)
            </span>
          </div>
        </div>

        {/* Arrow to open full modal */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-2xl ${
              isCompletedToday
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                : "bg-white/5 border-white/10 group-hover:bg-primary group-hover:text-black text-zinc-300"
            } border flex items-center justify-center transition-all duration-300 shadow-sm`}
          >
            {isCompletedToday ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            )}
          </div>
        </div>
      </div>

      {/* Card Action Bar: Quick Start + Expand Exercises */}
      <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-2 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            haptics.selection();
            setIsExpanded(!isExpanded);
          }}
          className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 text-primary" />
              <span>Ocultar ({routine.exercises.length})</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-cyan-400" />
              <span>Ver ejercicios ({routine.exercises.length})</span>
            </>
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            haptics.impact();
            onClick?.();
          }}
          className="h-9 px-4 rounded-xl bg-primary text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-neon hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Comenzar</span>
        </button>
      </div>

      {/* Embedded Exercise Drawer (Without Opening Modals) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden bg-black/40 border-t border-white/10"
          >
            <div className="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Lista de Ejercicios del Día
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  Toca ▶ para entrenar uno suelto
                </span>
              </div>

              {routine.exercises.map((ex, idx) => (
                <div
                  key={ex.id || `${routine.day}-${idx}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#131926]/90 border border-white/5 hover:border-primary/30 transition-all group/item"
                >
                  {/* Photo */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/50 border border-white/10 flex-shrink-0 relative">
                    {ex.image ? (
                      <ExerciseImage
                        src={ex.image}
                        alt={ex.name}
                        containerClassName="w-full h-full"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Exercise info */}
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs font-bold text-white block truncate group-hover/item:text-primary transition-colors">
                      {idx + 1}. {ex.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-400">
                      <span className="text-zinc-300 font-bold">
                        {ex.sets} series × {ex.reps}
                      </span>
                      <span>•</span>
                      <span className="text-cyan-300">{ex.restSeconds}s desc</span>
                    </div>
                  </div>

                  {/* Individual 1-Tap Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptics.impact();
                      if (onStartExercise) {
                        onStartExercise(idx);
                      } else {
                        onClick?.();
                      }
                    }}
                    title="Entrenar este ejercicio en modo individual"
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-primary border border-primary/30 flex items-center justify-center transition-all active:scale-90 cursor-pointer flex-shrink-0 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
