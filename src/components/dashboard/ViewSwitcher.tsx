"use client";

import { Calendar, Sparkles, Grid, SlidersHorizontal } from "lucide-react";
import { haptics } from "@/lib/haptics";

export type ActiveTab = "routines" | "plans" | "custom" | "catalog";

interface ViewSwitcherProps {
  value: ActiveTab;
  onChange: (value: ActiveTab) => void;
  routinesCount: number;
  plansCount?: number;
  catalogCount: number;
}

export default function ViewSwitcher({ value, onChange, routinesCount, plansCount: _plansCount, catalogCount: _catalogCount }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0d101a]/95 backdrop-blur-xl p-1.5 shadow-md dark:shadow-lg">
      <button
        onClick={() => {
          haptics.selection();
          onChange("routines");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] uppercase tracking-wider transition-all min-w-0 cursor-pointer ${
          value === "routines"
            ? "border border-white/20 bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon font-black"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">Días ({routinesCount})</span>
      </button>

      <button
        onClick={() => {
          haptics.selection();
          onChange("plans");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] uppercase tracking-wider transition-all min-w-0 cursor-pointer ${
          value === "plans"
            ? "border border-white/20 bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon font-black"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">Planes</span>
      </button>

      <button
        onClick={() => {
          haptics.selection();
          onChange("custom");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] uppercase tracking-wider transition-all min-w-0 cursor-pointer ${
          value === "custom"
            ? "border border-white/20 bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon font-black"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">Creador</span>
      </button>

      <button
        onClick={() => {
          haptics.selection();
          onChange("catalog");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] uppercase tracking-wider transition-all min-w-0 cursor-pointer ${
          value === "catalog"
            ? "border border-white/20 bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon font-black"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-bold"
        }`}
      >
        <Grid className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">Catálogo</span>
      </button>
    </div>
  );
}
