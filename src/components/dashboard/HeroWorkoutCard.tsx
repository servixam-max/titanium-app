"use client";

import { useState } from "react";
import { Clock, Layers, Dumbbell, Play, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Routine } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { haptics } from "@/lib/haptics";

interface HeroWorkoutCardProps {
  routine: Routine;
  isCompletedToday?: boolean;
  isRecommended?: boolean;
  onStartRoutine: () => void;
  onStartExercise?: (exerciseIndex: number) => void;
  onOpenDetails?: () => void;
}

export default function HeroWorkoutCard({
  routine,
  isCompletedToday = false,
  isRecommended = false,
  onStartRoutine,
  onStartExercise,
  onOpenDetails,
}: HeroWorkoutCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const dayNumber = routine.day < 10 ? `0${routine.day}` : routine.day;
  const isPersonalized = routine.categoryTag === "personalizado" || routine.day === 18;
  const isHIIT = routine.type === "hiit";

  const dayBadge = isPersonalized
    ? "SESIÓN LIBRE"
    : isHIIT
    ? `DÍA ${dayNumber} · HIIT`
    : `DÍA ${dayNumber}`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151928] via-[#111422] to-[#0C0E18] p-5 shadow-2xl transition-all duration-300">
      {/* Top Ambient Glow Strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" />

      {/* Header Tag Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon border border-white/20">
            {dayBadge}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
            {routine.categoryTag || "Fuerza"}
          </span>
          {isRecommended && (
            <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              HOY TE TOCA
            </span>
          )}
        </div>

        {isCompletedToday && (
          <span className="font-mono text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETADO HOY
          </span>
        )}
      </div>

      {/* Title & Muscle Focus */}
      <div className="mb-4">
        <h3
          onClick={onOpenDetails}
          className="text-2xl font-black text-white tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center justify-between group"
        >
          <span>{routine.title}</span>
          {routine.coverImage && (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black/40 border border-white/15 flex-shrink-0 relative shadow-md group-hover:border-primary/50 transition-colors ml-3">
              <ExerciseImage
                src={routine.coverImage}
                alt={routine.title}
                size="sm"
                priority={true}
                containerClassName="w-full h-full"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </h3>
        {routine.subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 line-clamp-2 leading-relaxed">
            {routine.subtitle}
          </p>
        )}
      </div>

      {/* High-Contrast Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-200 dark:border-white/10 my-3">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#131626] border border-slate-200/60 dark:border-white/5 rounded-2xl px-3 py-2">
          <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Tiempo</span>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white truncate">{routine.duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#131626] border border-slate-200/60 dark:border-white/5 rounded-2xl px-3 py-2">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-primary flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Volumen</span>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white truncate">{routine.exercises.length} ej · {totalSets} ser</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#131626] border border-slate-200/60 dark:border-white/5 rounded-2xl px-3 py-2">
          <Dumbbell className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Material</span>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white truncate">{routine.equipment || "Libre"}</span>
          </div>
        </div>
      </div>

      {/* Visual Exercise Thumbnails Row */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Ejercicios Incluidos ({routine.exercises.length})
          </span>
          <button
            onClick={() => {
              haptics.selection();
              setIsDrawerOpen(!isDrawerOpen);
            }}
            className="text-[11px] font-mono font-bold text-emerald-600 dark:text-primary hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isDrawerOpen ? (
              <>
                <span>Plegar lista</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Ver detalles</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Horizontal Mini-avatars strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
          {routine.exercises.map((ex, idx) => (
            <div
              key={ex.id || idx}
              onClick={() => {
                haptics.selection();
                if (onStartExercise) onStartExercise(idx);
              }}
              className="flex-shrink-0 flex flex-col items-center gap-1 group/thumb cursor-pointer"
              title={`${ex.name} (${ex.sets} series)`}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-black/60 border-2 border-slate-200 dark:border-white/10 group-hover/thumb:border-primary transition-all relative shadow-md">
                {ex.image ? (
                  <ExerciseImage
                    src={ex.image}
                    alt={ex.name}
                    size="sm"
                    priority={true}
                    containerClassName="w-full h-full"
                    className="object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono font-black text-center text-primary leading-tight py-0.5">
                  #{idx + 1}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 max-w-[58px] truncate group-hover/thumb:text-primary transition-colors text-center">
                {ex.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Exercise List Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/10 pt-3 pb-2 flex flex-col gap-2"
          >
            {routine.exercises.map((ex, idx) => (
              <div
                key={ex.id || idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#141828] border border-slate-200 dark:border-white/10 hover:border-primary/40 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-black/60 border border-white/15 flex-shrink-0">
                  {ex.image ? (
                    <ExerciseImage
                      src={ex.image}
                      alt={ex.name}
                      size="sm"
                      priority={true}
                      containerClassName="w-full h-full"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block truncate">
                    {idx + 1}. {ex.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    <span className="text-slate-900 dark:text-white font-bold">{ex.sets} series × {ex.reps}</span>
                    <span>•</span>
                    <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{ex.restSeconds}s desc</span>
                  </div>
                </div>

                {onStartExercise && (
                  <button
                    onClick={() => {
                      haptics.impact();
                      onStartExercise(idx);
                    }}
                    title="Entrenar sólo este ejercicio"
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-black text-emerald-700 dark:text-primary border border-slate-200 dark:border-primary/30 flex items-center justify-center transition-all active:scale-90 cursor-pointer flex-shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main High-Visibility CTA Button */}
      <div className="mt-2 flex items-center gap-2.5">
        <button
          onClick={() => {
            haptics.impact();
            onStartRoutine();
          }}
          className="flex-1 h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary via-[#85F754] to-[#00F59B] hover:brightness-110 text-black font-mono font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-neon-strong active:scale-95 transition-all cursor-pointer border border-white/40"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Comenzar Entrenamiento</span>
        </button>

        <button
          onClick={() => {
            haptics.selection();
            onOpenDetails?.();
          }}
          className="h-13 w-13 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer flex-shrink-0"
          title="Ver ficha completa"
        >
          <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </button>
      </div>
    </div>
  );
}
