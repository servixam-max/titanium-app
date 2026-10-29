import { describe, it, expect } from "vitest";
import {
  EMPTY_HISTORY_FILTERS,
  filterHistorySessions,
  groupColor,
  isInHistoryPeriod,
  matchesHistoryFilters,
  sessionMajorGroups,
  splitGroupLabels,
  summarizeGroupFilter,
  type HistorySessionLike,
} from "./history-filters";

// Filtros del historial (F8.1). Lo que se decide sin React: qué grupos
// musculares trabajó una sesión (solo primarios, con series registradas), si
// entra en el periodo móvil de 7/30 días y si cumple modo + periodo + grupo.

/** Sesión de prueba con los ejercicios indicados, a una fecha local. */
function session(
  exercises: Array<{ id: string; name: string; sets?: number }>,
  options: { mode?: string; daysAgo?: number; completed?: boolean } = {},
): HistorySessionLike & { id: string } {
  const { mode = "individual", daysAgo = 0, completed = true } = options;
  const start = new Date(2026, 9, 20, 18, 0); // 20 oct 2026, hora local
  start.setDate(start.getDate() - daysAgo);
  return {
    id: `s-${daysAgo}-${mode}-${exercises.map((e) => e.id).join("_")}`,
    mode,
    startTime: start.toISOString(),
    completed,
    endTime: new Date(start.getTime() + 45 * 60 * 1000).toISOString(),
    exercises: exercises.map((e) => ({
      exerciseId: e.id,
      exerciseName: e.name,
      sets: Array.from({ length: e.sets ?? 1 }, () => ({
        completed: true,
        weight: 20,
        reps: 10,
      })),
    })),
  };
}

const HOY = new Date(2026, 9, 20, 20, 0); // mismo día que las sesiones sin daysAgo

describe("sessionMajorGroups — qué grupos trabajó una sesión", () => {
  it("press de banca es pecho", () => {
    expect(sessionMajorGroups(session([{ id: "d1-1", name: "Press de Banca Plano" }]))).toEqual([
      "chest",
    ]);
  });

  it("press militar es hombros", () => {
    expect(sessionMajorGroups(session([{ id: "d1-2", name: "Press Militar Sentado" }]))).toEqual([
      "shoulders",
    ]);
  });

  it("curl de bíceps es brazos", () => {
    expect(sessionMajorGroups(session([{ id: "d2-2", name: "Curl de Bíceps Clásico" }]))).toEqual([
      "arms",
    ]);
  });

  it("sentadilla es piernas", () => {
    expect(sessionMajorGroups(session([{ id: "d2-3", name: "Sentadilla Goblet" }]))).toEqual([
      "legs",
    ]);
  });

  it("plancha es core", () => {
    expect(sessionMajorGroups(session([{ id: "d5-7", name: "Plancha Activa" }]))).toEqual([
      "core",
    ]);
  });

  it("los sinergistas no cuentan: un press de banca no es un día de brazos", () => {
    const groups = sessionMajorGroups(session([{ id: "d1-1", name: "Press de Banca Plano" }]));
    expect(groups).not.toContain("arms");
    expect(groups).not.toContain("shoulders");
  });

  it("devuelve los grupos en el orden canónico de la app", () => {
    const groups = sessionMajorGroups(
      session([
        { id: "d2-2", name: "Curl de Bíceps Clásico" },
        { id: "d1-1", name: "Press de Banca Plano" },
        { id: "d1-2", name: "Press Militar Sentado" },
        { id: "d2-3", name: "Sentadilla Goblet" },
      ]),
    );
    expect(groups).toEqual(["chest", "shoulders", "arms", "legs"]);
  });

  it("un ejercicio sin ninguna serie no cuenta como grupo entrenado", () => {
    expect(
      sessionMajorGroups(session([{ id: "d2-3", name: "Sentadilla Goblet", sets: 0 }])),
    ).toEqual([]);
  });

  it("sin ejercicios no hay grupos", () => {
    expect(sessionMajorGroups(null)).toEqual([]);
    expect(sessionMajorGroups({ exercises: [] })).toEqual([]);
    expect(sessionMajorGroups({ exercises: [null] })).toEqual([]);
    expect(sessionMajorGroups({ exercises: [{}] })).toEqual([]);
  });

  it("un ejercicio personalizado cuenta por su nombre aunque no esté en el catálogo", () => {
    expect(
      sessionMajorGroups(session([{ id: "custom-1", name: "Sentadilla Búlgara con Mancuernas" }])),
    ).toEqual(["legs"]);
  });
});

describe("isInHistoryPeriod — ventana móvil de 7 y 30 días", () => {
  it("«todo» acepta cualquier fecha, incluso una inválida", () => {
    expect(isInHistoryPeriod("2020-01-01T10:00:00.000Z", "all", HOY)).toBe(true);
    expect(isInHistoryPeriod("no-es-una-fecha", "all", HOY)).toBe(true);
  });

  it("«semana» incluye lo de hace 3 días y deja fuera lo de hace 8", () => {
    expect(isInHistoryPeriod(session([], { daysAgo: 3 }).startTime, "week", HOY)).toBe(true);
    expect(isInHistoryPeriod(session([], { daysAgo: 8 }).startTime, "week", HOY)).toBe(false);
  });

  it("«mes» incluye lo de hace 29 días y deja fuera lo de hace 31", () => {
    expect(isInHistoryPeriod(session([], { daysAgo: 29 }).startTime, "month", HOY)).toBe(true);
    expect(isInHistoryPeriod(session([], { daysAgo: 31 }).startTime, "month", HOY)).toBe(false);
  });

  it("una fecha inválida no se cuela en «semana» ni en «mes»", () => {
    expect(isInHistoryPeriod("no-es-una-fecha", "week", HOY)).toBe(false);
    expect(isInHistoryPeriod("no-es-una-fecha", "month", HOY)).toBe(false);
    expect(isInHistoryPeriod(undefined, "week", HOY)).toBe(false);
  });
});

describe("matchesHistoryFilters — modo, periodo y grupo a la vez", () => {
  const lunes = session([{ id: "d1-1", name: "Press de Banca Plano" }], {
    mode: "guided",
    daysAgo: 2,
  });
  const pierna = session([{ id: "d2-3", name: "Sentadilla Goblet" }], {
    mode: "individual",
    daysAgo: 10,
  });

  it("sin filtros entra todo", () => {
    expect(matchesHistoryFilters(lunes, EMPTY_HISTORY_FILTERS, HOY)).toBe(true);
    expect(matchesHistoryFilters(pierna, EMPTY_HISTORY_FILTERS, HOY)).toBe(true);
  });

  it("filtra por modo", () => {
    expect(matchesHistoryFilters(lunes, { ...EMPTY_HISTORY_FILTERS, mode: "guided" }, HOY)).toBe(
      true,
    );
    expect(
      matchesHistoryFilters(lunes, { ...EMPTY_HISTORY_FILTERS, mode: "individual" }, HOY),
    ).toBe(false);
  });

  it("filtra por grupo muscular", () => {
    const filters = { ...EMPTY_HISTORY_FILTERS, group: "legs" as const };
    expect(matchesHistoryFilters(pierna, filters, HOY)).toBe(true);
    expect(matchesHistoryFilters(lunes, filters, HOY)).toBe(false);
  });

  it("el periodo se suma al grupo: pierna de hace 10 días no está en «esta semana»", () => {
    expect(
      matchesHistoryFilters(
        pierna,
        { ...EMPTY_HISTORY_FILTERS, group: "legs", period: "week" },
        HOY,
      ),
    ).toBe(false);
    expect(
      matchesHistoryFilters(
        pierna,
        { ...EMPTY_HISTORY_FILTERS, group: "legs", period: "month" },
        HOY,
      ),
    ).toBe(true);
  });

  it("una sesión nula no entra", () => {
    expect(matchesHistoryFilters(null, EMPTY_HISTORY_FILTERS, HOY)).toBe(false);
  });
});

describe("filterHistorySessions — la lista filtrada", () => {
  it("conserva el orden y el tipo de las sesiones", () => {
    const sessions = [
      session([{ id: "d1-1", name: "Press de Banca Plano" }], { daysAgo: 1 }),
      session([{ id: "d2-3", name: "Sentadilla Goblet" }], { daysAgo: 2 }),
      session([{ id: "d1-2", name: "Press Militar Sentado" }], { daysAgo: 40 }),
    ];
    const result = filterHistorySessions(
      sessions,
      { ...EMPTY_HISTORY_FILTERS, period: "month" },
      HOY,
    );
    expect(result.map((s) => s.id)).toEqual([sessions[0].id, sessions[1].id]);
    expect(result[0]).toBe(sessions[0]);
  });

  it("acepta null y undefined sin romper", () => {
    expect(filterHistorySessions(null, EMPTY_HISTORY_FILTERS, HOY)).toEqual([]);
    expect(filterHistorySessions(undefined, EMPTY_HISTORY_FILTERS, HOY)).toEqual([]);
  });
});

describe("summarizeGroupFilter — la tira del filtro", () => {
  const sessions = [
    session([{ id: "d1-1", name: "Press de Banca Plano" }], { daysAgo: 1 }),
    session([{ id: "d1-1", name: "Press de Banca Plano" }], { daysAgo: 2 }),
  ];

  it("cuenta las sesiones y suma el volumen efectivo del grupo", () => {
    const { sessions: count, volumeKg } = summarizeGroupFilter(sessions, "chest");
    expect(count).toBe(2);
    // 2 sesiones × 1 serie × 20 kg × 10 reps = 400 kg de pecho
    expect(volumeKg).toBe(400);
  });

  it("las sesiones sin completar no suman volumen, pero sí aparecen contadas", () => {
    const mixed = [
      session([{ id: "d1-1", name: "Press de Banca Plano" }], { daysAgo: 1 }),
      session([{ id: "d1-1", name: "Press de Banca Plano" }], {
        daysAgo: 2,
        completed: false,
      }),
    ];
    expect(summarizeGroupFilter(mixed, "chest")).toEqual({ sessions: 2, volumeKg: 200 });
  });

  it("sin grupo seleccionado no hay volumen que enseñar", () => {
    expect(summarizeGroupFilter(sessions, "all")).toEqual({
      sessions: 2,
      volumeKg: 0,
    });
  });
});

describe("splitGroupLabels — nombres que caben en la tarjeta", () => {
  it("sin recorte devuelve todos los grupos con su color", () => {
    expect(splitGroupLabels(["chest", "legs"])).toEqual({
      shown: [
        { key: "chest", name: "Pecho", color: "#10B981" },
        { key: "legs", name: "Piernas", color: "#FF007A" },
      ],
      extra: 0,
    });
  });

  it("con más grupos que hueco, recorta y cuenta los que sobran", () => {
    const { shown, extra } = splitGroupLabels(
      ["chest", "shoulders", "arms", "legs", "core"],
      3,
    );
    expect(shown.map((g) => g.name)).toEqual(["Pecho", "Hombros", "Brazos"]);
    expect(extra).toBe(2);
  });

  it("un máximo de cero no rompe", () => {
    expect(splitGroupLabels(["chest"], 0)).toEqual({ shown: [], extra: 1 });
  });
});

describe("groupColor", () => {
  it("devuelve el color del grupo y un gris neutro para «todos»", () => {
    expect(groupColor("chest")).toBe("#10B981");
    expect(groupColor("legs")).toBe("#FF007A");
    expect(groupColor("all")).toBe("#94A3B8");
  });
});
