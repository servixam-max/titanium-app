"use client";

import { Flame, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WarmupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWarmup: () => void;
  onSkipWarmup: () => void;
  routineTitle?: string;
}

export default function WarmupModal({
  isOpen,
  onClose,
  onStartWarmup,
  onSkipWarmup,
  routineTitle,
}: WarmupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border border-slate-200 dark:border-primary/40 rounded-3xl p-6 shadow-xl overflow-hidden"
          >
            {/* Ambient top glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Flame Icon */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/30 animate-pulse" />
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Flame className="w-7 h-7 text-white fill-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="font-mono text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider text-center mb-1">
              ¿Quieres calentar?
            </h2>

            {routineTitle && (
              <p className="text-center text-[11px] font-mono text-cyan-600 dark:text-cyan-400 uppercase font-bold mb-2 tracking-wider">
                {routineTitle}
              </p>
            )}

            <p className="text-slate-600 dark:text-zinc-400 text-center text-xs leading-relaxed mb-6 font-mono">
              5 minutos de movilidad articular y activación neuromuscular para prevenir lesiones y mejorar la potencia.
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onStartWarmup}
                className="w-full h-13 bg-primary hover:brightness-105 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md border border-primary/40 active:scale-95 transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>SÍ, CALENTAR PRIMERO</span>
              </button>

              <button
                type="button"
                onClick={onSkipWarmup}
                className="w-full h-12 rounded-2xl bg-white dark:bg-[#131626] hover:bg-slate-50 dark:hover:bg-[#181d2e] active:scale-98 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>NO, IR DIRECTO AL ENTRENO</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
