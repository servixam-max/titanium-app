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
                  ? "bg-gradient-to-r from-primary via-[#85F754] to-[#00F59B] text-black shadow-neon-strong border-2 border-white/60 font-black scale-[1.04]"
                  : isCompleted
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-400/50"
                  : "bg-[#131626] hover:bg-[#181d2e] text-slate-300 border border-white/10 hover:border-white/20"
              }`}
            >
              {/* Day header tag */}
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  isSelected ? "text-black font-black" : isCompleted ? "text-emerald-400 font-bold" : "text-slate-400 font-bold"
                }`}
              >
                {isExtra ? "LIBRE" : "DÍA"}
              </span>

              {/* Day number / icon */}
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`font-mono text-lg leading-none ${
                    isSelected ? "text-black font-black text-xl" : isCompleted ? "text-emerald-300 font-black" : "text-white font-black"
                  }`}
                >
                  {isExtra ? "18" : day < 10 ? `0${day}` : day}
                </span>

                {isCompleted && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-black" : "text-emerald-400"
                    }`}
                  />
                )}
              </div>

              {/* Status micro pill */}
              <span
                className={`text-[8px] font-mono mt-0.5 uppercase tracking-tighter ${
                  isSelected
                    ? "text-black font-black"
                    : isCompleted
                    ? "text-emerald-400 font-bold"
                    : "text-slate-400 font-medium"
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
