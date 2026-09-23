"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface DayCarouselSelectorProps {
  days: number[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  completedDayIds: Set<number>;
}

/**
 * Selector de días: cada ficha muestra solo lo esencial —la etiqueta y el
 * número— y el estado se lee por color y por el check en la esquina. Antes
 * llevaba tres líneas dentro de 64 px fijos (etiqueta, número y estado), así
 * que cualquier cambio en el tamaño del texto hacía que se solaparan.
 */
export default function DayCarouselSelector({
  days,
  selectedDay,
  onSelectDay,
  completedDayIds,
}: DayCarouselSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected day into view smoothly
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedEl = containerRef.current.querySelector(
      `[data-day="${selectedDay}"]`
    ) as HTMLElement | null;

    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedDay]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="no-scrollbar flex items-center gap-2.5 overflow-x-auto px-1 py-1.5 scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {days.map((day) => {
          const isSelected = selectedDay === day;
          const isCompleted = completedDayIds.has(day);
          const isExtra = day === 18;

          return (
            <button
              key={day}
              data-day={day}
              aria-pressed={isSelected}
              aria-label={`${isExtra ? "Sesión libre" : `Día ${day}`}${isCompleted ? ", completado" : ""}`}
              onClick={() => {
                haptics.selection();
                onSelectDay(day);
              }}
              className={`fx-press relative flex h-[64px] min-w-[62px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 select-none ${
                isSelected
                  ? "bg-primary text-black"
                  : isCompleted
                    ? "bg-emerald-500/12 text-foreground"
                    : "fx-inset text-[color:var(--text-secondary)]"
              }`}
            >
              <span className="text-[12px] leading-none font-medium opacity-80">
                {isExtra ? "Libre" : "Día"}
              </span>

              <span className="fx-num text-[21px] leading-none">
                {isExtra ? "18" : day < 10 ? `0${day}` : day}
              </span>

              {isCompleted && (
                <CheckCircle2
                  aria-hidden="true"
                  className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 ${
                    isSelected ? "text-black/70" : "text-emerald-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
