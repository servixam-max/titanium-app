"use client";

import { Dumbbell } from "lucide-react";

interface EmptyCatalogStateProps {
  onReset: () => void;
}

export default function EmptyCatalogState({ onReset }: EmptyCatalogStateProps) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] p-8 text-center shadow-sm">
      <Dumbbell className="mb-1 h-10 w-10 text-slate-400 dark:text-zinc-500/40" />
      <span className="text-sm font-bold text-slate-900 dark:text-white">No se encontraron ejercicios</span>
      <span className="text-xs text-slate-600 dark:text-zinc-400">
        Prueba a cambiar el texto de búsqueda o el filtro muscular.
      </span>
      <button
        onClick={onReset}
        className="mt-2 rounded-xl bg-primary hover:brightness-105 px-4 py-2 text-xs font-bold text-white shadow-sm border border-primary/40 active:scale-95 transition-all cursor-pointer"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
