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
    <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-gradient-to-br from-[#121620] to-[#151b28] p-1.5 shadow-lg">
      <button
        onClick={() => {
          haptics.selection();
          onChange("routines");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "routines"
            ? "border border-primary/30 bg-primary text-black shadow-neon font-black"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
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
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "plans"
            ? "border border-primary/30 bg-primary text-black shadow-neon font-black"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
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
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "custom"
            ? "border border-primary/30 bg-primary text-black shadow-neon font-black"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
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
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "catalog"
            ? "border border-primary/30 bg-primary text-black shadow-neon font-black"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Grid className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">Catálogo</span>
      </button>
    </div>
  );
}
