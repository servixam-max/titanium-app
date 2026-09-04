"use client";

import { motion } from "framer-motion";
import { Play, Dumbbell } from "lucide-react";
import { Exercise } from "@/lib/types";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { haptics } from "@/lib/haptics";

interface ExerciseGridCardProps {
  exercise: Exercise;
  onSelect: () => void;
  onQuickStart: () => void;
  index?: number;
}

const MUSCLE_TRANSLATIONS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Abdomen",
  full_body: "Full Body",
};

export default function ExerciseGridCard({
  exercise,
  onSelect,
  onQuickStart,
  index = 0,
}: ExerciseGridCardProps) {
  const muscle = MUSCLE_TRANSLATIONS[exercise.category || ""] || exercise.category || "Fuerza";
  const isDumbbell = exercise.equipment === "dumbbells";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.25),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-gradient-to-br from-[#121723] via-[#141b2a] to-[#10141f] border border-white/10 hover:border-primary/40 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all duration-300"
    >
      {/* Top Image Box */}
      <div
        onClick={onSelect}
        className="relative w-full aspect-square bg-black/40 overflow-hidden cursor-pointer"
      >
        {exercise.image ? (
          <ExerciseImage
            src={exercise.image}
            alt={exercise.name}
            containerClassName="w-full h-full"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Dumbbell className="w-10 h-10" />
          </div>
        )}

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#10141f] via-transparent to-black/30 pointer-events-none" />

        {/* Badges on top of image */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono font-black text-primary uppercase tracking-wider">
            {muscle}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${
              isDumbbell
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            }`}
          >
            {isDumbbell ? "Mancuernas" : "Corporal"}
          </span>
        </div>

        {/* Sets / Reps pill hovering bottom of photo */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-zinc-300 font-bold pointer-events-none">
          <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10">
            {exercise.sets} series × {exercise.reps}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-cyan-300">
            {exercise.restSeconds}s desc
          </span>
        </div>
      </div>

      {/* Bottom Info & Action Button */}
      <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-[#121723]">
        <div onClick={onSelect} className="cursor-pointer">
          <h4 className="font-mono text-xs sm:text-sm font-bold text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {exercise.name}
          </h4>
          {exercise.description && (
            <p className="text-[10px] text-zinc-400 font-mono mt-1 line-clamp-2 leading-relaxed">
              {exercise.description}
            </p>
          )}
        </div>

        {/* 1-Tap Quick Start Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            haptics.impact();
            onQuickStart();
          }}
          className="w-full h-10 mt-1 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-neon hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Entrenar</span>
        </button>
      </div>
    </motion.div>
  );
}
