/**
 * Duración real de una sesión, calculada desde sus ejercicios.
 *
 * Única fuente de verdad: la usan los tests de calidad, los scripts de
 * mantenimiento y (si se necesita en pantalla) cualquier componente. Antes cada
 * sitio lo calculaba a su manera y por eso los carteles decían 35 min mientras
 * la sesión duraba 41.
 *
 * Dos formatos, porque no se ejecutan igual:
 *  - FUERZA: 45 s por serie + descansos entre series.
 *  - HIIT/Tabata: intervalos. Si el día está escrito con sets > 1, las series YA
 *    son los intervalos; si está con sets == 1 y `rounds` > 1, el ejercicio se
 *    repite en cada ronda.
 *
 * Los ejercicios `optional` (remates de burpees/flexiones) NO cuentan: son un
 * extra que el usuario decide si hace, no parte del plan medido.
 */

export interface EjercicioDuracion {
  sets?: number;
  restSeconds?: number;
  workSeconds?: number;
  optional?: boolean;
}

/** Segundos que dura un día. `rounds` solo aplica a HIIT/Tabata. */
export function duracionSegundos(
  exercises: EjercicioDuracion[],
  rounds = 0,
): number {
  const esHiit = rounds > 0;
  let seg = 0;

  for (const e of exercises) {
    if (e.optional) continue;

    const sets = e.sets || 1;
    const rest = e.restSeconds || 0;

    if (esHiit) {
      const trabajo = e.workSeconds && e.workSeconds > 0 ? e.workSeconds : 40;
      const reps = sets > 1 ? sets : Math.max(1, rounds);
      seg += reps * (trabajo + rest);
    } else {
      seg += sets * 45 + Math.max(0, sets - 1) * rest;
    }
  }

  return seg;
}

/** Minutos (redondeados) que dura un día. */
export function duracionMinutos(
  exercises: EjercicioDuracion[],
  rounds = 0,
): number {
  return Math.round(duracionSegundos(exercises, rounds) / 60);
}
