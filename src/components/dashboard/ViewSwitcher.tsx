"use client";

import { Calendar, Sparkles, Grid } from "lucide-react";
import { haptics } from "@/lib/haptics";

export type ActiveTab = "routines" | "plans" | "catalog";

interface ViewSwitcherProps {
  value: ActiveTab;
  onChange: (value: ActiveTab) => void;
  routinesCount: number;
  plansCount?: number;
  catalogCount: number;
}

export default function ViewSwitcher({ value, onChange, routinesCount, plansCount, catalogCount }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#121620] to-[#151b28] p-1.5 shadow-lg">
      <button
        onClick={() => {
          haptics.selection();
          onChange("routines");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "routines"
            ? "border border-primary/30 bg-primary text-black shadow-neon"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Días ({routinesCount})</span>
      </button>

      <button
        onClick={() => {
          haptics.selection();
          onChange("plans");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "plans"
            ? "border border-primary/30 bg-primary text-black shadow-neon"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Planes{plansCount !== undefined ? ` (${plansCount})` : ""}</span>
      </button>

      <button
        onClick={() => {
          haptics.selection();
          onChange("catalog");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "catalog"
            ? "border border-primary/30 bg-primary text-black shadow-neon"
            : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Grid className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Catálogo ({catalogCount})</span>
      </button>
    </div>
  );
}
