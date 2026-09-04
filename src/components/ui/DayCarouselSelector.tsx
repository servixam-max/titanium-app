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
          const isExtra = day === 13;

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
                  ? "bg-primary text-black shadow-[0_0_14px_rgba(0,210,127,0.30)] border-2 border-primary font-black scale-[1.03]"
                  : isCompleted
                  ? "bg-[#0c1815] text-emerald-400 border border-emerald-500/40"
                  : "bg-[#111622]/90 hover:bg-[#151c2c] text-zinc-400 border border-white/10"
              }`}
            >
              {/* Day header tag */}
              <span
                className={`font-mono text-[9px] font-black uppercase tracking-wider ${
                  isSelected ? "text-black/80" : isCompleted ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                {isExtra ? "LIBRE" : "DÍA"}
              </span>

              {/* Day number / icon */}
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`font-mono text-lg font-black leading-none ${
                    isSelected ? "text-black" : "text-white"
                  }`}
                >
                  {isExtra ? "13" : day < 10 ? `0${day}` : day}
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
                    ? "text-black font-extrabold"
                    : isCompleted
                    ? "text-emerald-400 font-bold"
                    : "text-zinc-500"
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
