import { describe, it, expect } from "vitest";
import {
  WARMUP_REMINDER_THRESHOLD_DAYS,
  computeWarmupReminder,
  completedSessionDate,
  findLatestStrengthSession,
  fullDaysSince,
  isStrengthSession,
  type WarmupReminderSessionLike,
} from "./warmup-reminder";

const DAY_MS = 86_400_000;

// Ahora fija: 20-sep-2026 10:00 (local). Ningún caso cruza el cambio de hora,
// así que restar n días son n * 24 h exactas.
const NOW = new Date(2026, 8, 20, 10, 0, 0);

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY_MS).toISOString();
}

type Log = NonNullable<WarmupReminderSessionLike["exercises"]>[number];

function exerciseLog(overrides: Partial<Log> = {}): Log {
  return { sets: [{ reps: 8, weight: 60 }], ...overrides };
}

function session(
  overrides: Partial<WarmupReminderSessionLike> = {},
): WarmupReminderSessionLike {
  return {
    startTime: daysAgo(1),
    endTime: daysAgo(1),
    completed: true,
    exercises: [exerciseLog()],
    ...overrides,
  };
}

function strengthSession(n: number | string): WarmupReminderSessionLike {
  const iso = typeof n === "number" ? daysAgo(n) : n;
  return session({ startTime: iso, endTime: iso });
}

function hiitSession(n: number): WarmupReminderSessionLike {
  return session({
    startTime: daysAgo(n),
    endTime: daysAgo(n),
    exercises: [exerciseLog({ sets: [{ duration: 20 }] })],
  });
}

describe("isStrengthSession — qué sesiones cuentan como fuerza (F2.4)", () => {
  it("una serie con repeticiones o peso cuenta como fuerza", () => {
    expect(isStrengthSession(strengthSession(1))).toBe(true);
    expect(
      isStrengthSession(session({ exercises: [exerciseLog({ sets: [{ weight: 40 }] })] })),
    ).toBe(true);
  });

  it("una sesión solo por tiempo (HIIT) no es fuerza", () => {
    expect(isStrengthSession(hiitSession(1))).toBe(false);
  });

  it("basta una serie de fuerza para contar una sesión mixta", () => {
    const mixta = session({
      exercises: [
        exerciseLog({ sets: [{ duration: 20 }] }),
        exerciseLog({ sets: [{ reps: 12 }] }),
      ],
    });
    expect(isStrengthSession(mixta)).toBe(true);
  });

  it("reps o peso en 0, NaN o sin series no cuentan", () => {
    const vacia = session({
      exercises: [exerciseLog({ sets: [{ reps: 0, weight: 0 }] })],
    });
    expect(isStrengthSession(vacia)).toBe(false);
    expect(
      isStrengthSession(session({ exercises: [exerciseLog({ sets: [{ reps: Number.NaN }] })] })),
    ).toBe(false);
    expect(isStrengthSession(session({ exercises: [exerciseLog({ sets: [] })] }))).toBe(false);
  });

  it("sesiones eliminadas, corruptas o sin datos no cuentan", () => {
    expect(isStrengthSession(null)).toBe(false);
    expect(isStrengthSession(undefined)).toBe(false);
    expect(isStrengthSession(session({ deleted: true }))).toBe(false);
    expect(isStrengthSession(session({ exercises: null }))).toBe(false);
    expect(
      isStrengthSession(session({ exercises: [undefined, exerciseLog()] } as never)),
    ).toBe(true); // aguanta basura en la lista y mira el resto
  });
});

describe("completedSessionDate y fullDaysSince — cálculo de días", () => {
  it("prefiere endTime para fechar el final del entrenamiento", () => {
    expect(completedSessionDate(session({ startTime: daysAgo(2), endTime: daysAgo(1) }))).toBe(daysAgo(1));
  });

  it("si endTime falta o está roto, cae a startTime válida", () => {
    expect(completedSessionDate(session({ endTime: undefined }))).toBe(daysAgo(1));
    expect(completedSessionDate(session({ startTime: daysAgo(2), endTime: "fecha-rota" }))).toBe(daysAgo(2));
  });

  it("ignora sesiones eliminadas o sin ninguna fecha válida", () => {
    expect(completedSessionDate(null)).toBeNull();
    expect(completedSessionDate(session({ deleted: true }))).toBeNull();
    expect(
      completedSessionDate(session({ startTime: "rota", endTime: "rota-también" })),
    ).toBeNull();
  });

  it("cuenta días completos: 2,5 días flojos son 2 días", () => {
    expect(fullDaysSince(daysAgo(2.5), NOW)).toBe(2);
    expect(fullDaysSince(daysAgo(5), NOW)).toBe(5);
  });

  it("0 días para hoy y para fechas del futuro (reloj desfasado)", () => {
    expect(fullDaysSince(NOW.toISOString(), NOW)).toBe(0);
    expect(fullDaysSince(daysAgo(-3), NOW)).toBe(0);
  });

  it("devuelve null con cadenas vacías o no fechas", () => {
    expect(fullDaysSince(null, NOW)).toBeNull();
    expect(fullDaysSince(undefined, NOW)).toBeNull();
    expect(fullDaysSince("", NOW)).toBeNull();
    expect(fullDaysSince("ayer", NOW)).toBeNull();
  });
});

describe("findLatestStrengthSession — la última sesión de fuerza gana", () => {
  it("elige la más reciente aunque HIIT y desorden se crucen por medio", () => {
    const historial = [
      strengthSession(9),
      hiitSession(2),
      strengthSession(6),
    ];
    expect(completedSessionDate(findLatestStrengthSession(historial))).toBe(daysAgo(6));
  });

  it("ignora incompletas, borradas y no-fuerza", () => {
    const historial = [
      strengthSession(3),
      session({ deleted: true, startTime: daysAgo(0) }),
      hiitSession(0),
      session({ completed: false, startTime: daysAgo(0) }),
    ];
    expect(completedSessionDate(findLatestStrengthSession(historial))).toBe(daysAgo(3));
  });

  it("aguanta historial vacío o ausente", () => {
    expect(findLatestStrengthSession([])).toBeNull();
    expect(findLatestStrengthSession(undefined)).toBeNull();
    expect(findLatestStrengthSession(null)).toBeNull();
  });

  it("no se queda con una sesión cuya fecha es inválida", () => {
    const historial = [strengthSession("fecha-rota"), strengthSession(4)];
    expect(completedSessionDate(findLatestStrengthSession(historial))).toBe(daysAgo(4));
  });
});

describe("computeWarmupReminder — umbral y casos borde (F2.4)", () => {
  it("sin historial no avisa (primera apertura, nada que medir)", () => {
    const result = computeWarmupReminder({ sessions: [], now: NOW });
    expect(result).toEqual({
      shouldRemind: false,
      daysSinceLastStrength: null,
      lastStrengthAt: null,
      thresholdDays: WARMUP_REMINDER_THRESHOLD_DAYS,
    });
  });

  it("con fuerza de hoy (o reciente) no avisa", () => {
    const result = computeWarmupReminder({ sessions: [strengthSession(0)], now: NOW });
    expect(result.shouldRemind).toBe(false);
    expect(result.daysSinceLastStrength).toBe(0);
  });

  it("HIIT reciente no reinicia el contador de fuerza", () => {
    const result = computeWarmupReminder({
      sessions: [hiitSession(1), strengthSession(9)],
      now: NOW,
    });
    expect(result.shouldRemind).toBe(true);
    expect(result.daysSinceLastStrength).toBe(9);
    expect(result.lastStrengthAt).toBe(daysAgo(9));
  });

  it("con X-1 días no avisa y con X días exactos sí (>= umbral)", () => {
    const casi = computeWarmupReminder({ sessions: [strengthSession(4)], now: NOW });
    expect(casi.shouldRemind).toBe(false);

    const enUmbral = computeWarmupReminder({ sessions: [strengthSession(5)], now: NOW });
    expect(enUmbral.shouldRemind).toBe(true);
    expect(enUmbral.daysSinceLastStrength).toBe(WARMUP_REMINDER_THRESHOLD_DAYS);
  });

  it("sesiones sin completar no cuentan aunque sean recientes", () => {
    const result = computeWarmupReminder({
      sessions: [session({ completed: false })],
      now: NOW,
    });
    expect(result.shouldRemind).toBe(false);
    expect(result.daysSinceLastStrength).toBeNull();
  });

  it("fechas inválidas o sesiones corruptas no provocan falsos avisos", () => {
    const result = computeWarmupReminder({
      sessions: [strengthSession("fecha-rota"), session({ startTime: "", endTime: undefined })],
      now: NOW,
    });
    expect(result.shouldRemind).toBe(false);
    expect(result.daysSinceLastStrength).toBeNull();
    expect(result.lastStrengthAt).toBeNull();
  });

  it("acepta umbral a medida y vuelve al por defecto si el umbral no vale", () => {
    const aMedida = computeWarmupReminder({
      sessions: [strengthSession(3)],
      now: NOW,
      thresholdDays: 3,
    });
    expect(aMedida.shouldRemind).toBe(true);
    expect(aMedida.thresholdDays).toBe(3);

    const roto = computeWarmupReminder({
      sessions: [strengthSession(3)],
      now: NOW,
      thresholdDays: -2,
    });
    expect(roto.thresholdDays).toBe(WARMUP_REMINDER_THRESHOLD_DAYS);
    expect(roto.shouldRemind).toBe(false);
  });
});
