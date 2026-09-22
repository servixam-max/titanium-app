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

const TABS: { value: ActiveTab; label: string; Icon: typeof Calendar }[] = [
  { value: "routines", label: "Sesiones", Icon: Calendar },
  { value: "plans", label: "Planes", Icon: Sparkles },
  { value: "custom", label: "Crear", Icon: SlidersHorizontal },
  { value: "catalog", label: "Ejercicios", Icon: Grid },
];

/**
 * Control segmentado (estilo iOS): un solo contenedor, un único indicador,
 * sin bordes por botón. Antes eran cuatro botones con borde y píldoras.
 */
export default function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div role="tablist" aria-label="Secciones" className="fx-segmented">
      {TABS.map(({ value: tab, label, Icon }) => {
        const selected = value === tab;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={selected}
            onClick={() => {
              haptics.selection();
              onChange(tab);
            }}
            className="fx-segmented-item"
          >
            <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={selected ? 2.2 : 1.9} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
