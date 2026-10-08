// FORTIXAM — constancia (F3.2): heatmap de las últimas 4 semanas.
//
// La mejora del día: ver de un vistazo cuántos días de las últimas 4 semanas
// se ha entrenado y con qué carga, en vez de tener que recordarlo. Todo lo que
// se puede decidir sin React vive aquí, para probarlo sin móvil: la ventana
// (semana en curso + 3 anteriores, lunes a domingo), el volumen por día, la
// intensidad 0-4 al estilo del mapa de contribuciones de GitHub y el resumen
// ("X de Y días").
//
// Reglas de la casa: un set no completado no suma (misma regla que
// `computeSessionTotals`), las fechas inválidas se ignoran sin romper y los
// días se agrupan en hora LOCAL del dispositivo (un entreno a las 23:30
// pertenece a ese día, no al siguiente por el desfase con UTC).

import { formatThousands } from "./share-summary";

export const CONSISTENCY_WEEK_COUNT = 4;
export const CONSISTENCY_DAY_COUNT = 28;

const DIAS_SEMANA_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
// Compartido con `records-chart.ts` (F3.3), que etiqueta fechas igual.
export const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/** Nivel de intensidad de un día: 0 = sin entreno, 1-4 = entrenado. */
export type ConsistencyLevel = 0 | 1 | 2 | 3 | 4;

export interface ConsistencyDay {
  /** Fecha local `YYYY-MM-DD`, también la clave de consulta en el DOM. */
  dateKey: string;
  trained: boolean;
  volumeKg: number;
  level: ConsistencyLevel;
  isToday: boolean;
  isFuture: boolean;
  /** Etiqueta corta en español: "lun 15 sep". */
  label: string;
}

export interface ConsistencyWeek {
  startDateKey: string;
  /** Etiqueta de la fila: día/mes del lunes de esa semana, "15/9". */
  label: string;
  days: ConsistencyDay[];
}

export interface ConsistencySummary {
  /** Cuatro semanas, de la más antigua (arriba) a la actual (abajo). */
  weeks: ConsistencyWeek[];
  /** Los 28 días en orden cronológico. */
  days: ConsistencyDay[];
  /** Días con al menos un entreno dentro de la ventana. */
  trainedDays: number;
  /** Días de la ventana ya transcurridos (incluido hoy). */
  elapsedDays: number;
  /** Porcentaje redondeado de días entrenados sobre los transcurridos. */
  consistencyPct: number;
  /** Volumen del día más fuerte de la ventana (referencia de los niveles). */
  maxDayVolumeKg: number;
}

/** Lo mínimo que necesita el cálculo; acepta sesiones reales o de prueba. */
export interface ConsistencySessionLike {
  completed?: boolean | null;
  endTime?: string | null;
  exercises?: Array<{
    sets?: Array<{
      completed?: boolean | null;
      weight?: number | null;
      reps?: number | null;
    }> | null;
  } | null> | null;
}

/** Clave de fecha local `YYYY-MM-DD` (sin pasar por UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Lunes de la semana a la que pertenece `date`, a medianoche local. */
export function startOfWeekMonday(date: Date): Date {
  const day = date.getDay(); // 0 = domingo
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/** Suma días de calendario manteniendo la medianoche local. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Nivel de intensidad de un día entrenado, relativo al día más fuerte de la
 * ventana (mismo espíritu que el mapa de contribuciones de GitHub):
 * menos del 25 % = 1, menos del 50 % = 2, menos del 75 % = 3, el resto = 4.
 * Un día con volumen 0 (peso corporal puro) cuenta como 1: entrenó igual.
 */
export function levelForVolume(
  volumeKg: number,
  maxVolumeKg: number,
): ConsistencyLevel {
  if (!(maxVolumeKg > 0)) return 1;
  const ratio = volumeKg / maxVolumeKg;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/** Volumen de una sesión con la regla de `computeSessionTotals`: solo los
 *  sets completados aportan peso × reps. */
function sessionVolume(session: ConsistencySessionLike): number {
  let volume = 0;
  for (const exercise of session.exercises ?? []) {
    for (const set of exercise?.sets ?? []) {
      if (!set || !set.completed) continue;
      const weight =
        typeof set.weight === "number" && Number.isFinite(set.weight)
          ? set.weight
          : 0;
      const reps =
        typeof set.reps === "number" && Number.isFinite(set.reps) ? set.reps : 0;
      volume += weight * reps;
    }
  }
  return volume;
}

/** Texto descriptivo de una celda, para el tooltip y la accesibilidad. */
export function describeConsistencyDay(day: ConsistencyDay): string {
  if (day.isFuture) return `${day.label}: aún por llegar`;
  if (!day.trained) return `${day.label}: sin entrenar`;
  if (day.volumeKg > 0) {
    return `${day.label}: entrenado · ${formatThousands(day.volumeKg)} kg`;
  }
  return `${day.label}: entrenado (sin peso anotado)`;
}

function formatDayLabel(date: Date): string {
  return `${DIAS_SEMANA_CORTOS[date.getDay()]} ${date.getDate()} ${MESES_CORTOS[date.getMonth()]}`;
}

/**
 * Construye el heatmap de constancia. Ventana: de lunes a domingo, la semana
 * en curso más las 3 anteriores (28 días). Los días posteriores a hoy se
 * marcan como futuros y nunca cuentan como entrenados, aunque hubiera alguna
 * sesión con fecha rara.
 */
export function buildConsistencySummary(
  sessions: ConsistencySessionLike[],
  options: { today?: Date } = {},
): ConsistencySummary {
  const rawToday = options.today ?? new Date();
  const today = new Date(
    rawToday.getFullYear(),
    rawToday.getMonth(),
    rawToday.getDate(),
  );
  const todayKey = toDateKey(today);
  const windowStart = addDays(
    startOfWeekMonday(today),
    -(CONSISTENCY_WEEK_COUNT - 1) * 7,
  );

  // Volumen entrenado por día dentro de la ventana (clave local YYYY-MM-DD).
  const windowStartKey = toDateKey(windowStart);
  const windowEndKey = toDateKey(addDays(windowStart, CONSISTENCY_DAY_COUNT - 1));
  const volumeByDay = new Map<string, number>();

  for (const session of sessions ?? []) {
    if (!session || !session.completed) continue;
    if (typeof session.endTime !== "string") continue;
    const end = new Date(session.endTime);
    if (Number.isNaN(end.getTime())) continue;
    const key = toDateKey(end);
    if (key < windowStartKey || key > windowEndKey) continue;
    volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + sessionVolume(session));
  }

  // Primera pasada: días con entreno y volumen, sin nivel todavía.
  const days: ConsistencyDay[] = [];
  for (let i = 0; i < CONSISTENCY_DAY_COUNT; i++) {
    const date = addDays(windowStart, i);
    const key = toDateKey(date);
    const isFuture = key > todayKey;
    const isToday = key === todayKey;
    const rawVolume = volumeByDay.get(key);
    const trained = !isFuture && rawVolume !== undefined;
    days.push({
      dateKey: key,
      trained,
      volumeKg: trained ? rawVolume : 0,
      level: trained ? 1 : 0,
      isToday,
      isFuture,
      label: formatDayLabel(date),
    });
  }

  // El nivel es relativo al día más fuerte de la ventana; hace falta el
  // máximo antes de poder asignarlo.
  let maxDayVolumeKg = 0;
  for (const day of days) {
    if (day.trained && day.volumeKg > maxDayVolumeKg) {
      maxDayVolumeKg = day.volumeKg;
    }
  }
  for (const day of days) {
    if (day.trained) {
      day.level = levelForVolume(day.volumeKg, maxDayVolumeKg);
    }
  }

  const weeks: ConsistencyWeek[] = [];
  for (let w = 0; w < CONSISTENCY_WEEK_COUNT; w++) {
    const start = addDays(windowStart, w * 7);
    weeks.push({
      startDateKey: toDateKey(start),
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      days: days.slice(w * 7, w * 7 + 7),
    });
  }

  const trainedDays = days.filter((d) => d.trained).length;
  const elapsedDays = days.filter((d) => !d.isFuture).length;
  const consistencyPct =
    elapsedDays > 0 ? Math.round((trainedDays / elapsedDays) * 100) : 0;

  return {
    weeks,
    days,
    trainedDays,
    elapsedDays,
    consistencyPct,
    maxDayVolumeKg,
  };
}
