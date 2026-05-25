"use client";

import { User, PlaySquare } from "lucide-react";
import { TrainingMode } from "@/lib/types";

interface ModeSelectorProps {
  mode: TrainingMode;
  onChange: (mode: TrainingMode) => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <section className="flex flex-col gap-stack-gap">
      <h2 className="font-headline-md text-headline-md text-on-surface">
        Modalidad de Entrenamiento
      </h2>
      <div className="grid grid-cols-2 gap-stack-gap">
        {/* Individual Mode */}
        <button
          onClick={() => onChange("individual")}
          className={`bg-surface-container-low border rounded-xl p-stack-gap flex flex-col items-center justify-center gap-base active:scale-95 transition-transform min-h-[120px] ${
            mode === "individual"
              ? "border-primary-container bg-surface-container-high"
              : "border-surface-container-highest"
          }`}
        >
          <User
            className={`w-8 h-8 ${
              mode === "individual"
                ? "text-primary-container"
                : "text-on-surface-variant"
            }`}
          />
          <span
            className={`font-body-md text-body-md text-center font-bold ${
              mode === "individual"
                ? "text-primary-container"
                : "text-on-background"
            }`}
          >
            Modo Individual
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant text-center">
            Ritmo propio sin pausas guiadas
          </span>
        </button>

        {/* Guided Mode */}
        <button
          onClick={() => onChange("guided")}
          className={`relative border-2 rounded-xl p-stack-gap flex flex-col items-center justify-center gap-base active:scale-95 transition-transform min-h-[120px] overflow-hidden group ${
            mode === "guided"
              ? "border-primary-container bg-primary-container/10"
              : "border-surface-container-highest bg-surface-container-low"
          }`}
        >
      {/* Badge - QUITADO */}
      {/* <div className="absolute top-2 right-2 bg-primary-container text-on-primary-container px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps shadow-neon">
            Automático
          </div> */}

          <PlaySquare
            className={`w-8 h-8 z-10 ${
              mode === "guided"
                ? "text-primary-container"
                : "text-on-surface-variant"
            }`}
          />
          <span
            className={`font-body-md text-body-md font-bold text-center z-10 ${
              mode === "guided"
                ? "text-primary-container"
                : "text-on-background"
            }`}
          >
            Modo Guiado
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant text-center z-10">
            Tiempos de descanso y voz IA
          </span>
        </button>
      </div>
    </section>
  );
}
