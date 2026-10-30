export interface WeightPoint {
  date: string;
  weight: number;
}

export interface WeightPointWithAverage extends WeightPoint {
  average: number;
}

export type WeightTrendStatus = "empty" | "insufficient" | "ready";

export interface WeightTrend {
  status: WeightTrendStatus;
  points: WeightPointWithAverage[];
  current: number | null;
  average7: number | null;
  previousAverage7: number | null;
  weeklyChange: number | null;
  missingPoints: number;
  missingDays: number;
}

export const TREND_WINDOW_DAYS = 7;
export const TREND_MIN_POINTS = 3;
export const TREND_MIN_SPAN_DAYS = 7;

const DAY_MS = 86_400_000;
const SLOPE_WINDOW_DAYS = 28;

interface ParsedPoint extends WeightPoint {
  day: number;
}

function round1(value: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const rounded = (sign * Math.round(Math.abs(value) * 10)) / 10;
  return rounded === 0 ? 0 : rounded;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parsePoint(point: WeightPoint): ParsedPoint | null {
  if (!point || typeof point.date !== "string") return null;
  if (typeof point.weight !== "number" || !Number.isFinite(point.weight) || point.weight <= 0) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(point.date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localNoon = new Date(year, month - 1, day, 12);
  if (
    localNoon.getFullYear() !== year ||
    localNoon.getMonth() !== month - 1 ||
    localNoon.getDate() !== day
  ) {
    return null;
  }

  return {
    date: point.date,
    weight: point.weight,
    // Índice de día en UTC construido desde la fecha local: el cambio de hora
    // no puede convertir 6 días en 5,9 ni en 6,1.
    day: Math.round(Date.UTC(year, month - 1, day) / DAY_MS),
  };
}

function normalizePoints(points: WeightPoint[]): ParsedPoint[] {
  if (!Array.isArray(points)) return [];

  const parsed = points
    .map((point) => parsePoint(point))
    .filter((point): point is ParsedPoint => point !== null);

  return parsed
    .map((point, index) => ({ point, index }))
    .sort((a, b) => a.point.day - b.point.day || a.index - b.index)
    .map(({ point }) => point);
}

function leastSquaresSlopePerDay(window: ParsedPoint[], averages: number[]): number | null {
  const count = window.length;
  if (count < 2) return null;

  const baseDay = window[0].day;
  const xs = window.map((point) => point.day - baseDay);
  const meanX = mean(xs);
  const meanY = mean(averages);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < count; i += 1) {
    const dx = xs[i] - meanX;
    numerator += dx * (averages[i] - meanY);
    denominator += dx * dx;
  }

  if (denominator === 0) return null;
  return numerator / denominator;
}

export function buildWeightTrend(points: WeightPoint[]): WeightTrend {
  const parsed = normalizePoints(points);

  if (parsed.length === 0) {
    return {
      status: "empty",
      points: [],
      current: null,
      average7: null,
      previousAverage7: null,
      weeklyChange: null,
      missingPoints: TREND_MIN_POINTS,
      missingDays: TREND_MIN_SPAN_DAYS,
    };
  }

  // Media de ventana de calendario por cada pesaje (sin redondear todavía).
  const rawAverages = parsed.map((point) => {
    const windowWeights = parsed
      .filter(
        (candidate) =>
          candidate.day >= point.day - (TREND_WINDOW_DAYS - 1) && candidate.day <= point.day,
      )
      .map((candidate) => candidate.weight);
    return mean(windowWeights);
  });

  const trendPoints: WeightPointWithAverage[] = parsed.map((point, index) => ({
    date: point.date,
    weight: point.weight,
    average: round1(rawAverages[index]),
  }));

  const last = parsed[parsed.length - 1];
  const lastDay = last.day;
  const current = last.weight;

  const window7 = parsed.filter(
    (point) => point.day >= lastDay - (TREND_WINDOW_DAYS - 1) && point.day <= lastDay,
  );
  const average7 = round1(mean(window7.map((point) => point.weight)));

  const previousWindow = parsed.filter(
    (point) =>
      point.day >= lastDay - (TREND_WINDOW_DAYS * 2 - 1) &&
      point.day <= lastDay - TREND_WINDOW_DAYS,
  );
  const previousAverage7 =
    previousWindow.length > 0 ? round1(mean(previousWindow.map((point) => point.weight))) : null;

  const slopeWindow = parsed
    .map((point, index) => ({ point, average: rawAverages[index] }))
    .filter(
      ({ point }) =>
        point.day >= lastDay - (SLOPE_WINDOW_DAYS - 1) && point.day <= lastDay,
    );

  let weeklyChange: number | null = null;
  if (slopeWindow.length >= TREND_MIN_POINTS) {
    const firstDay = slopeWindow[0].point.day;
    const lastWindowDay = slopeWindow[slopeWindow.length - 1].point.day;
    if (lastWindowDay - firstDay >= TREND_MIN_SPAN_DAYS) {
      const slopePerDay = leastSquaresSlopePerDay(
        slopeWindow.map(({ point }) => point),
        slopeWindow.map(({ average }) => average),
      );
      if (slopePerDay !== null) weeklyChange = round1(slopePerDay * 7);
    }
  }

  const distinctDays = new Set(parsed.map((point) => point.day)).size;
  const spanDays = lastDay - parsed[0].day;
  const status: WeightTrendStatus =
    distinctDays >= TREND_MIN_POINTS &&
    spanDays >= TREND_MIN_SPAN_DAYS &&
    weeklyChange !== null
      ? "ready"
      : "insufficient";

  return {
    status,
    points: trendPoints,
    current,
    average7,
    previousAverage7,
    weeklyChange,
    missingPoints: Math.max(0, TREND_MIN_POINTS - distinctDays),
    missingDays: Math.max(0, TREND_MIN_SPAN_DAYS - spanDays),
  };
}

export function formatTrendPending(trend: WeightTrend): string | null {
  if (trend.status === "ready") return null;

  if (trend.status === "empty") {
    return "Aún no hay pesajes. La tendencia aparece con 3 pesajes repartidos en una semana.";
  }

  const missingPoints = Math.max(0, trend.missingPoints);
  const missingDays = Math.max(0, trend.missingDays);

  const pointsText =
    missingPoints === 1 ? "1 pesaje" : `${missingPoints} pesajes`;
  const daysText = missingDays === 1 ? "1 día" : `${missingDays} días`;
  const verb = missingPoints === 1 || (missingPoints === 0 && missingDays === 1)
    ? "Falta"
    : "Faltan";

  if (missingPoints > 0 && missingDays > 0) {
    return `${verb} ${pointsText} y ${daysText} para ver la tendencia.`;
  }
  if (missingPoints > 0) {
    return `${verb} ${pointsText} para ver la tendencia.`;
  }
  if (missingDays > 0) {
    return `${verb} ${daysText} para ver la tendencia.`;
  }

  return "Faltan pesajes recientes para ver la tendencia.";
}

export interface WeightGoalProgress {
  targetKg: number;
  remainingKg: number;
  direction: "lose" | "gain" | "keep";
  weeksToGoal: number | null;
  reached: boolean;
}

export function computeGoalProgress(
  trend: WeightTrend,
  targetKg: number | null,
): WeightGoalProgress | null {
  if (trend.status !== "ready" || trend.average7 === null) return null;
  if (
    targetKg === null ||
    typeof targetKg !== "number" ||
    !Number.isFinite(targetKg) ||
    targetKg < 30 ||
    targetKg > 250
  ) {
    return null;
  }

  const remainingKg = round1(trend.average7 - targetKg);
  const direction: WeightGoalProgress["direction"] =
    Math.abs(remainingKg) <= 0.2 ? "keep" : remainingKg > 0 ? "lose" : "gain";
  const reached = direction === "keep";

  let weeksToGoal: number | null = null;
  const weeklyChange = trend.weeklyChange;
  if (weeklyChange !== null) {
    if (direction === "lose" && weeklyChange <= -0.05) {
      weeksToGoal = Math.max(1, Math.round(remainingKg / -weeklyChange));
    } else if (direction === "gain" && weeklyChange >= 0.05) {
      weeksToGoal = Math.max(1, Math.round(-remainingKg / weeklyChange));
    }
  }

  return {
    targetKg,
    remainingKg,
    direction,
    weeksToGoal,
    reached,
  };
}

export function formatKg(value: number): string {
  const rounded = round1(value);
  return rounded.toFixed(1).replace(".", ",");
}

export function formatWeeklyChange(kgPerWeek: number): string {
  if (!Number.isFinite(kgPerWeek) || Math.abs(kgPerWeek) < 0.05) {
    return "Estable (±0,1 kg)";
  }
  if (kgPerWeek < 0) {
    return `Bajando ${formatKg(Math.abs(kgPerWeek))} kg por semana`;
  }
  return `Subiendo ${formatKg(kgPerWeek)} kg por semana`;
}
