// FORTIXAM — gráfica de récords (F3.3): 1RM estimado por ejercicio.
//
// La mejora del día: ver cómo evoluciona el 1RM estimado de cada ejercicio a
// lo largo del tiempo y la semana exacta en la que se batió el récord vigente.
// Antes solo existía el valor más reciente (aviso de "nuevo récord" durante el
// entreno); la evolución y la fecha del récord solo se podían reconstruir a
// mano desde el historial.
//
// La estimación usa la definición única de la app (Epley, `metrics.ts`) y se
// matiza cuando la serie del récord pasó de 12 repeticiones, el punto donde la
// fórmula deja de ser fiable (`isOneRmReliable`) — el mismo patrón que usan
// las apps de referencia (Strong y Hevy muestran la curva de 1RM por
// ejercicio con ese matiz).
//
// Todo lo que se puede decidir sin React vive aquí, para probarlo sin móvil:
// qué ejercicios entran, el mejor 1RM de cada jornada, cuándo se batió el
// récord, la semana de ese récord y la geometría del gráfico. Las fechas se
// agrupan en hora LOCAL del dispositivo (misma regla que F3.2: un entreno a
// las 23:30 pertenece a ese día, no al siguiente por el desfase con UTC).

import { estimate1RM, isOneRmReliable } from "./metrics";
import { formatThousands } from "./share-summary";
import { MESES_CORTOS, startOfWeekMonday, toDateKey } from "./consistency";

/** Puntos que dibuja el gráfico (los últimos registros con datos). */
export const RECORDS_CHART_MAX_POINTS = 12;

/** Lo mínimo que necesita el cálculo; acepta sesiones reales o de prueba. */
export interface RecordsSessionLike {
  completed?: boolean | null;
  endTime?: string | null;
  exercises?: Array<{
    exerciseId?: string | null;
    exerciseName?: string | null;
    sets?: Array<{
      completed?: boolean | null;
      weight?: number | null;
      reps?: number | null;
    }> | null;
  } | null> | null;
}

export interface RecordChartPoint {
  /** Fecha local `YYYY-MM-DD` de la jornada. */
  dateKey: string;
  /** Mejor 1RM estimado de esa jornada (Epley, definición única). */
  best1RM: number;
  /** Peso de la serie que dio ese mejor 1RM. */
  weight: number;
  /** Repeticiones de esa serie. */
  reps: number;
  /** Esa jornada superó la mejor marca anterior. */
  improved: boolean;
  /** Es el récord vigente (la última jornada que superó la marca). */
  isCurrentRecord: boolean;
  /** Etiqueta corta: "22 sep". */
  label: string;
}

export interface RecordsChartGeometryPoint {
  x: number;
  y: number;
  point: RecordChartPoint;
}

export interface RecordsChartGeometry {
  width: number;
  height: number;
  plotTop: number;
  plotBottom: number;
  linePath: string;
  areaPath: string;
  points: RecordsChartGeometryPoint[];
  /** X de la banda vertical del récord (null si no hay puntos). */
  recordX: number | null;
}

export interface ExerciseRecordChart {
  exerciseId: string;
  exerciseName: string;
  /** Puntos mostrados, en orden cronológico (últimos `RECORDS_CHART_MAX_POINTS`). */
  points: RecordChartPoint[];
  /** Jornadas con datos antes de recortar la ventana. */
  totalPoints: number;
  /** Jornada en la que se batió el récord vigente. */
  record: RecordChartPoint;
  /** "semana del 5 oct" — lunes de la semana del récord. */
  recordWeekLabel: string;
  /** El récord se batió con 12 repeticiones o menos (estimación fiable). */
  reliable: boolean;
  /** El punto del récord vigente está dentro de la ventana mostrada. */
  recordInWindow: boolean;
  /** Fecha local de la última jornada con este ejercicio (para ordenar). */
  lastTrainedKey: string;
}

function formatDayShort(date: Date): string {
  return `${date.getDate()} ${MESES_CORTOS[date.getMonth()]}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Texto de una jornada para el tooltip y la accesibilidad de cada punto. */
export function describeRecordPoint(point: RecordChartPoint): string {
  return `${point.label} · ${formatThousands(point.best1RM)} kg estimados (${point.weight} kg × ${point.reps})`;
}

interface DayEntry {
  date: Date;
  weight: number;
  reps: number;
  e1rm: number;
}

/**
 * Construye la evolución de récords de cada ejercicio: un gráfico por
 * ejercicio con series válidas (completadas y con peso y reps anotados).
 * Orden: el que se entrenó más recientemente primero.
 */
export function buildExerciseRecordCharts(
  sessions: RecordsSessionLike[] | null | undefined,
): ExerciseRecordChart[] {
  // Mejor serie de cada jornada (clave local `YYYY-MM-DD`), por ejercicio.
  const perExercise = new Map<
    string,
    {
      name: string;
      nameKey: string;
      lastTrainedKey: string;
      days: Map<string, DayEntry>;
    }
  >();

  for (const session of sessions ?? []) {
    if (!session || !session.completed) continue;
    if (typeof session.endTime !== "string") continue;
    const end = new Date(session.endTime);
    if (Number.isNaN(end.getTime())) continue;
    const dateKey = toDateKey(end);

    for (const exercise of session.exercises ?? []) {
      if (!exercise || typeof exercise.exerciseId !== "string" || !exercise.exerciseId) {
        continue;
      }

      for (const set of exercise.sets ?? []) {
        if (!set || !set.completed) continue;
        const weight =
          typeof set.weight === "number" && Number.isFinite(set.weight) ? set.weight : 0;
        const reps =
          typeof set.reps === "number" && Number.isFinite(set.reps) ? set.reps : 0;
        if (weight <= 0 || reps <= 0) continue;
        const e1rm = estimate1RM(weight, reps);
        if (e1rm <= 0) continue;

        let entry = perExercise.get(exercise.exerciseId);
        if (!entry) {
          entry = {
            name: exercise.exerciseName || exercise.exerciseId,
            nameKey: dateKey,
            lastTrainedKey: dateKey,
            days: new Map(),
          };
          perExercise.set(exercise.exerciseId, entry);
        }
        // El nombre más reciente gana (la rutina puede renombrarse).
        if (
          typeof exercise.exerciseName === "string" &&
          exercise.exerciseName &&
          dateKey >= entry.nameKey
        ) {
          entry.name = exercise.exerciseName;
          entry.nameKey = dateKey;
        }
        if (dateKey > entry.lastTrainedKey) entry.lastTrainedKey = dateKey;

        const day = entry.days.get(dateKey);
        if (!day) {
          entry.days.set(dateKey, { date: end, weight, reps, e1rm });
        } else if (e1rm > day.e1rm) {
          day.weight = weight;
          day.reps = reps;
          day.e1rm = e1rm;
        }
      }
    }
  }

  const charts: ExerciseRecordChart[] = [];

  for (const [exerciseId, entry] of perExercise) {
    const ordered = [...entry.days.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([, day]) => day);

    // Recorrido cronológico: cada jornada que supera la marca anterior la
    // bate; un empate no cuenta como récord (la semana señalada es la primera
    // vez que se alcanzó la marca vigente).
    let runningMax = 0;
    const points: RecordChartPoint[] = ordered.map((day) => {
      const improved = day.e1rm > runningMax;
      if (improved) runningMax = day.e1rm;
      return {
        dateKey: toDateKey(day.date),
        best1RM: day.e1rm,
        weight: day.weight,
        reps: day.reps,
        improved,
        isCurrentRecord: false,
        label: formatDayShort(day.date),
      };
    });

    const record = [...points].reverse().find((p) => p.improved) ?? points[points.length - 1];
    record.isCurrentRecord = true;

    const trimmed = points.slice(-RECORDS_CHART_MAX_POINTS);
    charts.push({
      exerciseId,
      exerciseName: entry.name,
      points: trimmed,
      totalPoints: points.length,
      record,
      recordWeekLabel: `semana del ${formatDayShort(startOfWeekMonday(dateFromKey(record.dateKey)))}`,
      reliable: isOneRmReliable(record.reps),
      recordInWindow: trimmed.some((p) => p.isCurrentRecord),
      lastTrainedKey: entry.lastTrainedKey,
    });
  }

  return charts.sort((a, b) => {
    if (a.lastTrainedKey !== b.lastTrainedKey) {
      return a.lastTrainedKey < b.lastTrainedKey ? 1 : -1;
    }
    return a.exerciseName.localeCompare(b.exerciseName, "es");
  });
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

/**
 * Geometría del gráfico (trazos y posiciones) para que la componente solo
 * pinte: cada punto va en su x proporcional y cuanto mayor es el 1RM, más
 * arriba queda. Con un solo punto, va centrado; con valores planos, a media
 * altura (ni pegado al borde superior ni al inferior).
 */
export function buildRecordsChartGeometry(
  points: RecordChartPoint[],
  options: { width?: number; height?: number } = {},
): RecordsChartGeometry {
  const width = options.width ?? 344;
  const height = options.height ?? 128;
  const pad = { top: 16, right: 16, bottom: 14, left: 16 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const plotTop = pad.top;
  const plotBottom = pad.top + chartH;

  if (points.length === 0) {
    return {
      width,
      height,
      plotTop,
      plotBottom,
      linePath: "",
      areaPath: "",
      points: [],
      recordX: null,
    };
  }

  const values = points.map((p) => p.best1RM);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = max === min;
  const range = Math.max(4, max - min);

  const toX = (idx: number) =>
    points.length <= 1
      ? pad.left + chartW / 2
      : pad.left + (idx / (points.length - 1)) * chartW;
  const toY = (value: number) =>
    flat
      ? pad.top + chartH / 2
      : pad.top + chartH - ((value - (min - range * 0.2)) / (range * 1.4)) * chartH;

  const geometryPoints: RecordsChartGeometryPoint[] = points.map((point, idx) => ({
    x: toX(idx),
    y: toY(point.best1RM),
    point,
  }));

  const linePath = smoothPath(geometryPoints);
  const first = geometryPoints[0];
  const last = geometryPoints[geometryPoints.length - 1];
  const areaPath =
    geometryPoints.length >= 2
      ? `${linePath} L ${last.x},${plotBottom} L ${first.x},${plotBottom} Z`
      : "";

  const recordPoint = geometryPoints.find((g) => g.point.isCurrentRecord) ?? null;

  return {
    width,
    height,
    plotTop,
    plotBottom,
    linePath,
    areaPath,
    points: geometryPoints,
    recordX: recordPoint ? recordPoint.x : null,
  };
}
