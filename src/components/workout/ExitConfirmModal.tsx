"use client";

import PrimaryButton from "@/components/ui/PrimaryButton";
import SectionTitle from "@/components/ui/SectionTitle";

interface ExitConfirmModalProps {
  open: boolean;
  onSave: () => void;
  onCancel: () => void;
  onContinue: () => void;
}

export default function ExitConfirmModal({
  open,
  onSave,
  onCancel,
  onContinue,
}: ExitConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#121620]-low border border-white/10 rounded-2xl p-6 shadow-2xl">
        <SectionTitle align="center" className="mb-2">
          ¿Salir del entreno?
        </SectionTitle>
        <p className="text-zinc-400 text-center mb-6 text-sm">
          Puedes guardar el progreso realizado o cancelar el entrenamiento.
        </p>
        <div className="space-y-2.5">
          <PrimaryButton onClick={onSave}>Guardar y salir</PrimaryButton>
          <PrimaryButton variant="danger" onClick={onCancel}>
            Cancelar entreno
          </PrimaryButton>
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 text-center text-sm font-bold text-zinc-400 hover:text-white"
          >
            Continuar entrenando
          </button>
        </div>
      </div>
    </div>
  );
}
