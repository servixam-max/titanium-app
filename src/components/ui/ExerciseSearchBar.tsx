"use client";

import { Search, X, Dumbbell, User } from "lucide-react";
import { haptics } from "@/lib/haptics";

export type MuscleCategory =
  | "all"
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "full_body";

export type EquipmentFilter = "all" | "dumbbells" | "bodyweight";

interface ExerciseSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMuscle: MuscleCategory;
  onSelectMuscle: (m: MuscleCategory) => void;
  selectedEquipment: EquipmentFilter;
  onSelectEquipment: (e: EquipmentFilter) => void;
  totalCount: number;
}

const MUSCLE_TAGS: { id: MuscleCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "chest", label: "Pecho" },
  { id: "back", label: "Espalda" },
  { id: "legs", label: "Piernas" },
  { id: "shoulders", label: "Hombros" },
  { id: "biceps", label: "Bíceps" },
  { id: "triceps", label: "Tríceps" },
  { id: "core", label: "Abdomen / Core" },
  { id: "full_body", label: "Full Body / Cardio" },
];

export default function ExerciseSearchBar({
  searchQuery,
  onSearchChange,
  selectedMuscle,
  onSelectMuscle,
  selectedEquipment,
  onSelectEquipment,
  totalCount,
}: ExerciseSearchBarProps) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center justify-center">
          <Search className="w-4 h-4 text-primary" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por ejercicio o músculo (ej. sentadilla, press...)"
          className="w-full h-12 pl-10 pr-10 rounded-2xl bg-[#111622] border border-white/15 focus:border-primary text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-lg transition-all"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={() => {
              haptics.selection();
              onSearchChange("");
            }}
            className="absolute right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Equipment toggle + Results counter */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              haptics.selection();
              onSelectEquipment("all");
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all ${
              selectedEquipment === "all"
                ? "bg-white/20 text-white border border-white/30"
                : "text-zinc-500 hover:text-zinc-300 bg-black/30 border border-white/5"
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => {
              haptics.selection();
              onSelectEquipment("dumbbells");
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
              selectedEquipment === "dumbbells"
                ? "bg-primary/20 text-primary border border-primary/40 shadow-neon"
                : "text-zinc-500 hover:text-zinc-300 bg-black/30 border border-white/5"
            }`}
          >
            <Dumbbell className="w-3 h-3" />
            Mancuernas
          </button>
          <button
            onClick={() => {
              haptics.selection();
              onSelectEquipment("bodyweight");
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
              selectedEquipment === "bodyweight"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "text-zinc-500 hover:text-zinc-300 bg-black/30 border border-white/5"
            }`}
          >
            <User className="w-3 h-3" />
            Corporal
          </button>
        </div>

        <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          {totalCount} {totalCount === 1 ? "ejercicio" : "ejercicios"}
        </span>
      </div>

      {/* Muscle Tag Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {MUSCLE_TAGS.map((tag) => {
          const isSelected = selectedMuscle === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => {
                haptics.selection();
                onSelectMuscle(tag.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-primary text-black font-black shadow-neon scale-[1.02]"
                  : "bg-[#111622] hover:bg-[#161e2e] text-zinc-400 border border-white/10"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
