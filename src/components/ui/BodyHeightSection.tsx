"use client";

import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import { haptics } from "@/lib/haptics";
import {
  BODY_HEIGHT_CHANGED_EVENT,
  clearHeightCm,
  DEFAULT_HEIGHT_CM,
  formatHeightM,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  loadHeightCm,
  saveHeightCm,
} from "@/lib/body-height";

interface BodyHeightSectionProps {
  userId?: string | null;
}

/**
 * Altura real para el IMC (F12.1).
 *
 * Sin altura guardada el IMC se calcula con 1,75 m y así se dice en la
 * pantalla de Peso. Aquí se puede fijar la altura real; el cambio se anuncia
 * por evento para que Control de Peso lo aplique sin recargar.
 */
export default function BodyHeightSection({ userId }: BodyHeightSectionProps) {
  const [savedCm, setSavedCm] = useState<number | null>(() => loadHeightCm(userId));
  const [input, setInput] = useState<string>(() => {
    const saved = loadHeightCm(userId);
    return saved === null ? "" : String(saved);
  });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadHeightCm(userId);
    setSavedCm(saved);
    setInput(saved === null ? "" : String(saved));
    setError(null);
    setStatus(null);
  }, [userId]);

  const current =
    savedCm === null
      ? { cm: DEFAULT_HEIGHT_CM, estimated: true }
      : { cm: savedCm, estimated: false };

  const guardar = () => {
    // El teclado numérico puede meter coma: el campo es de cm enteros, pero se
    // acepta para no rechazar un 182,0 bien intencionado.
    const parsed = Number(input.replace(",", "."));
    const saved = saveHeightCm(userId, parsed);

    if (saved === null) {
      setError(`Pon una altura entre ${MIN_HEIGHT_CM} y ${MAX_HEIGHT_CM} cm.`);
      setStatus(null);
      return;
    }

    setSavedCm(saved);
    setInput(String(saved));
    setError(null);
    setStatus("Altura guardada.");
    haptics.success();
    window.dispatchEvent(new CustomEvent(BODY_HEIGHT_CHANGED_EVENT));
  };

  const restablecer = () => {
    clearHeightCm(userId);
    setSavedCm(null);
    setInput("");
    setError(null);
    setStatus("Altura restablecida a 1,75 m.");
    haptics.tick();
    window.dispatchEvent(new CustomEvent(BODY_HEIGHT_CHANGED_EVENT));
  };

  return (
    <section data-testid="body-height" className="flex flex-col gap-stack-gap">
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-1">
        <span className="text-primary">
          <Ruler className="w-4 h-4" aria-hidden="true" />
        </span>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          Altura para el IMC
        </h3>
      </div>

      <div className="fx-card rounded-2xl p-4 flex flex-col gap-3 shadow-sm dark:shadow-lg">
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Se usa para calcular tu IMC en Control de Peso. Sin altura guardada se
          estima en 1,75 m.
        </p>

        <span
          data-testid="body-height-current"
          className="text-sm font-bold text-slate-900 dark:text-white"
        >
          {formatHeightM(current.cm)}
          {current.estimated ? " · estimada" : ""}
        </span>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="body-height-input"
            className="text-xs font-semibold text-slate-500 dark:text-zinc-400"
          >
            Altura (cm)
          </label>
          <input
            id="body-height-input"
            type="number"
            inputMode="numeric"
            min={MIN_HEIGHT_CM}
            max={MAX_HEIGHT_CM}
            step={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
              setStatus(null);
            }}
            className="w-full h-12 rounded-2xl bg-inset border border-hairline px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={guardar}
          className="w-full h-12 bg-primary text-black font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm border-primary cursor-pointer"
        >
          Guardar altura
        </button>

        {savedCm !== null && (
          <button
            type="button"
            onClick={restablecer}
            className="w-full h-12 rounded-2xl bg-inset border border-hairline text-xs font-bold text-foreground active:scale-95 transition-all cursor-pointer"
          >
            Volver a 1,75 m
          </button>
        )}

        {status && (
          <p role="status" className="text-xs font-bold text-primary">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
