"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Clock, Dumbbell, Activity, Layers } from "lucide-react";
import { Exercise } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { haptics } from "@/lib/haptics";

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onStartExercise: (exercise: Exercise) => void;
}

const MUSCLE_NAMES: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Abdomen / Core",
  full_body: "Full Body / Cardio",
};

export default function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onStartExercise,
}: ExerciseDetailModalProps) {
  if (!exercise) return null;

  const muscle = MUSCLE_NAMES[exercise.category || ""] || exercise.category || "General";
  const isDumbbell = exercise.equipment === "dumbbells";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end sm:justify-center items-center overflow-hidden">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Card Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0F141F] border-t sm:border border-white/15 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Top Close Button */}
            <button
              onClick={() => {
                haptics.selection();
                onClose();
              }}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Image */}
            <div className="relative w-full aspect-[4/3] bg-black/50 overflow-hidden flex-shrink-0">
              {exercise.image ? (
                <ExerciseImage
                  src={exercise.image}
                  alt={exercise.name}
                  containerClassName="w-full h-full"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Dumbbell className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F141F] via-transparent to-black/40 pointer-events-none" />

              {/* Tags overlay */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-3 py-1 rounded-xl bg-primary text-black font-mono font-black text-xs uppercase tracking-wider shadow-neon">
                  {muscle}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider ${
                    isDumbbell
                      ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                      : "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {isDumbbell ? "Mancuernas" : "Peso Corporal"}
                </span>
              </div>
            </div>

            {/* Body Info */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <h3 className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {exercise.name}
                </h3>
                {exercise.difficulty && (
                  <span className="text-xs font-mono text-zinc-400 mt-1 block">
                    Nivel: <strong className="text-primary">{exercise.difficulty}</strong>
                  </span>
                )}
              </div>

              {/* Key Specs Pills */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Layers className="w-4 h-4 text-primary mb-1" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Series</span>
                  <span className="font-mono text-base font-black text-white">{exercise.sets}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Activity className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Reps</span>
                  <span className="font-mono text-sm font-black text-white truncate max-w-full">
                    {exercise.reps}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
                  <Clock className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Descanso</span>
                  <span className="font-mono text-base font-black text-cyan-300">
                    {exercise.restSeconds}s
                  </span>
                </div>
              </div>

              {/* Description */}
              {exercise.description && (
                <div className="p-3.5 rounded-2xl bg-[#131926] border border-white/10">
                  <span className="font-mono text-[10px] font-black uppercase text-zinc-400 block mb-1">
                    Técnica y Ejecución
                  </span>
                  <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                    {exercise.description}
                  </p>
                </div>
              )}

              {/* Tempo Tip */}
              {exercise.tempo && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs font-mono">
                  <span className="text-zinc-400">Tempo de ejecución:</span>
                  <span className="text-primary font-bold">{exercise.tempo}</span>
                </div>
              )}
            </div>

            {/* Bottom Sticky Action Button */}
            <div className="p-4 border-t border-white/10 bg-[#0F141F]">
              <button
                onClick={() => {
                  haptics.impact();
                  onStartExercise(exercise);
                }}
                className="w-full h-14 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon hover:bg-emerald-400 active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Entrenar este ejercicio ahora</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
