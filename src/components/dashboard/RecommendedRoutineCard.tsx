"use client";

import { motion } from "framer-motion";
import { Clock, Layers, ChevronRight, Zap } from "lucide-react";
import { Routine } from "@/lib/types";
import { haptics } from "@/lib/haptics";

interface RecommendedRoutineCardProps {
  routine: Routine;
  onOpen: () => void;
  onStart: () => void;
}

export default function RecommendedRoutineCard({
  routine,
  onOpen,
  onStart,
}: RecommendedRoutineCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[#121620] via-[#141b2a] to-[#111522] p-4 shadow-xl active:scale-[0.99] transition-transform"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Siguiente sesión recomendada
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-[11px] font-bold text-white">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          {routine.duration}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black text-white transition-colors group-hover:text-primary">
            Día {routine.day} · {routine.title}
          </h3>
          <div className="mt-1 flex items-center gap-2.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-white">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              {routine.exercises.length} ejercicios
            </span>
            <span>•</span>
            <span className="font-bold uppercase">
              {routine.equipment || "Mancuernas"}
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptics.selection();
              onOpen();
            }}
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Ver detalles"
          >
            <Zap className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptics.impact();
              onStart();
            }}
            className="flex h-11 items-center gap-1.5 rounded-2xl border border-emerald-300/40 bg-[#00D68F] hover:bg-[#05f5a4] px-5 text-xs font-black uppercase tracking-wider text-black shadow-md shadow-black/40 active:scale-95 transition-all cursor-pointer"
          >
            <span>Empezar</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
