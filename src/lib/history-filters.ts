// FORTIXAM — filtros del historial (F8.1): por grupo muscular, además del
// periodo y el modo que ya existían.
//
// La pregunta que resuelve: «¿cuántas veces he entrenado pierna este mes?».
// Hasta ahora el historial solo se podía filtrar por semana/mes y por modo, así
// que encontrar los días de un grupo obligaba a abrir las sesiones una a una.
//
// Reglas de la casa:
// - El grupo de una sesión sale del MISMO motor biomecánico que ilumina el
//   visor 3D y alimenta la comparativa mensual (`muscle-engine.ts`): un
//   ejercicio cuenta por sus músculos PRIMARIOS, no por los sinergistas. Un día
//   de press banca es de pecho, aunque el tríceps también trabaje; si contasen
//   los secundarios, casi todas las sesiones serían de casi todos los grupos.
// - Solo cuentan ejercicios con al menos una serie registrada: un ejercicio
//   añadido a la sesión y nunca empezado no es «haber entrenado» ese grupo.
// - El nombre guardado en la sesión manda sobre el catálogo (una rutina
//   retirada o un ejercicio personalizado deben seguir contando); si no hay
//   nombre, se cae al catálogo por id, como hace el motor.
// - El periodo es móvil (últimos 7 / 30 días) y en hora del dispositivo, igual
//   que el filtro que ya tenía la pantalla: no se cambia lo que el usuario ya
//   conocía.

import { getExerciseById } from "./data";
import {
  accumulateMuscleStats,
  aggregateMajorGroups,
  MAJOR_GROUPS,
  MUSCLE_METADATA,
  getExerciseBiomechanics,
  type MajorGroupKey,
  type MuscleSessionLike,
} from "./muscle-engine";
import type { TrainingMode } from "./types";

/** Periodo del historial; «all» es todo el registro. */
export type HistoryPeriod = "all" | "week" | "month";

/** Días móviles de cada periodo (los mismos que usaba la pantalla). */
export const HISTORY_PERIOD_DAYS: Record<Exclude<HistoryPeriod, "all">, number> = {
  week: 7,
  month: 30,
};

export interface HistoryFilters {
  mode: TrainingMode | "all";
  period: HistoryPeriod;
  group: MajorGroupKey | "all";
}

/**
 * Lo mínimo que necesita el filtro: la sesión real (`WorkoutSession`) encaja
 * tal cual, y las pruebas pueden pasar objetos pequeños.
 */
export interface HistorySessionLike extends MuscleSessionLike {
  mode?: TrainingMode | string | null;
  startTime?: string | null;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  mode: "all",
  period: "all",
  group: "all",
};

/** Grupos mayores con su nombre y color, en el orden canónico de la app. */
export const HISTORY_GROUPS = MAJOR_GROUPS;

/**
 * Grupos musculares que trabajó una sesión, mirando solo los músculos
 * primarios de cada ejercicio con series registradas. Orden canónico.
 */
export function sessionMajorGroups(
  session: MuscleSessionLike | null | undefined,
): MajorGroupKey[] {
  if (!session) return [];
  const found = new Set<MajorGroupKey>();

  for (const ex of session.exercises ?? []) {
    if (!ex) continue;
    if (!ex.sets || ex.sets.length === 0) continue;

    const catalogEx = ex.exerciseId ? getExerciseById(ex.exerciseId) : undefined;
    const name = ex.exerciseName || catalogEx?.name || ex.exerciseId || "";
    if (!name) continue;

    const biomech = getExerciseBiomechanics(name, catalogEx?.category);
    for (const muscle of biomech.primary) {
      const group = MUSCLE_METADATA[muscle]?.majorGroup;
      if (group) found.add(group);
    }
  }

  return MAJOR_GROUPS.filter((g) => found.has(g.key)).map((g) => g.key);
}

/**
 * ¿La sesión entra en el periodo? Las fechas inválidas solo entran en «todo»:
 * contarlas como «esta semana» sería mentir. El futuro sí cuenta (una sesión
 * recién terminada puede llevar un sello de tiempo ligeramente adelantado).
 */
export function isInHistoryPeriod(
  startTime: string | null | undefined,
  period: HistoryPeriod,
  now: Date = new Date(),
): boolean {
  if (period === "all") return true;
  if (typeof startTime !== "string") return false;
  const when = new Date(startTime);
  if (Number.isNaN(when.getTime())) return false;
  const cutoff = new Date(
    now.getTime() - HISTORY_PERIOD_DAYS[period] * 24 * 60 * 60 * 1000,
  );
  return when >= cutoff;
}

/** ¿La sesión cumple modo + periodo + grupo? (La búsqueda de texto va aparte.) */
export function matchesHistoryFilters(
  session: HistorySessionLike | null | undefined,
  filters: HistoryFilters,
  now: Date = new Date(),
): boolean {
  if (!session) return false;
  if (filters.mode !== "all" && session.mode !== filters.mode) return false;
  if (!isInHistoryPeriod(session.startTime, filters.period, now)) return false;
  if (filters.group !== "all" && !sessionMajorGroups(session).includes(filters.group)) {
    return false;
  }
  return true;
}

/** Filtra una lista conservando el tipo (sesiones reales o de prueba). */
export function filterHistorySessions<T extends HistorySessionLike>(
  sessions: T[] | null | undefined,
  filters: HistoryFilters,
  now: Date = new Date(),
): T[] {
  return (sessions ?? []).filter((s) => matchesHistoryFilters(s, filters, now));
}

/**
 * Resumen corto para la tira del filtro: «3 sesiones · 12.480 kg».
 * El volumen es el efectivo del grupo (primarios 100 %, sinergistas 45 %), la
 * misma cifra que muestran Estadísticas y la comparativa mensual.
 */
export function summarizeGroupFilter(
  sessions: MuscleSessionLike[] | null | undefined,
  group: MajorGroupKey | "all",
): { sessions: number; volumeKg: number } {
  const list = sessions ?? [];
  if (group === "all") return { sessions: list.length, volumeKg: 0 };
  const groups = aggregateMajorGroups(accumulateMuscleStats(list));
  return {
    sessions: list.length,
    volumeKg: groups.find((g) => g.key === group)?.volume ?? 0,
  };
}

/**
 * Reparte los grupos en los que caben en la tarjeta y los que sobran:
 * `{ shown: [{ key, name, color }, …], extra: 2 }`.
 */
export function splitGroupLabels(
  groups: MajorGroupKey[],
  max = 3,
): { shown: Array<{ key: MajorGroupKey; name: string; color: string }>; extra: number } {
  const entries = groups.map((key) => {
    const meta = MAJOR_GROUPS.find((g) => g.key === key);
    return { key, name: meta?.name ?? key, color: meta?.color ?? "#94A3B8" };
  });
  const limit = Math.max(0, Math.floor(max));
  return {
    shown: entries.slice(0, limit),
    extra: Math.max(0, entries.length - limit),
  };
}

/** Color del grupo, para el punto de la tira y de las tarjetas. */
export function groupColor(group: MajorGroupKey | "all"): string {
  return MAJOR_GROUPS.find((g) => g.key === group)?.color ?? "#94A3B8";
}
