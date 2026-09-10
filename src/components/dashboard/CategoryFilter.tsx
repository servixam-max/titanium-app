"use client";

import { haptics } from "@/lib/haptics";

export type CategoryFilter = "all" | "fuerza" | "full_body" | "hiit" | "movilidad" | "personalizado";

interface CategoryFilterProps {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "full_body", label: "Full Body" },
  { id: "fuerza", label: "Fuerza" },
  { id: "hiit", label: "HIIT" },
  { id: "movilidad", label: "Movilidad" },
  { id: "personalizado", label: "Libre" },
];

export default function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
      {CATEGORIES.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => {
              haptics.selection();
              onChange(cat.id);
            }}
            className={`relative whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
              selected
                ? "border border-primary/40 bg-primary text-black shadow-neon"
                : "border border-white/10 bg-[#121620] text-zinc-400 hover:text-white hover:bg-[#161e2e]"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
