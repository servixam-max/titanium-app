"use client";

import { User, Headphones, Check } from "lucide-react";
import { TrainingMode } from "@/lib/types";

interface ModeSelectorProps {
  mode: TrainingMode;
  onChange: (mode: TrainingMode) => void;
}

const modes: {
  value: TrainingMode;
  icon: typeof User;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    value: "individual",
    icon: User,
    title: "Modo Individual",
    description: "Tú controlas el ritmo y descansos.",
  },
  {
    value: "guided",
    icon: Headphones,
    title: "Modo Guiado",
    description: "Descansos automáticos + voz IA.",
    badge: "Recomendado",
  },
];

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <section className="flex flex-col gap-stack-gap">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface">
          Modalidad de Entrenamiento
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-stack-gap">
        {modes.map(({ value, icon: Icon, title, description, badge }) => {
          const isSelected = mode === value;

          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              aria-pressed={isSelected}
              className={[
                "relative flex flex-col items-center justify-center text-center",
                "gap-base p-stack-gap rounded-2xl min-h-[144px]",
                "border-2 transition-all duration-200 ease-out",
                "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary-container focus-visible:outline-offset-2",
                isSelected
                  ? "bg-primary-container/10 border-primary-container shadow-neon"
                  : "bg-surface-container-low border-surface-container-highest hover:border-primary-container/40 hover:bg-surface-container-high",
              ].join(" ")}
            >
              {/* Recommended badge */}
              {badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-container px-2.5 py-1 rounded-full font-label-caps text-label-caps shadow-neon whitespace-nowrap">
                  {badge}
                </span>
              )}

              {/* Selection check */}
              <span
                className={[
                  "absolute top-3 right-3 flex items-center justify-center rounded-full transition-all duration-200",
                  isSelected
                    ? "bg-primary-container text-on-primary-container scale-100"
                    : "bg-surface-container-highest text-transparent scale-90",
                ].join(" ")}
                aria-hidden="true"
              >
                <Check className="w-4 h-4" strokeWidth={3} />
              </span>

              {/* Icon */}
              <span
                className={[
                  "flex items-center justify-center rounded-full p-3 mb-1 transition-colors duration-200",
                  isSelected
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-highest text-on-surface-variant",
                ].join(" ")}
              >
                <Icon className="w-7 h-7" />
              </span>

              {/* Title */}
              <span
                className={[
                  "font-headline-sm text-headline-sm font-semibold",
                  isSelected ? "text-primary-container" : "text-on-surface",
                ].join(" ")}
              >
                {title}
              </span>

              {/* Description */}
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
