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
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-zinc-400">
          Modalidad de Entrenamiento
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modes.map(({ value, icon: Icon, title, description, badge }) => {
          const isSelected = mode === value;

          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              aria-pressed={isSelected}
              className={[
                "relative flex flex-col items-center justify-center text-center",
                "gap-2 p-4 rounded-3xl min-h-[144px]",
                "border transition-all duration-200 ease-out",
                "active:scale-[0.97] cursor-pointer shadow-lg",
                isSelected
                  ? "bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] border-primary shadow-sm dark:shadow-md ring-1 ring-primary/40"
                  : "bg-white dark:bg-[#131626] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#181d2e] shadow-xs",
              ].join(" ")}
            >
              {/* Recommended badge */}
              {badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-black px-2.5 py-0.5 rounded-full text-[12px] font-bold shadow-sm whitespace-nowrap border-primary/40">
                  {badge.toUpperCase()}
                </span>
              )}

              {/* Selection check */}
              <span
                className={[
                  "absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full transition-all duration-200",
                  isSelected
                    ? "bg-primary text-black scale-100 shadow-sm"
                    : "bg-slate-100 dark:bg-white/5 text-transparent scale-90",
                ].join(" ")}
                aria-hidden="true"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>

              {/* Icon */}
              <span
                className={[
                  "flex items-center justify-center rounded-2xl p-3 mb-1 transition-colors duration-200",
                  isSelected
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-400",
                ].join(" ")}
              >
                <Icon className="w-6 h-6" />
              </span>

              {/* Title */}
              <span
                className={[
                  "font-mono text-xs font-bold",
                  isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-300",
                ].join(" ")}
              >
                {title}
              </span>

              {/* Description */}
              <span className="text-[12px] text-slate-500 dark:text-zinc-400 leading-snug">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
