// FORTIXAM — comparativa mensual (F3.4): volumen por grupo muscular del mes
// en curso frente al mismo tramo del mes anterior.
//
// La mejora del día: saber si este mes se está entrenando más o menos que el
// pasado, grupo a grupo, sin exportar datos ni hacer cuentas. Se compara el
// "mismo tramo" (día 1 hasta hoy contra el día 1 hasta el mismo día del mes
// anterior) porque medir 9 días contra un mes entero sería una trampa: siempre
// parecería que se entrena menos. Cuando el mes anterior es más corto (p. ej.
// 31 de marzo → febrero), el tramo se acota a su último día y la etiqueta lo
// dice con fechas reales.
//
// Reglas de la casa: el volumen efectivo lo define una sola vez el motor
// biomecánico (`muscle-engine.ts`: primarios al 100 %, sinergistas al 45 % y
// carga de referencia si no se anotó el peso — igual que el mapa 3D y la
// "Distribución de Carga por Grupo"); las fechas se agrupan en hora LOCAL del
// dispositivo y las sesiones sin completar o con fecha inválida se ignoran.

import {
  accumulateMuscleStats,
  aggregateMajorGroups,
  MAJOR_GROUPS,
  type MajorGroupKey,
  type MuscleSessionLike,
} from "./muscle-engine";
import { formatThousands } from "./share-summary";
import { MESES_CORTOS } from "./consistency";

export type MonthlyTrend = "up" | "down" | "equal" | "new" | "none";

export interface MonthlyGroupComparison {
  key: MajorGroupKey;
  name: string;
  color: string;
  /** Volumen efectivo del grupo en el tramo en curso. */
  currentKg: number;
  /** Volumen efectivo del grupo en el mismo tramo del mes anterior. */
  previousKg: number;
  trend: MonthlyTrend;
  /** "+20 %", "-12 %", "0 %", "nuevo" o "" (sin actividad). */
  deltaLabel: string;
  /** Variación % redondeada; null cuando no hay base de comparación. */
  deltaPct: number | null;
  /** Longitud relativa 0-100 de cada barra (máximo común de la tarjeta). */
  currentBarPct: number;
  previousBarPct: number;
}

export interface MonthlyComparison {
  /** "1–9 oct vs 1–9 sep". */
  rangeSummary: string;
  /** "1–9 oct". */
  currentRangeLabel: string;
  /** "1–9 sep". */
  previousRangeLabel: string;
  /** Grupos con actividad en alguno de los dos tramos, ya ordenados. */
  groups: MonthlyGroupComparison[];
  currentTotalKg: number;
  previousTotalKg: number;
  totalTrend: MonthlyTrend;
  totalDeltaLabel: string;
  totalDeltaPct: number | null;
  /** Volumen del grupo más fuerte (referencia de las barras). */
  maxGroupKg: number;
  /** Hay al menos un grupo con actividad en alguno de los dos tramos. */
  hasData: boolean;
}

/** Por encima de este porcentaje el número deja de informar: se acota. */
export const MONTHLY_MAX_PCT_LABEL = 999;

function deltaLabel(pct: number): string {
  if (pct > MONTHLY_MAX_PCT_LABEL) return `>${MONTHLY_MAX_PCT_LABEL} %`;
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "";
  return `${sign}${Math.abs(pct)} %`;
}

/** Tendencia y etiqueta de un tramo frente a otro (sin base → "nuevo"). */
export function compareVolumes(
  currentKg: number,
  previousKg: number,
): { trend: MonthlyTrend; deltaPct: number | null; deltaLabel: string } {
  if (!(currentKg > 0) && !(previousKg > 0)) {
    return { trend: "none", deltaPct: null, deltaLabel: "" };
  }
  if (!(previousKg > 0)) {
    return { trend: "new", deltaPct: null, deltaLabel: "nuevo" };
  }
  const pct = Math.round(((currentKg - previousKg) / previousKg) * 100);
  const trend: MonthlyTrend = pct > 0 ? "up" : pct < 0 ? "down" : "equal";
  return { trend, deltaPct: pct === 0 ? 0 : pct, deltaLabel: deltaLabel(pct) };
}

/** Etiqueta corta del tramo: "1–9 oct" (o "3 oct" si empieza y acaba el mismo día). */
function rangeLabel(start: Date, end: Date): string {
  const mes = MESES_CORTOS[start.getMonth()];
  return start.getDate() === end.getDate()
    ? `${start.getDate()} ${mes}`
    : `${start.getDate()}–${end.getDate()} ${mes}`;
}

/** Sesión completada y con fecha válida dentro de [start, end]. */
function inWindow(
  session: MuscleSessionLike,
  start: Date,
  end: Date,
): boolean {
  if (!session || !session.completed) return false;
  if (typeof session.endTime !== "string") return false;
  const when = new Date(session.endTime);
  if (Number.isNaN(when.getTime())) return false;
  return when >= start && when <= end;
}

/** Longitud de barra 0-100; los valores pequeños tienen un mínimo visible. */
function barPct(value: number, max: number): number {
  if (!(value > 0) || !(max > 0)) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

/**
 * Construye la comparativa mensual. `options.today` permite fijar el "hoy"
 * en las pruebas; en la app es la fecha real del dispositivo.
 */
export function buildMonthlyComparison(
  sessions: MuscleSessionLike[] | null | undefined,
  options: { today?: Date } = {},
): MonthlyComparison {
  const rawToday = options.today ?? new Date();
  const today = new Date(
    rawToday.getFullYear(),
    rawToday.getMonth(),
    rawToday.getDate(),
  );
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  // Tramo en curso: del día 1 al final de hoy (los días futuros no cuentan).
  const curStart = new Date(year, month, 1);
  const curEnd = new Date(year, month, day, 23, 59, 59, 999);

  // Tramo anterior: mismo día del mes pasado; si es más corto, su último día.
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevEndDay = Math.min(day, daysInPrevMonth);
  const prevStart = new Date(prevYear, prevMonth, 1);
  const prevEnd = new Date(prevYear, prevMonth, prevEndDay, 23, 59, 59, 999);

  const all = sessions ?? [];
  const currentGroups = aggregateMajorGroups(
    accumulateMuscleStats(all.filter((s) => inWindow(s, curStart, curEnd))),
  );
  const previousGroups = aggregateMajorGroups(
    accumulateMuscleStats(all.filter((s) => inWindow(s, prevStart, prevEnd))),
  );
  const previousByKey = new Map(previousGroups.map((g) => [g.key, g.volume]));

  const groups: MonthlyGroupComparison[] = currentGroups
    .map((g) => {
      const previousKg = previousByKey.get(g.key) ?? 0;
      const { trend, deltaPct, deltaLabel } = compareVolumes(g.volume, previousKg);
      return {
        key: g.key,
        name: g.name,
        color: g.color,
        currentKg: g.volume,
        previousKg,
        trend,
        deltaPct,
        deltaLabel,
        currentBarPct: 0,
        previousBarPct: 0,
      };
    })
    .filter((g) => g.currentKg > 0 || g.previousKg > 0);

  let maxGroupKg = 0;
  for (const g of groups) {
    maxGroupKg = Math.max(maxGroupKg, g.currentKg, g.previousKg);
  }
  for (const g of groups) {
    g.currentBarPct = barPct(g.currentKg, maxGroupKg);
    g.previousBarPct = barPct(g.previousKg, maxGroupKg);
  }

  // Orden: el grupo más trabajado este mes primero; los empates desempatan
  // por el mes pasado y, si sigue el empate, por el orden canónico de grupos.
  const canonicalOrder = new Map(MAJOR_GROUPS.map((g, index) => [g.key, index]));
  groups.sort(
    (a, b) =>
      b.currentKg - a.currentKg ||
      b.previousKg - a.previousKg ||
      (canonicalOrder.get(a.key) ?? 0) - (canonicalOrder.get(b.key) ?? 0),
  );

  const currentTotalKg = groups.reduce((sum, g) => sum + g.currentKg, 0);
  const previousTotalKg = groups.reduce((sum, g) => sum + g.previousKg, 0);
  const total = compareVolumes(currentTotalKg, previousTotalKg);

  return {
    rangeSummary: `${rangeLabel(curStart, curEnd)} vs ${rangeLabel(prevStart, prevEnd)}`,
    currentRangeLabel: rangeLabel(curStart, curEnd),
    previousRangeLabel: rangeLabel(prevStart, prevEnd),
    groups,
    currentTotalKg,
    previousTotalKg,
    totalTrend: total.trend,
    totalDeltaLabel: total.deltaLabel,
    totalDeltaPct: total.deltaPct,
    maxGroupKg,
    hasData: groups.length > 0,
  };
}

/** Texto del resumen con cifras formateadas: "12.480 kg · +18 %". */
export function describeMonthlyTotal(comparison: MonthlyComparison): string {
  if (!comparison.hasData) return "Sin entrenamientos en ninguno de los dos tramos";
  const chips: string[] = [`${formatThousands(comparison.currentTotalKg)} kg`];
  if (comparison.totalDeltaLabel) chips.push(comparison.totalDeltaLabel);
  return chips.join(" · ");
}
