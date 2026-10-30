import { describe, it, expect } from "vitest";
import {
  buildWeightTrend,
  computeGoalProgress,
  formatKg,
  formatTrendPending,
  formatWeeklyChange,
  TREND_MIN_POINTS,
  TREND_MIN_SPAN_DAYS,
  TREND_WINDOW_DAYS,
  type WeightPoint,
} from "./weight-trend";

// Tendencia de peso y objetivo (F8.2). Todo lo que se decide sin React: la
// media de ventana de calendario, la pendiente de las últimas cuatro semanas y
// la traducción a "faltan X pesajes / Y días" y "faltan Z kg".

function isoDay(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function point(offset: number, weight: number): WeightPoint {
  return { date: isoDay(offset), weight };
}

/**
 * Serie lineal diaria con datos previos suficientes para que todas las medias
 * de los últimos 28 días tengan su ventana completa de 7 días.
 */
function linearSeries(intercept: number, slopePerDay: number): WeightPoint[] {
  const points: WeightPoint[] = [];
  for (let offset = -33; offset <= 0; offset += 1) {
    points.push(point(offset, intercept + slopePerDay * offset));
  }
  return points;
}

/** Serie descendente cuyo último average7 es 74,9 kg. */
function descendingSeries(): WeightPoint[] {
  return linearSeries(74, -0.3);
}

/** Serie ascendente cuyo último average7 es 75,1 kg. */
function ascendingSeries(): WeightPoint[] {
  return linearSeries(76, 0.3);
}

describe("weight-trend — construcción de la tendencia", () => {
  it("devuelve empty sin pesajes", () => {
    const trend = buildWeightTrend([]);
    expect(trend.status).toBe("empty");
    expect(trend.points).toEqual([]);
    expect(trend.current).toBeNull();
    expect(trend.average7).toBeNull();
    expect(trend.previousAverage7).toBeNull();
    expect(trend.weeklyChange).toBeNull();
    expect(trend.missingPoints).toBe(3);
    expect(trend.missingDays).toBe(7);
  });

  it("con un solo pesaje es insuficiente y dice cuánto falta", () => {
    const trend = buildWeightTrend([point(0, 75)]);
    expect(trend.status).toBe("insufficient");
    expect(trend.current).toBe(75);
    expect(trend.missingPoints).toBe(2);
    expect(trend.missingDays).toBe(7);
    expect(formatTrendPending(trend)).toBe(
      "Faltan 2 pesajes y 7 días para ver la tendencia.",
    );
  });

  it("tres pesajes el mismo día no suman días distintos", () => {
    const trend = buildWeightTrend([
      point(0, 80),
      point(0, 81),
      point(0, 79),
    ]);
    expect(trend.status).toBe("insufficient");
    expect(trend.missingPoints).toBe(2);
    expect(trend.missingDays).toBe(7);
    // Los tres pesajes sí cuentan en la media de la ventana.
    expect(trend.points[0].average).toBe(80);
  });

  it("dos pesajes separados 10 días solo necesitan un pesaje más", () => {
    const trend = buildWeightTrend([point(-10, 80), point(0, 78)]);
    expect(trend.status).toBe("insufficient");
    expect(trend.missingPoints).toBe(1);
    expect(trend.missingDays).toBe(0);
    expect(formatTrendPending(trend)).toBe(
      "Falta 1 pesaje para ver la tendencia.",
    );
  });

  it("tres pesajes repartidos una semana ya son tendencia", () => {
    const trend = buildWeightTrend([
      point(-7, 81),
      point(-3, 80),
      point(0, 79),
    ]);
    expect(trend.status).toBe("ready");
    expect(trend.weeklyChange).not.toBeNull();
    expect(trend.missingPoints).toBe(0);
    expect(trend.missingDays).toBe(0);
    expect(formatTrendPending(trend)).toBeNull();
  });

  it("la media usa la ventana de calendario y no los últimos registros", () => {
    // El pesaje de hace 8 días queda fuera de la ventana del último (hoy).
    const trend = buildWeightTrend([point(-8, 100), point(0, 80)]);
    expect(trend.points[trend.points.length - 1].average).toBe(80);
    expect(trend.average7).toBe(80);
  });

  it("calcula previousAverage7 con la semana anterior completa", () => {
    const points: WeightPoint[] = [];
    for (let offset = -13; offset <= -7; offset += 1) points.push(point(offset, 80));
    for (let offset = -6; offset <= 0; offset += 1) points.push(point(offset, 78));

    const trend = buildWeightTrend(points);
    expect(trend.average7).toBe(78);
    expect(trend.previousAverage7).toBe(80);
    expect(trend.status).toBe("ready");
  });

  it("previousAverage7 es null cuando no hay semana anterior", () => {
    const points: WeightPoint[] = [];
    for (let offset = -6; offset <= 0; offset += 1) points.push(point(offset, 78));

    const trend = buildWeightTrend(points);
    expect(trend.previousAverage7).toBeNull();
    // Sin una semana completa todavía no hay tendencia lista.
    expect(trend.status).toBe("insufficient");
  });

  it("calcula una pendiente negativa en kg por semana", () => {
    const trend = buildWeightTrend(descendingSeries());
    expect(trend.weeklyChange).toBeCloseTo(-2.1, 1);
    expect(formatWeeklyChange(trend.weeklyChange as number)).toBe(
      "Bajando 2,1 kg por semana",
    );
  });

  it("calcula una pendiente positiva en kg por semana", () => {
    const trend = buildWeightTrend(ascendingSeries());
    expect(trend.weeklyChange).toBeCloseTo(2.1, 1);
    expect(formatWeeklyChange(trend.weeklyChange as number)).toBe(
      "Subiendo 2,1 kg por semana",
    );
  });

  it("una serie plana da cambio semanal cero", () => {
    const trend = buildWeightTrend(linearSeries(75, 0));
    expect(trend.weeklyChange).toBe(0);
    expect(formatWeeklyChange(trend.weeklyChange as number)).toBe(
      "Estable (±0,1 kg)",
    );
  });

  it("redondea las medias a un decimal al devolverlas", () => {
    const trend = buildWeightTrend([point(-1, 74.7), point(0, 74.8)]);
    expect(trend.average7).toBe(74.8);
    expect(trend.points[1].average).toBe(74.8);
  });

  it("ordena los pesajes desordenados de forma ascendente", () => {
    const trend = buildWeightTrend([
      point(0, 79),
      point(-10, 81),
      point(-4, 80),
    ]);
    const dates = trend.points.map((item) => item.date);
    expect([...dates].sort()).toEqual(dates);
    expect(trend.current).toBe(79);
  });

  it("ignora pesos no finitos o no positivos", () => {
    const trend = buildWeightTrend([
      point(-8, 80),
      point(-8, Number.NaN),
      point(-4, Number.POSITIVE_INFINITY),
      point(-4, 0),
      point(-4, -70),
      point(0, 79),
    ]);
    expect(trend.points).toHaveLength(2);
    expect(trend.points.map((item) => item.weight)).toEqual([80, 79]);
  });

  it("con todo inválido se comporta como vacío", () => {
    const trend = buildWeightTrend([
      { date: "no-es-fecha", weight: 80 },
      point(0, Number.NaN),
    ]);
    expect(trend.status).toBe("empty");
  });

  it("las constantes públicas describen la ventana mínima", () => {
    expect(TREND_WINDOW_DAYS).toBe(7);
    expect(TREND_MIN_POINTS).toBe(3);
    expect(TREND_MIN_SPAN_DAYS).toBe(7);
  });
});

describe("weight-trend — textos pendientes", () => {
  it("empty explica cuándo aparece la tendencia", () => {
    expect(formatTrendPending(buildWeightTrend([]))).toBe(
      "Aún no hay pesajes. La tendencia aparece con 3 pesajes repartidos en una semana.",
    );
  });

  it("usa singular cuando falta un pesaje y un día", () => {
    const trend = buildWeightTrend([point(-6, 80), point(0, 79)]);
    expect(formatTrendPending(trend)).toBe(
      "Falta 1 pesaje y 1 día para ver la tendencia.",
    );
  });

  it("usa plural cuando faltan varios pesajes y días", () => {
    const trend = buildWeightTrend([point(0, 80)]);
    expect(formatTrendPending(trend)).toBe(
      "Faltan 2 pesajes y 7 días para ver la tendencia.",
    );
  });

  it("menciona solo los días cuando ya hay pesajes suficientes", () => {
    const trend = buildWeightTrend([
      point(-2, 81),
      point(-1, 80),
      point(0, 79),
    ]);
    expect(trend.missingPoints).toBe(0);
    expect(formatTrendPending(trend)).toBe(
      "Faltan 5 días para ver la tendencia.",
    );
  });
});

describe("weight-trend — objetivo", () => {
  it("calcula cuánto falta para bajar y las semanas a ese ritmo", () => {
    const trend = buildWeightTrend(descendingSeries());
    const goal = computeGoalProgress(trend, 70);
    expect(goal).not.toBeNull();
    expect(goal?.direction).toBe("lose");
    expect(goal?.remainingKg).toBe(4.9);
    expect(goal?.weeksToGoal).toBe(2);
    expect(goal?.reached).toBe(false);
  });

  it("calcula cuánto falta para subir y las semanas a ese ritmo", () => {
    const trend = buildWeightTrend(ascendingSeries());
    const goal = computeGoalProgress(trend, 80);
    expect(goal?.direction).toBe("gain");
    expect(goal?.remainingKg).toBe(-4.9);
    expect(goal?.weeksToGoal).toBe(2);
  });

  it("considera alcanzado el objetivo dentro de ±0,2 kg", () => {
    const trend = buildWeightTrend(linearSeries(75, 0));
    const goal = computeGoalProgress(trend, trend.average7 as number);
    expect(goal?.direction).toBe("keep");
    expect(goal?.reached).toBe(true);
    expect(goal?.weeksToGoal).toBeNull();
  });

  it("devuelve null si la tendencia no está lista", () => {
    expect(computeGoalProgress(buildWeightTrend([point(0, 80)]), 75)).toBeNull();
  });

  it("rechaza objetivos fuera de 30–250 o no finitos", () => {
    const trend = buildWeightTrend(linearSeries(75, 0));
    expect(computeGoalProgress(trend, 20)).toBeNull();
    expect(computeGoalProgress(trend, 300)).toBeNull();
    expect(computeGoalProgress(trend, Number.NaN)).toBeNull();
    expect(computeGoalProgress(trend, null)).toBeNull();
    expect(computeGoalProgress(trend, 75)).not.toBeNull();
  });

  it("no estima semanas si el peso va en dirección contraria", () => {
    const bajando = buildWeightTrend(descendingSeries());
    expect(computeGoalProgress(bajando, 85)?.weeksToGoal).toBeNull();

    const subiendo = buildWeightTrend(ascendingSeries());
    expect(computeGoalProgress(subiendo, 65)?.weeksToGoal).toBeNull();
  });
});

describe("weight-trend — formato", () => {
  it("formatKg usa coma decimal y un decimal", () => {
    expect(formatKg(74.84)).toBe("74,8");
    expect(formatKg(75)).toBe("75,0");
    expect(formatKg(-1.25)).toBe("-1,3");
  });

  it("formatWeeklyChange distingue bajar, subir y estable", () => {
    expect(formatWeeklyChange(-0.3)).toBe("Bajando 0,3 kg por semana");
    expect(formatWeeklyChange(0.2)).toBe("Subiendo 0,2 kg por semana");
    expect(formatWeeklyChange(0)).toBe("Estable (±0,1 kg)");
    expect(formatWeeklyChange(0.04)).toBe("Estable (±0,1 kg)");
    expect(formatWeeklyChange(-0.04)).toBe("Estable (±0,1 kg)");
  });
});
