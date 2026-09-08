"use client";

import { Calendar, Grid } from "lucide-react";
import { haptics } from "@/lib/haptics";

export type ActiveTab = "routines" | "catalog";

interface ViewSwitcherProps {
  value: ActiveTab;
  onChange: (value: ActiveTab) => void;
  routinesCount: number;
  catalogCount: number;
}

export default function ViewSwitcher({ value, onChange, routinesCount, catalogCount }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-surface-container-low p-1.5 shadow-lg">
      <button
        onClick={() => {
          haptics.selection();
          onChange("routines");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "routines"
            ? "border border-primary/30 bg-primary text-on-primary shadow-md shadow-black/40"
            : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
        }`}
      >
        <Calendar className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Por Días ({routinesCount})</span>
      </button>
      <button
        onClick={() => {
          haptics.selection();
          onChange("catalog");
        }}
        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-bold uppercase tracking-wider transition-all min-w-0 ${
          value === "catalog"
            ? "border border-primary/30 bg-primary text-on-primary shadow-md shadow-black/40"
            : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
        }`}
      >
        <Grid className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">Catálogo ({catalogCount})</span>
      </button>
    </div>
  );
}
