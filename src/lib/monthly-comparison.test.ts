import { describe, it, expect } from "vitest";
import {
  buildMonthlyComparison,
  compareVolumes,
  describeMonthlyTotal,
  MONTHLY_MAX_PCT_LABEL,
  type MonthlyTrend,
} from "./monthly-comparison";
import type { MuscleSessionLike } from "./muscle-engine";

// La comparativa mensual (F3.4). Lo que se decide sin React: la ventana del
// "mismo tramo" (día 1 → hoy contra día 1 → el mismo día del mes pasado,
// acotado si el mes pasado es más corto), el volumen por grupo muscular con
// la regla única del motor biomecánico, los porcentajes con sus casos límite
// (sin base → "nuevo", sin actividad → fuera de la lista, subida enorme →
// acotada) y el orden de los grupos.
//
// Las fechas se construyen en hora LOCAL a propósito: los entrenos de la
// noche pertenecen al día local del usuario.

/** Sesión completada con un ejercicio y series a una fecha local. */
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
): MuscleSessionLike {
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

describe("compareVolumes — tendencia y etiqueta", () => {
  const cases: Array<[number, number, MonthlyTrend, string]> = [
    [120, 100, "up", "+20 %"],
    [80, 100, "down", "-20 %"],
    [100, 100, "equal", "0 %"],
    [0, 100, "down", "-100 %"],
    [100, 0, "new", "nuevo"],
    [50, 0, "new", "nuevo"],
    [0, 0, "none", ""],
  ];

  for (const [current, previous, trend, label] of cases) {
    it(`${current} vs ${previous} → ${trend} "${label}"`, () => {
      const result = compareVolumes(current, previous);
      expect(result.trend).toBe(trend);
      expect(result.deltaLabel).toBe(label);
    });
  }

  it("acota la etiqueta cuando el porcentaje deja de informar", () => {
    const result = compareVolumes(10000, 1);
    expect(result.trend).toBe("up");
    expect(result.deltaLabel).toBe(`>${MONTHLY_MAX_PCT_LABEL} %`);
  });

  it("redondea los porcentajes pero conserva el signo correcto", () => {
    // 104 vs 100 → +4 %; 96 vs 100 → -4 %
    expect(compareVolumes(104, 100).deltaLabel).toBe("+4 %");
    expect(compareVolumes(96, 100).deltaLabel).toBe("-4 %");
    // 100.4 vs 100 → redondeo a 0 → se trata como igual
    expect(compareVolumes(100.4, 100).trend).toBe("equal");
  });
});

describe("buildMonthlyComparison — ventana mismo tramo", () => {
  // Fijamos el "hoy" en miércoles 8 oct 2026 para que el test sea determinista.
  const TODAY = new Date(2026, 9, 8, 12, 0);

  it("compara el 1–8 oct contra el 1–8 sep y lo dice con fechas reales", () => {
    const result = buildMonthlyComparison([], { today: TODAY });
    expect(result.currentRangeLabel).toBe("1–8 oct");
    expect(result.previousRangeLabel).toBe("1–8 sep");
    expect(result.rangeSummary).toBe("1–8 oct vs 1–8 sep");
  });

  it("cuenta el entreno del mismo tramo del mes pasado en el grupo correcto", () => {
    // 3 sep (dentro del tramo) y 20 sep (fuera: día 20 > 8) — solo cuenta el 3.
    const result = buildMonthlyComparison(
      [
        sessionAt(2026, 8, 3, [{ weight: 50, reps: 10 }]), // 500 kg pecho
        sessionAt(2026, 8, 20, [{ weight: 50, reps: 10 }]), // fuera del tramo
      ],
      { today: TODAY },
    );
    const chest = result.groups.find((g) => g.key === "chest")!;
    expect(chest.previousKg).toBe(500);
    expect(chest.currentKg).toBe(0);
    expect(chest.trend).toBe("down");
    expect(result.previousTotalKg).toBeGreaterThanOrEqual(500);
  });

  it("no compara el mes en curso a medias contra un mes entero (trampa evitada)", () => {
    // El mes pasado, un entreno el día 20 sep NO debe hacer bajar el total.
    const result = buildMonthlyComparison(
      [
        sessionAt(2026, 9, 2, [{ weight: 100, reps: 10 }]), // este mes, día 2
        sessionAt(2026, 8, 20, [{ weight: 300, reps: 10 }]), // fuera del tramo anterior
      ],
      { today: TODAY },
    );
    expect(result.groups.every((g) => g.previousKg === 0)).toBe(true);
    expect(result.totalTrend).toBe("new");
  });

  it("acota el tramo anterior si el mes pasado es más corto (31 mar → feb)", () => {
    const result = buildMonthlyComparison([], { today: new Date(2026, 2, 31, 12, 0) });
    // Febrero acaba el 28: el tramo anterior es 1–28 feb, no 1–31.
    expect(result.previousRangeLabel).toBe("1–28 feb");
    expect(result.currentRangeLabel).toBe("1–31 mar");
  });

  it("con día 1 el tramo es de un solo día por cada lado", () => {
    const result = buildMonthlyComparison([], { today: new Date(2026, 9, 1, 12, 0) });
    expect(result.currentRangeLabel).toBe("1 oct");
    expect(result.previousRangeLabel).toBe("1 sep");
  });

  it("ignora sesiones sin completar, sin fecha o con fecha inválida", () => {
    const result = buildMonthlyComparison(
      [
        { completed: false, endTime: new Date(2026, 9, 2, 18, 0).toISOString() },
        { completed: true, endTime: null },
        { completed: true, endTime: "no-es-una-fecha" },
        sessionAt(2026, 9, 2, [{ weight: 20, reps: 10 }]),
      ],
      { today: TODAY },
    );
    // Solo cuenta la sesión válida: 200 kg de pecho.
    const chest = result.groups.find((g) => g.key === "chest")!;
    expect(chest.currentKg).toBe(200);
  });

  it("sin datos lo dice en claro y no inventa grupos", () => {
    const result = buildMonthlyComparison([], { today: TODAY });
    expect(result.hasData).toBe(false);
    expect(result.groups).toEqual([]);
    expect(result.maxGroupKg).toBe(0);
    expect(describeMonthlyTotal(result)).toBe(
      "Sin entrenamientos en ninguno de los dos tramos",
    );
  });

  it("los grupos se ordenan por lo trabajados que están este mes", () => {
    const result = buildMonthlyComparison(
      [
        sessionAt(2026, 9, 2, [{ weight: 20, reps: 10 }], "curl-biceps", "Curl de Bíceps"), // brazos 290
        sessionAt(2026, 9, 3, [{ weight: 100, reps: 10 }]), // pecho 1000
        sessionAt(2026, 9, 4, [{ weight: 50, reps: 10 }], "sentadilla", "Sentadillas Libres"), // piernas 1225
      ],
      { today: TODAY },
    );
    expect(result.groups.length).toBeGreaterThanOrEqual(4);
    // Piernas (1225, con sinergias) va por delante del pecho (1000).
    expect(result.groups[0].key).toBe("legs");
    expect(result.groups[1].key).toBe("chest");
    // Y el grupo fuerte lleva la barra al máximo (100 %).
    expect(result.groups[0].currentBarPct).toBe(100);
  });

  it("filtra los grupos sin actividad en ninguno de los dos tramos", () => {
    const result = buildMonthlyComparison(
      [sessionAt(2026, 9, 2, [{ weight: 20, reps: 10 }], "curl-biceps", "Curl de Bíceps")],
      { today: TODAY },
    );
    // Solo brazos tiene actividad: los demás grupos no aparecen.
    expect(result.groups.map((g) => g.key)).toEqual(["arms"]);
  });

  it("el total lleva las cifras formateadas y su variación", () => {
    const result = buildMonthlyComparison(
      [
        sessionAt(2026, 9, 2, [{ weight: 500, reps: 10 }]), // este mes: 9500 con sinergias
        sessionAt(2026, 8, 2, [{ weight: 400, reps: 10 }]), // mes pasado: 7600 con sinergias
      ],
      { today: TODAY },
    );
    expect(describeMonthlyTotal(result)).toBe("9.500 kg · +25 %");
  });

  it("una subida enorme no asusta con un número absurdo", () => {
    const result = buildMonthlyComparison(
      [
        sessionAt(2026, 9, 2, [{ weight: 5000, reps: 10 }]),
        sessionAt(2026, 8, 2, [{ weight: 1, reps: 1 }]),
      ],
      { today: TODAY },
    );
    expect(result.totalDeltaPct).toBeGreaterThan(MONTHLY_MAX_PCT_LABEL);
    expect(result.totalDeltaLabel).toBe(`>${MONTHLY_MAX_PCT_LABEL} %`);
  });

  it("la misma regla de volumen que el motor biomecánico (sinergistas al 45 %)", () => {
    // Press de banca con 100 kg × 10: pecho 1000 (primario), tríceps 450 (45 %)
    // y deltoides anterior 450 (45 %) — la definición única del motor.
    const result = buildMonthlyComparison(
      [sessionAt(2026, 9, 2, [{ weight: 100, reps: 10 }])],
      { today: TODAY },
    );
    const chest = result.groups.find((g) => g.key === "chest")!;
    const arms = result.groups.find((g) => g.key === "arms")!;
    const shoulders = result.groups.find((g) => g.key === "shoulders")!;
    expect(chest.currentKg).toBe(1000);
    expect(arms.currentKg).toBe(450);
    expect(shoulders.currentKg).toBe(450);
  });

  it("no explota sin sesiones (undefined o null)", () => {
    expect(buildMonthlyComparison(undefined, { today: TODAY }).hasData).toBe(false);
    expect(buildMonthlyComparison(null, { today: TODAY }).hasData).toBe(false);
  });
});
