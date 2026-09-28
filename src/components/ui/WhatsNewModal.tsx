"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { APP_VERSION } from "@/lib/ota-sync";
import { ChangelogEntry, fetchChangelog } from "@/lib/changelog";
import {
  initWhatsNewTracking,
  markCurrentVersionSeen,
  shouldShowWhatsNew,
} from "@/lib/whats-new";
import { useAppStore } from "@/lib/store";
import { useStoreHydrated } from "@/hooks/useStoreHydrated";
import { haptics } from "@/lib/haptics";

/**
 * Novedades tras actualizar (F1.2).
 *
 * Pantalla corta de bienvenida que aparece UNA vez, la primera vez que se abre
 * la app después de actualizar, con lo que trae la versión instalada. En una
 * instalación nueva no aparece: no hay nada "nuevo" que contar (el Onboarding
 * ya se encarga de la bienvenida).
 *
 * Se espera a que haya sesión iniciada y el onboarding esté hecho para no
 * competir con el acceso ni con la bienvenida de primera vez.
 */

/** Margen tras arrancar la app para no tapar la carga inicial. */
const GATE_DELAY_MS = 900;
const REQUEST_TIMEOUT_NOTE = "Mejoras y correcciones de mantenimiento.";

interface WhatsNewContentProps {
  version: string;
  notes: string[];
  loading: boolean;
  onDismiss: () => void;
}

/** Parte visible: sin lógica de decisión, para poder probarla aislada. */
export function WhatsNewContent({
  version,
  notes,
  loading,
  onDismiss,
}: WhatsNewContentProps) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="fx-card-raised animate-fade-in-up flex max-h-[80dvh] w-full max-w-sm flex-col overflow-y-auto p-5"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <h2
            id="whats-new-title"
            className="fx-num text-lg font-semibold text-slate-900 dark:text-white"
          >
            Novedades de la v{version}
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-zinc-400">
            FORTIXAM se ha actualizado. Esto es lo que cambia:
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {loading ? (
            <p className="text-center text-[13px] text-slate-500 dark:text-zinc-400">
              Cargando novedades...
            </p>
          ) : notes.length === 0 ? (
            <p className="text-center text-[13px] text-slate-500 dark:text-zinc-400">
              {REQUEST_TIMEOUT_NOTE}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((note, i) => (
                <li key={`${version}-${i}`} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-primary" />
                  <span className="text-[13px] leading-relaxed text-slate-600 dark:text-zinc-300">
                    {note}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 flex h-12 w-full shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-black transition-all active:scale-95"
        >
          Entendido
        </button>

        <p className="mt-3 text-center text-[13px] text-slate-500 dark:text-zinc-400">
          Podrás releerlas cuando quieras en Ajustes → Novedades.
        </p>
      </div>
    </div>
  );
}

function findEntry(
  entries: ChangelogEntry[],
  version: string,
): ChangelogEntry | undefined {
  return entries.find(
    (e) => e.version.replace(/^v/i, "") === version.replace(/^v/i, ""),
  );
}

export default function WhatsNewModal() {
  const hydrated = useStoreHydrated();
  const { currentUser, onboardingComplete, activeWorkout } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<string[]>([]);

  // Decisión única: con la app lista, ¿toca contar lo de esta versión?
  useEffect(() => {
    if (!hydrated) return;
    // Punto de partida del aviso: en una instalación nueva se apunta la versión
    // sin molestar. Se hace aquí y no en un módulo para no escribir durante el
    // render.
    initWhatsNewTracking();
    if (!currentUser || !onboardingComplete) return;
    // Nunca interrumpir un entrenamiento: el aviso espera a la próxima apertura.
    if (activeWorkout.routine) return;
    if (!shouldShowWhatsNew()) return;

    let alive = true;
    (async () => {
      try {
        let { entries } = await fetchChangelog();
        // La caché puede ser de antes de publicar esta versión: una segunda
        // consulta a GitHub la trae. Si no hay red, se muestra el texto corto.
        if (!findEntry(entries, APP_VERSION.version)) {
          const fresh = await fetchChangelog({ force: true });
          entries = fresh.entries;
        }
        const entry = findEntry(entries, APP_VERSION.version);
        if (alive) setNotes(entry?.notes ?? []);
      } catch {
        if (alive) setNotes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const timer = setTimeout(() => {
      if (alive) setOpen(true);
    }, GATE_DELAY_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [hydrated, currentUser, onboardingComplete, activeWorkout.routine]);

  if (!open) return null;

  const handleDismiss = () => {
    haptics.tick();
    markCurrentVersionSeen();
    setOpen(false);
  };

  return (
    <WhatsNewContent
      version={APP_VERSION.version}
      notes={notes}
      loading={loading && notes.length === 0}
      onDismiss={handleDismiss}
    />
  );
}
