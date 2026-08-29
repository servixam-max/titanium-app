"use client";

import { Flame, Zap, X } from "lucide-react";
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-surface-container-low border border-surface-container-highest rounded-2xl p-6 shadow-2xl relative animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary-container/20 border border-primary-container/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(204,255,0,0.2)]">
          <Flame className="w-8 h-8 text-primary-container fill-primary-container animate-pulse" />
        </div>

        {/* Title */}
        <SectionTitle align="center" className="mb-2">
          ¿Quieres calentar?
        </SectionTitle>

        {routineTitle && (
          <p className="text-center text-xs font-mono text-primary-container uppercase font-bold mb-2 tracking-wider">
            {routineTitle}
          </p>
        )}

        <p className="text-on-surface-variant text-center text-xs leading-relaxed mb-6">
          5 minutos de activación articular y muscular para lubricar articulaciones y prevenir lesiones.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <PrimaryButton
            leftIcon={<Flame className="w-5 h-5 fill-current" />}
            onClick={onStartWarmup}
            className="w-full shadow-neon"
          >
            SÍ, CALENTAR PRIMERO
          </PrimaryButton>

          <PrimaryButton
            variant="secondary"
            leftIcon={<Zap className="w-5 h-5 text-primary-container" />}
            onClick={onSkipWarmup}
            className="w-full"
          >
            NO, IR DIRECTO AL ENTRENO
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
