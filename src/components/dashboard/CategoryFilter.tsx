"use client";

import { haptics } from "@/lib/haptics";

export type CategoryFilter = "all" | "fuerza" | "full_body" | "hiit" | "movilidad" | "personalizado";

interface CategoryFilterProps {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "full_body", label: "Full body" },
  { id: "fuerza", label: "Fuerza" },
  { id: "hiit", label: "HIIT" },
  { id: "movilidad", label: "Movilidad" },
  { id: "personalizado", label: "Libre" },
];

/**
 * Filtros discretos: sin bordes por pastilla. El seleccionado se distingue por
 * superficie y color, no por un borde que compita con el resto de la pantalla.
 */
export default function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-0.5">
      {CATEGORIES.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => {
              haptics.selection();
              onChange(cat.id);
            }}
            aria-pressed={selected}
            className={`fx-press whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] transition-colors ${
              selected
                ? "bg-primary font-semibold text-black"
                : "fx-inset font-medium text-[color:var(--text-secondary)]"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
