import { describe, it, expect } from "vitest";
import {
  buildExerciseRecordCharts,
  buildRecordsChartGeometry,
  describeRecordPoint,
  RECORDS_CHART_MAX_POINTS,
  type RecordsSessionLike,
} from "./records-chart";

// La gráfica de récords (F3.3). Lo que se decide sin React: qué ejercicios
// entran, el mejor 1RM de cada jornada (definición única de metrics.ts), la
// semana en que se batió el récord vigente, el matiz de fiabilidad por
// repeticiones, el orden y la geometría del gráfico.
//
// Las fechas se construyen en hora LOCAL a propósito: los entrenos de la
// noche pertenecen al día local del usuario.

/** Sesión completada con un ejercicio y una serie a una fecha local. */
function sessionAt(
  year: number,
  month: number,
  day: number,
  sets: Array<{ weight: number; reps: number; completed?: boolean }> = [
    { weight: 60, reps: 10 },
  ],
  exerciseId = "press-banca",
  exerciseName = "Press de Banca Plano",
  hour = 18,
): RecordsSessionLike {
  return {
    completed: true,
    endTime: new Date(year, month, day, hour, 30).toISOString(),
    exercises: [
      {
        exerciseId,
        exerciseName,
        sets: sets.map((s) => ({ completed: s.completed ?? true, ...s })),
      },
    ],
  };
}

describe("records-chart — evolución de 1RM por ejercicio", () => {
  it("agrupa por ejercicio y calcula el mejor 1RM de cada jornada", () => {
    const charts = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [
        { weight: 60, reps: 10 }, // 80
        { weight: 70, reps: 6 }, // 84 ← mejor
      ]),
      sessionAt(2026, 8, 21, [{ weight: 75, reps: 5 }]), // 88 ← mejor
    ]);

    expect(charts).toHaveLength(1);
    const chart = charts[0];
    expect(chart.exerciseId).toBe("press-banca");
    expect(chart.exerciseName).toBe("Press de Banca Plano");
    expect(chart.points.map((p) => p.best1RM)).toEqual([84, 88]);
    expect(chart.points[0].weight).toBe(70);
    expect(chart.points[0].reps).toBe(6);
  });

  it("ignora series no completadas, sin peso o sin reps — y sesiones sin terminar", () => {
    const charts = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [
        { weight: 100, reps: 5, completed: false }, // no completada
        { weight: 0, reps: 10 }, // sin peso
        { weight: 60, reps: 0 }, // sin reps
        { weight: 50, reps: 10 }, // 67 ← única válida
      ]),
      { ...sessionAt(2026, 8, 15, [{ weight: 90, reps: 5 }]), completed: false },
    ]);

    expect(charts).toHaveLength(1);
    expect(charts[0].points.map((p) => p.best1RM)).toEqual([67]);
  });

  it("marca la jornada y la semana en que se batió el récord vigente", () => {
    // Lunes 7 sep: 80 · miércoles 9 sep: 84 (récord) · lunes 21 sep: 80 (no)
    // miércoles 23 sep: 88 (récord) · luego vuelve a bajar y no lo iguala.
    const charts = buildExerciseRecordCharts([
      sessionAt(2026, 8, 7, [{ weight: 60, reps: 10 }]), // 80
      sessionAt(2026, 8, 9, [{ weight: 70, reps: 6 }]), // 84 ← récord
      sessionAt(2026, 8, 21, [{ weight: 65, reps: 7 }]), // 80
      sessionAt(2026, 8, 23, [{ weight: 75, reps: 5 }]), // 88 ← récord vigente
      sessionAt(2026, 8, 30, [{ weight: 80, reps: 4 }]), // 91 ← récord vigente
    ]);

    const chart = charts[0];
    expect(chart.points.map((p) => p.improved)).toEqual([true, true, false, true, true]);
    expect(chart.record.best1RM).toBe(91);
    expect(chart.record.dateKey).toBe("2026-09-30");
    // El 30 sep 2026 es miércoles → la semana empieza el lunes 28 sep.
    expect(chart.recordWeekLabel).toBe("semana del 28 sep");
    expect(chart.points[chart.points.length - 1].isCurrentRecord).toBe(true);
    expect(chart.points[0].isCurrentRecord).toBe(false);
  });

  it("mantiene el récord anterior si la marca nueva lo empata (no hay empates como récord)", () => {
    const charts = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [{ weight: 60, reps: 10 }]), // 80 ← récord
      sessionAt(2026, 8, 16, [{ weight: 40, reps: 15 }]), // 60
      sessionAt(2026, 8, 21, [{ weight: 60, reps: 10 }]), // 80 (empate)
    ]);

    const chart = charts[0];
    expect(chart.points.map((p) => p.improved)).toEqual([true, false, false]);
    expect(chart.record.dateKey).toBe("2026-09-14");
    expect(chart.recordWeekLabel).toBe("semana del 14 sep");
  });

  it("marca el récord como no fiable si se batió con más de 12 repeticiones", () => {
    const fiable = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [{ weight: 80, reps: 10 }]),
    ])[0];
    expect(fiable.reliable).toBe(true);

    const noFiable = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [{ weight: 40, reps: 15 }]),
    ])[0];
    expect(noFiable.reliable).toBe(false);
  });

  it("ordena por último entrenamiento (más reciente primero) y desempata por nombre", () => {
    const charts = buildExerciseRecordCharts([
      sessionAt(2026, 8, 14, [{ weight: 60, reps: 10 }], "curl-biceps", "Curl de Bíceps"),
      sessionAt(2026, 8, 20, [{ weight: 30, reps: 12 }], "press-militar", "Press Militar"),
      sessionAt(2026, 8, 20, [{ weight: 50, reps: 8 }], "remo-mancuerna", "Remo con Mancuerna"),
    ]);

    expect(charts.map((c) => c.exerciseId)).toEqual([
      "press-militar",
      "remo-mancuerna",
      "curl-biceps",
    ]);
  });

  it("recorta a los últimos puntos y lo deja saber con totalPoints", () => {
    const sessions = Array.from({ length: 15 }, (_, i) =>
      sessionAt(2026, 7, 1 + i, [{ weight: 60 + i, reps: 8 }]),
    );
    const chart = buildExerciseRecordCharts(sessions)[0];

    expect(chart.points).toHaveLength(RECORDS_CHART_MAX_POINTS);
    expect(chart.totalPoints).toBe(15);
    expect(chart.points[0].best1RM).toBe(estimateFor(63));
  });

  it("sin datos no inventa gráficos", () => {
    expect(buildExerciseRecordCharts([])).toEqual([]);
    expect(buildExerciseRecordCharts(null)).toEqual([]);
    expect(buildExerciseRecordCharts(undefined)).toEqual([]);
  });

  it("describe cada punto con su fecha, kilos y la serie real", () => {
    const chart = buildExerciseRecordCharts([
      sessionAt(2026, 8, 22, [{ weight: 75, reps: 5 }]),
    ])[0];

    expect(describeRecordPoint(chart.record)).toBe(
      "22 sep · 88 kg estimados (75 kg × 5)",
    );
  });
});

/** Epley, la misma definición de la app: w × (1 + r/30) redondeado. */
function estimateFor(weight: number, reps = 8): number {
  return Math.round(weight * (1 + reps / 30));
}

describe("records-chart — geometría del gráfico", () => {
  function chartPoint(day: number, best1RM: number): Parameters<
    typeof buildRecordsChartGeometry
  >[0][number] {
    return {
      dateKey: `2026-09-${String(day).padStart(2, "0")}`,
      best1RM,
      weight: 60,
      reps: 10,
      improved: true,
      isCurrentRecord: false,
      label: `${day} sep`,
    };
  }

  it("coloca cada punto proporcional en x y el mejor 1RM arriba en y", () => {
    const points = [chartPoint(7, 80), chartPoint(14, 90), chartPoint(21, 85)];
    const geo = buildRecordsChartGeometry(points, { width: 300, height: 120 });

    expect(geo.points).toHaveLength(3);
    // Mismo espacio entre puntos consecutivos.
    const dx1 = geo.points[1].x - geo.points[0].x;
    const dx2 = geo.points[2].x - geo.points[1].x;
    expect(Math.abs(dx1 - dx2)).toBeLessThan(0.01);
    // 90 kg → el más alto (y menor); 80 kg → por encima de 85.
    expect(geo.points[1].y).toBeLessThan(geo.points[2].y);
    expect(geo.points[2].y).toBeLessThan(geo.points[0].y);
    // Los trazos existen y el área cierra por abajo.
    expect(geo.linePath.startsWith("M ")).toBe(true);
    expect(geo.areaPath.endsWith("Z")).toBe(true);
  });

  it("con un solo punto lo centra y no dibuja área", () => {
    const geo = buildRecordsChartGeometry([chartPoint(7, 80)], { width: 300, height: 120 });
    expect(geo.points).toHaveLength(1);
    expect(geo.points[0].x).toBeCloseTo(150, 0);
    expect(geo.areaPath).toBe("");
  });

  it("con valores planos no pega la línea a los bordes", () => {
    const geo = buildRecordsChartGeometry(
      [chartPoint(7, 80), chartPoint(14, 80)],
      { width: 300, height: 120 },
    );
    for (const p of geo.points) {
      expect(p.y).toBeGreaterThan(10);
      expect(p.y).toBeLessThan(110);
    }
  });

  it("localiza la banda del récord en x del punto vigente", () => {
    const points = [
      { ...chartPoint(7, 80), improved: true },
      { ...chartPoint(14, 90), improved: true, isCurrentRecord: true },
      { ...chartPoint(21, 85), improved: false },
    ];
    const geo = buildRecordsChartGeometry(points, { width: 300, height: 120 });
    expect(geo.recordX).not.toBeNull();
    expect(geo.recordX).toBeCloseTo(geo.points[1].x, 5);
  });

  it("sin puntos devuelve geometría vacía, sin romper", () => {
    const geo = buildRecordsChartGeometry([]);
    expect(geo.points).toEqual([]);
    expect(geo.linePath).toBe("");
    expect(geo.recordX).toBeNull();
  });
});
