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
            className="relative z-10 w-full max-w-sm bg-gradient-to-br from-[#121622] to-[#151b2a] border border-primary/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            {/* Ambient top glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Flame Icon */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-400/20 to-primary/20 border border-primary/40 animate-pulse" />
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-neon">
                <Flame className="w-7 h-7 text-black fill-black" />
              </div>
            </div>

            {/* Title */}
            <h2 className="font-mono text-lg font-black text-white uppercase tracking-wider text-center mb-1">
              ¿Quieres calentar?
            </h2>

            {routineTitle && (
              <p className="text-center text-[11px] font-mono text-cyan-400 uppercase font-bold mb-2 tracking-wider">
                {routineTitle}
              </p>
            )}

            <p className="text-zinc-400 text-center text-xs leading-relaxed mb-6 font-mono">
              5 minutos de movilidad articular y activación neuromuscular para prevenir lesiones y mejorar la potencia.
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onStartWarmup}
                className="w-full h-13 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>SÍ, CALENTAR PRIMERO</span>
              </button>

              <button
                type="button"
                onClick={onSkipWarmup}
                className="w-full h-12 rounded-2xl bg-[#141a24] hover:bg-[#18212e] active:scale-98 border border-white/10 text-zinc-300 hover:text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>NO, IR DIRECTO AL ENTRENO</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
