"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Tag,
  CheckCircle2,
} from "lucide-react";
import {
  ChangelogEntry,
  formatReleaseDate,
  isInstalledVersion,
} from "@/lib/changelog";

interface ChangelogListProps {
  entries: ChangelogEntry[];
  loading: boolean;
  error: string;
  /** true cuando lo mostrado viene de la copia guardada sin conexión. */
  fromCache: boolean;
  onRetry: () => void;
  /** Cuántas versiones se ven antes de desplegar el resto. */
  visibleCount?: number;
}

/**
 * Novedades dentro de la app (F1.1): lista de las últimas versiones publicadas
 * con sus cambios, marcando en cuál está el usuario. Estilo limpio del sistema
 * visual FX para que se vea igual en modo claro y oscuro.
 */
export default function ChangelogList({
  entries,
  loading,
  error,
  fromCache,
  onRetry,
  visibleCount = 3,
}: ChangelogListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // La versión instalada es la primera tarjeta: se abre sola para que el
  // usuario vea de un vistazo qué trae lo que ya tiene.
  useEffect(() => {
    if (expanded === null && entries.length > 0) {
      setExpanded(entries[0].version);
    }
  }, [entries, expanded]);

  const toggle = useCallback((version: string) => {
    setExpanded((current) => (current === version ? null : version));
  }, []);

  if (loading) {
    return (
      <div className="fx-card flex items-center justify-center gap-3 p-4 text-sm text-slate-500 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Cargando novedades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fx-card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <span>No se pudieron cargar las novedades</span>
        </div>
        <p className="text-[13px] text-slate-500 dark:text-zinc-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-xs font-bold text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="fx-card p-4">
        <p className="text-[13px] text-slate-500 dark:text-zinc-400">
          Todavía no hay novedades publicadas.
        </p>
      </div>
    );
  }

  const hidden = Math.max(0, entries.length - visibleCount);
  const shown = showAll ? entries : entries.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-2">
      {shown.map((entry) => {
        const installed = isInstalledVersion(entry.version);
        const isOpen = expanded === entry.version;
        const notes = entry.notes;

        return (
          <div key={entry.version} className="fx-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(entry.version)}
              aria-expanded={isOpen}
              className="fx-press flex min-h-[48px] w-full items-center gap-3 p-4 text-left active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Tag className="h-4 w-4" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className="fx-num text-sm font-semibold text-slate-900 dark:text-white">
                    v{entry.version}
                  </span>
                  {installed && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Instalada
                    </span>
                  )}
                </span>
                <span className="fx-label-sm truncate">
                  {formatReleaseDate(entry.publishedAt)}
                  {entry.notes.length > 0 &&
                    ` · ${entry.notes.length} ${entry.notes.length === 1 ? "cambio" : "cambios"}`}
                </span>
              </span>

              {isOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" />
              )}
            </button>

            {isOpen && (
              <div className="flex flex-col gap-2 px-4 pb-4">
                <div className="fx-hairline" />
                {notes.length === 0 ? (
                  <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                    Mejoras y correcciones de mantenimiento.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {notes.map((note, i) => (
                      <li key={`${entry.version}-${i}`} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        <span className="text-[13px] leading-relaxed text-slate-600 dark:text-zinc-300">
                          {note}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          </div>
        );
      })}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-xs font-semibold text-slate-600 transition-all active:scale-95 dark:bg-white/5 dark:text-zinc-300"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Ver menos
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              Ver {hidden} {hidden === 1 ? "versión anterior" : "versiones anteriores"}
            </>
          )}
        </button>
      )}

      <p className="text-center text-[13px] text-slate-400 dark:text-zinc-500">
        {fromCache
          ? "Mostrando la última copia guardada. Se actualiza sola con conexión."
          : "Novedades leídas de las versiones publicadas en GitHub."}
      </p>
    </div>
  );
}
