"use client";

import { Flame, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";

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
            className="relative z-10 w-full max-w-sm bg-[#101014] border border-white/15 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            {/* Ambient top glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary-container/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Flame Icon */}
            <div className="relative w-18 h-18 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-primary-container/20 border border-primary-container/40 animate-pulse" />
              <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.5)]">
                <Flame className="w-8 h-8 text-black fill-black" />
              </div>
            </div>

            {/* Title */}
            <SectionTitle align="center" className="mb-1 text-xl font-bold tracking-wide">
              ¿Quieres calentar?
            </SectionTitle>

            {routineTitle && (
              <p className="text-center text-[11px] font-mono text-primary-container uppercase font-bold mb-2 tracking-wider">
                {routineTitle}
              </p>
            )}

            <p className="text-zinc-400 text-center text-xs leading-relaxed mb-6">
              5 minutos de activación articular y cardiovascular para lubricar articulaciones y prevenir lesiones.
            </p>

            {/* Actions */}
            <div className="space-y-2.5">
              <PrimaryButton
                leftIcon={<Flame className="w-5 h-5 fill-current" />}
                onClick={onStartWarmup}
                className="w-full h-13 shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(204,255,0,0.5)] font-bold text-sm"
              >
                SÍ, CALENTAR PRIMERO
              </PrimaryButton>

              <button
                type="button"
                onClick={onSkipWarmup}
                className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 text-primary-container" />
                <span>NO, IR DIRECTO AL ENTRENO</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
