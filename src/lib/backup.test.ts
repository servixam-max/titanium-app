import { describe, it, expect } from "vitest";
import {
  BACKUP_APP_ID,
  BackupParseError,
  backupFileName,
  buildBackupPayload,
  mergeLastExerciseWeights,
  parseBackupJson,
  restoreSummary,
} from "./backup";
import type { WeightEntry, WorkoutSession } from "./types";

// La copia de seguridad JSON (F3.1). Lo que decide sin WebView: cómo se
// construye el archivo, qué se acepta al restaurar (con sus mensajes de
// error para el usuario), el nombre del fichero y la fusión de la última
// marca por ejercicio. El camino nativo (escribir + compartir) se prueba
// en `backup-save.test.ts` y en el emulador.

const SESION: WorkoutSession = {
  id: "s-1",
  clientId: "c-1",
  ownerUserId: "u-1",
  createdAt: "2026-09-01T10:00:00.000Z",
  modifiedAt: "2026-09-01T10:00:00.000Z",
  version: 1,
  routineId: 1,
  routineName: "Día 1: Empuje",
  mode: "individual",
  startTime: "2026-09-01T10:00:00.000Z",
  endTime: "2026-09-01T10:40:00.000Z",
  completed: true,
  exercises: [
    {
      id: "e-1",
      clientId: "c-1",
      ownerUserId: "u-1",
      createdAt: "2026-09-01T10:05:00.000Z",
      modifiedAt: "2026-09-01T10:05:00.000Z",
      version: 1,
      exerciseId: "ex-1",
      exerciseName: "Press de Banca Plano",
      order: 0,
      sets: [
        {
          id: "set-1",
          clientId: "c-1",
          ownerUserId: "u-1",
          createdAt: "2026-09-01T10:05:00.000Z",
          modifiedAt: "2026-09-01T10:05:00.000Z",
          version: 1,
          setNumber: 1,
          weight: 40,
          reps: 12,
          completed: true,
          timestamp: "2026-09-01T10:05:00.000Z",
        },
      ],
    },
  ],
};

const PESAJE: WeightEntry = {
  id: "w-1",
  clientId: "c-1",
  ownerUserId: "u-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  modifiedAt: "2026-09-01T00:00:00.000Z",
  version: 1,
  weight: 80.5,
  date: "2026-09-01",
};

describe("buildBackupPayload — forma del archivo exportado", () => {
  it("incluye app, versión, fecha, usuario, sesiones, pesajes y marcas", () => {
    const payload = buildBackupPayload({
      version: "8.5.34",
      user: { id: "u-1", username: "Xam", email: "xam@fortixam.com" },
      sessions: [SESION],
      weights: [PESAJE],
      lastExerciseWeights: { "ex-1": 40 },
      exportedAt: "2026-10-03T08:00:00.000Z",
    });

    expect(payload.app).toBe(BACKUP_APP_ID);
    expect(payload.version).toBe("8.5.34");
    expect(payload.exportedAt).toBe("2026-10-03T08:00:00.000Z");
    expect(payload.user.username).toBe("Xam");
    expect(payload.sessions).toHaveLength(1);
    expect(payload.weights).toHaveLength(1);
    expect(payload.lastExerciseWeights).toEqual({ "ex-1": 40 });
  });

  it("sin datos deja arrays vacíos, no undefined", () => {
    const payload = buildBackupPayload({
      version: "8.5.34",
      sessions: [],
      weights: [],
      lastExerciseWeights: {},
      exportedAt: "2026-10-03T08:00:00.000Z",
    });

    expect(payload.sessions).toEqual([]);
    expect(payload.weights).toEqual([]);
    expect(payload.lastExerciseWeights).toEqual({});
    expect(payload.user).toEqual({});
    // Y el timestamp por defecto es ISO válido
    const auto = buildBackupPayload({ version: "1", sessions: [], weights: [], lastExerciseWeights: {} });
    expect(Number.isNaN(new Date(auto.exportedAt).getTime())).toBe(false);
  });
});

describe("parseBackupJson — lectura y validación de una copia", () => {
  it("lee una copia completa y cuenta lo que trae", () => {
    const payload = buildBackupPayload({
      version: "8.5.34",
      sessions: [SESION],
      weights: [PESAJE],
      lastExerciseWeights: { "ex-1": 40, "ex-2": 22.5 },
      exportedAt: "2026-10-03T08:00:00.000Z",
    });

    const parsed = parseBackupJson(JSON.stringify(payload));
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.weights).toHaveLength(1);
    expect(parsed.lastExerciseWeights).toEqual({ "ex-1": 40, "ex-2": 22.5 });
    expect(parsed.counts).toEqual({ sessions: 1, weights: 1, lastWeights: 2 });
    expect(parsed.exportedAt).toBe("2026-10-03T08:00:00.000Z");
  });

  it("acepta copias antiguas sin lastExerciseWeights", () => {
    const oldStyle = {
      app: "FORTIXAM",
      version: "8.5.20",
      exportedAt: "2026-09-10T08:00:00.000Z",
      user: { id: "u-1", username: "Xam" },
      sessions: [SESION],
      weights: [PESAJE],
    };

    const parsed = parseBackupJson(JSON.stringify(oldStyle));
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.weights).toHaveLength(1);
    expect(parsed.lastExerciseWeights).toEqual({});
    expect(parsed.counts.lastWeights).toBe(0);
  });

  it("con texto sin JSON explica que el archivo no es válido", () => {
    expect(() => parseBackupJson("esto no es json")).toThrowError(BackupParseError);
    try {
      parseBackupJson("esto no es json");
    } catch (err) {
      expect((err as BackupParseError).code).toBe("invalid-json");
      expect((err as BackupParseError).userMessage).toContain("no es un JSON válido");
    }
  });

  it("con un JSON de otra app dice claramente que no es de FORTIXAM", () => {
    try {
      parseBackupJson(JSON.stringify({ app: "OTRA-APP", sessions: [SESION] }));
      throw new Error("no debería llegar aquí");
    } catch (err) {
      expect((err as BackupParseError).code).toBe("not-fortixam");
      expect((err as BackupParseError).userMessage).toContain("no es una copia de seguridad de FORTIXAM");
    }
  });

  it("con un array suelto (no objeto) tampoco lo acepta", () => {
    expect(() => parseBackupJson(JSON.stringify([1, 2, 3]))).toThrowError(BackupParseError);
  });

  it("con una copia vacía avisa de que no había nada", () => {
    try {
      parseBackupJson(JSON.stringify({ app: "FORTIXAM", sessions: [], weights: [] }));
      throw new Error("no debería llegar aquí");
    } catch (err) {
      expect((err as BackupParseError).code).toBe("empty");
      expect((err as BackupParseError).userMessage).toContain("no contiene entrenamientos ni pesajes");
    }
  });

  it("ignora basura dentro de los arrays y de las marcas", () => {
    const parsed = parseBackupJson(
      JSON.stringify({
        app: "FORTIXAM",
        sessions: [SESION, null, 42, "texto", { sinId: true }],
        weights: [PESAJE, { noEsPeso: true }, { weight: "pesado" }, { id: "w-2", weight: 79 }],
        lastExerciseWeights: { ok: 40, malo: "mucho", tambienMal: null },
      }),
    );

    // Solo entran sesiones con id y pesos numéricos; el resto se descarta.
    expect(parsed.counts.sessions).toBe(1);
    expect(parsed.counts.weights).toBe(2);
    expect(parsed.lastExerciseWeights).toEqual({ ok: 40 });
  });
});

describe("backupFileName — nombre determinista del archivo", () => {
  it("normaliza el usuario y pone la fecha", () => {
    expect(backupFileName("Xam", "2026-10-03T08:00:00.000Z")).toBe(
      "fortixam-backup-xam-2026-10-03.json",
    );
  });

  it("con caracteres raros los convierte en guiones bajos", () => {
    expect(backupFileName("Antonio & Rocío", "2026-11-14T00:00:00.000Z")).toBe(
      "fortixam-backup-antonio___roc_o-2026-11-14.json",
    );
  });

  it("sin usuario usa 'usuario'", () => {
    expect(backupFileName(undefined, "2026-10-03T08:00:00.000Z")).toBe(
      "fortixam-backup-usuario-2026-10-03.json",
    );
  });
});

describe("mergeLastExerciseWeights — no pisar lo más reciente", () => {
  it("rellena lo que falta sin tocar lo que ya hay", () => {
    const merged = mergeLastExerciseWeights(
      { "ex-1": 45 },
      { "ex-1": 40, "ex-2": 22.5 },
    );
    expect(merged).toEqual({ "ex-1": 45, "ex-2": 22.5 });
  });

  it("en instalación nueva todo viene del archivo", () => {
    expect(mergeLastExerciseWeights({}, { "ex-1": 40 })).toEqual({ "ex-1": 40 });
  });

  it("tolera entradas vacías o basura", () => {
    expect(mergeLastExerciseWeights(undefined, undefined)).toEqual({});
    expect(mergeLastExerciseWeights({}, { "ex-1": NaN })).toEqual({});
  });
});

describe("restoreSummary — el aviso que ve el usuario", () => {
  it("cuenta entrenamientos, pesajes y marcas", () => {
    expect(restoreSummary({ sessions: 12, weights: 3, lastWeights: 8 })).toBe(
      "¡Datos restaurados! 12 entrenamientos, 3 pesajes, 8 marcas por ejercicio.",
    );
  });

  it("con singular no dice '1 entrenamientos'", () => {
    expect(restoreSummary({ sessions: 1, weights: 1, lastWeights: 1 })).toBe(
      "¡Datos restaurados! 1 entrenamiento, 1 pesaje, 1 marca por ejercicio.",
    );
  });

  it("sin nada que restaurar lo dice", () => {
    expect(restoreSummary({ sessions: 0, weights: 0, lastWeights: 0 })).toBe(
      "No había nada que restaurar.",
    );
  });
});
