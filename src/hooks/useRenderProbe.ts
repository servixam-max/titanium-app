"use client";

import { useEffect } from "react";
import { bumpRender } from "@/lib/perf-probe";

/**
 * Avisa a la sonda de rendimiento en cada render de este componente (F4.4).
 *
 * Un efecto sin dependencias corre tras cada commit, así que el contador
 * refleja exactamente lo que hay que medir: cuántas veces se repinta el
 * componente. Con la sonda apagada (siempre en producción) no hace nada.
 */
export function useRenderProbe(name: string): void {
  // Sin array de dependencias a propósito: queremos contar cada render.
  useEffect(() => {
    bumpRender(name);
  });
}
