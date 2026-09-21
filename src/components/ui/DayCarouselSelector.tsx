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
    <div className="w-full relative">
      {/* Scrollable horizontal strip */}
      <div
        ref={containerRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
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
              onClick={() => {
                haptics.selection();
                onSelectDay(day);
              }}
              className={`relative flex-shrink-0 min-w-[74px] h-[64px] rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-200 cursor-pointer active:scale-95 select-none ${
                isSelected
                  ? "bg-primary text-white shadow-md border-2 border-primary/60 font-black scale-[1.03]"
                  : isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
                  : "bg-white dark:bg-[#131626] hover:bg-slate-50 dark:hover:bg-[#181d2e] text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-sm hover:border-primary/40"
              }`}
            >
              {/* Day header tag */}
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  isSelected ? "text-white/90 font-black" : isCompleted ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400 font-bold"
                }`}
              >
                {isExtra ? "LIBRE" : "DÍA"}
              </span>

              {/* Day number / icon */}
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`font-mono text-lg leading-none ${
                    isSelected ? "text-white font-black text-xl" : isCompleted ? "text-emerald-700 dark:text-emerald-300 font-black" : "text-slate-900 dark:text-white font-black"
                  }`}
                >
                  {isExtra ? "18" : day < 10 ? `0${day}` : day}
                </span>

                {isCompleted && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  />
                )}
              </div>

              {/* Status micro pill */}
              <span
                className={`text-[8px] font-mono mt-0.5 uppercase tracking-tighter ${
                  isSelected
                    ? "text-white/80 font-bold"
                    : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 font-bold"
                }`}
              >
                {isSelected ? "Activo" : isCompleted ? "Hecho" : isExtra ? "Catálogo" : "Rutina"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
