"use client";

import { Dumbbell } from "lucide-react";

interface EmptyCatalogStateProps {
  onReset: () => void;
}

export default function EmptyCatalogState({ onReset }: EmptyCatalogStateProps) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#141828] via-[#111422] to-[#0D101A] p-8 text-center shadow-lg">
      <Dumbbell className="mb-1 h-10 w-10 text-zinc-500/40" />
      <span className="text-sm font-bold text-white">No se encontraron ejercicios</span>
      <span className="text-xs text-zinc-400">
        Prueba a cambiar el texto de búsqueda o el filtro muscular.
      </span>
      <button
        onClick={onReset}
        className="mt-2 rounded-xl bg-gradient-to-r from-primary to-emerald-400 px-4 py-2 text-xs font-black text-black shadow-neon active:scale-95 transition-all cursor-pointer"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
