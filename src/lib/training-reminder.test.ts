import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_TRAINING_REMINDER,
  REMINDER_HORIZON_DAYS,
  REMINDER_NOTIFICATION_IDS,
  REMINDER_STORAGE_KEY,
  buildReminderNotification,
  describeReminder,
  entrenoTerminadoHoy,
  formatReminderTime,
  isValidReminderTime,
  loadTrainingReminder,
  nextReminderDates,
  parseReminderTime,
  saveTrainingReminder,
} from "./training-reminder";

// Recordatorio diario de entreno (F8.3). Lo que se decide sin Android ni React:
// la hora, el horizonte de avisos y la regla de oro — si hoy ya hay un entreno
// terminado, hoy no se avisa.

// Miércoles 7 oct 2026, 12:00 local.
const HOY = new Date(2026, 9, 7, 12, 0, 0);

function sesionHoy(hora = 9) {
  return {
    completed: true,
    endTime: new Date(2026, 9, 7, hora, 30).toISOString(),
  };
}

function sesionAyer() {
  return {
    completed: true,
    endTime: new Date(2026, 9, 6, 19, 0).toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("training-reminder — hora elegida", () => {
  it("acepta cualquier hora real del día", () => {
    expect(isValidReminderTime(0, 0)).toBe(true);
    expect(isValidReminderTime(23, 59)).toBe(true);
    expect(isValidReminderTime(19, 5)).toBe(true);
  });

  it("rechaza horas imposibles o a medias", () => {
    expect(isValidReminderTime(24, 0)).toBe(false);
    expect(isValidReminderTime(-1, 30)).toBe(false);
    expect(isValidReminderTime(12, 60)).toBe(false);
    expect(isValidReminderTime(12.5, 0)).toBe(false);
    expect(isValidReminderTime(NaN, 0)).toBe(false);
  });

  it("pinta siempre dos dígitos", () => {
    expect(formatReminderTime(19, 0)).toBe("19:00");
    expect(formatReminderTime(7, 5)).toBe("07:05");
    expect(formatReminderTime(0, 59)).toBe("00:59");
  });

  it("lee lo que devuelve un input type=time, con o sin segundos", () => {
    expect(parseReminderTime("19:05")).toEqual({ hour: 19, minute: 5 });
    expect(parseReminderTime("07:00:00")).toEqual({ hour: 7, minute: 0 });
    expect(parseReminderTime(" 7:05 ")).toEqual({ hour: 7, minute: 5 });
  });

  it("rechaza valores que no son una hora", () => {
    expect(parseReminderTime("")).toBeNull();
    expect(parseReminderTime("29:00")).toBeNull();
    expect(parseReminderTime("19:60")).toBeNull();
    expect(parseReminderTime("7:5")).toBeNull();
    expect(parseReminderTime("mañana")).toBeNull();
  });
});

describe("training-reminder — ajuste guardado", () => {
  it("por defecto está apagado y a las 19:00", () => {
    expect(loadTrainingReminder("xam")).toEqual({
      enabled: false,
      hour: 19,
      minute: 0,
    });
    expect(DEFAULT_TRAINING_REMINDER).toEqual({ enabled: false, hour: 19, minute: 0 });
  });

  it("guarda y recupera el ajuste de cada usuario por separado", () => {
    saveTrainingReminder("xam", { enabled: true, hour: 7, minute: 15 });
    saveTrainingReminder("rocio", { enabled: true, hour: 20, minute: 45 });

    expect(loadTrainingReminder("xam")).toEqual({ enabled: true, hour: 7, minute: 15 });
    expect(loadTrainingReminder("rocio")).toEqual({ enabled: true, hour: 20, minute: 45 });
    expect(loadTrainingReminder("otro")).toEqual(DEFAULT_TRAINING_REMINDER);
  });

  it("al apagarlo conserva la hora para la próxima vez", () => {
    saveTrainingReminder("xam", { enabled: true, hour: 6, minute: 30 });
    saveTrainingReminder("xam", { enabled: false, hour: 6, minute: 30 });

    const guardado = loadTrainingReminder("xam");
    expect(guardado.enabled).toBe(false);
    expect(guardado.hour).toBe(6);
    expect(guardado.minute).toBe(30);
  });

  it("no se cree un ajuste con una hora imposible", () => {
    saveTrainingReminder("xam", { enabled: true, hour: 26, minute: 0 });
    expect(loadTrainingReminder("xam")).toEqual(DEFAULT_TRAINING_REMINDER);
  });

  it("sobrevive a un localStorage corrupto sin romper la pantalla", () => {
    localStorage.setItem(REMINDER_STORAGE_KEY, "{no es json");
    expect(loadTrainingReminder("xam")).toEqual(DEFAULT_TRAINING_REMINDER);

    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({
        xam: { enabled: true, hour: 99, minute: 0 },
        rocio: { enabled: true, hour: 8, minute: 0 },
        roto: "nada",
      }),
    );
    expect(loadTrainingReminder("xam")).toEqual(DEFAULT_TRAINING_REMINDER);
    expect(loadTrainingReminder("rocio")).toEqual({ enabled: true, hour: 8, minute: 0 });
    expect(loadTrainingReminder("roto")).toEqual(DEFAULT_TRAINING_REMINDER);
  });
});

describe("training-reminder — ¿ya se entrenó hoy?", () => {
  it("cuenta una sesión terminada hoy", () => {
    expect(entrenoTerminadoHoy([sesionHoy()], HOY)).toBe(true);
  });

  it("no cuenta una sesión a medias ni la de ayer", () => {
    expect(entrenoTerminadoHoy([{ completed: false, endTime: new Date(2026, 9, 7, 9).toISOString() }], HOY)).toBe(false);
    expect(entrenoTerminadoHoy([sesionAyer()], HOY)).toBe(false);
    expect(entrenoTerminadoHoy([], HOY)).toBe(false);
    expect(entrenoTerminadoHoy(null, HOY)).toBe(false);
  });

  it("una fecha inválida no se toma por un entreno de hoy", () => {
    expect(entrenoTerminadoHoy([{ completed: true, endTime: "no-es-fecha" }], HOY)).toBe(false);
  });
});

describe("training-reminder — próximos avisos", () => {
  it("con hora por delante, el primero es hoy y hay una semana entera", () => {
    const fechas = nextReminderDates({ hour: 19, minute: 0 }, [], HOY);

    expect(fechas).toHaveLength(REMINDER_HORIZON_DAYS);
    expect(fechas[0]).toEqual(new Date(2026, 9, 7, 19, 0));
    expect(fechas[1]).toEqual(new Date(2026, 9, 8, 19, 0));
    expect(fechas[6]).toEqual(new Date(2026, 9, 13, 19, 0));
  });

  it("si la hora de hoy ya pasó, empieza mañana", () => {
    const tarde = new Date(2026, 9, 7, 20, 0);
    const fechas = nextReminderDates({ hour: 19, minute: 0 }, [], tarde);

    expect(fechas[0]).toEqual(new Date(2026, 9, 8, 19, 0));
    expect(fechas).toHaveLength(REMINDER_HORIZON_DAYS);
    expect(fechas.every((f) => f.getTime() > tarde.getTime())).toBe(true);
  });

  it("si hoy ya se entrenó, hoy no se avisa y el primero es mañana", () => {
    const fechas = nextReminderDates({ hour: 19, minute: 0 }, [sesionHoy()], HOY);

    expect(fechas[0]).toEqual(new Date(2026, 9, 8, 19, 0));
    expect(fechas).toHaveLength(REMINDER_HORIZON_DAYS);
  });

  it("un entreno a medias no cancela el aviso de hoy", () => {
    const aMedias = { completed: false, endTime: new Date(2026, 9, 7, 9).toISOString() };
    const fechas = nextReminderDates({ hour: 19, minute: 0 }, [aMedias], HOY);

    expect(fechas[0]).toEqual(new Date(2026, 9, 7, 19, 0));
  });

  it("todas las fechas caen a la hora elegida y nunca en el pasado", () => {
    const fechas = nextReminderDates({ hour: 6, minute: 30 }, [], HOY);

    for (const fecha of fechas) {
      expect(fecha.getHours()).toBe(6);
      expect(fecha.getMinutes()).toBe(30);
      expect(fecha.getTime()).toBeGreaterThan(HOY.getTime());
    }
  });

  it("sin una hora válida no programa nada", () => {
    expect(nextReminderDates({ hour: 25, minute: 0 }, [], HOY)).toEqual([]);
  });

  it("los identificadores son fijos y no se repiten", () => {
    expect(REMINDER_NOTIFICATION_IDS).toHaveLength(REMINDER_HORIZON_DAYS);
    expect(new Set(REMINDER_NOTIFICATION_IDS).size).toBe(REMINDER_HORIZON_DAYS);
  });
});

describe("training-reminder — contenido del aviso", () => {
  it("lleva identificador, texto honesto y el disparo a la hora", () => {
    const at = new Date(2026, 9, 7, 19, 0);
    const aviso = buildReminderNotification(at, 7301);

    expect(aviso.id).toBe(7301);
    expect(aviso.title).toBe("FORTIXAM");
    expect(aviso.body).toContain("¿Ya has entrenado hoy?");
    expect(aviso.schedule.at).toEqual(at);
    expect(aviso.schedule.allowWhileIdle).toBe(true);
    expect(aviso.extra.route).toBe("/");
  });
});

describe("training-reminder — frase de Ajustes", () => {
  it("apagado no promete nada", () => {
    expect(describeReminder({ enabled: false, hour: 19, minute: 0 }, [], HOY)).toBeNull();
  });

  it("encendido dice cuándo es el próximo aviso", () => {
    expect(describeReminder({ enabled: true, hour: 19, minute: 0 }, [], HOY)).toBe(
      "Próximo aviso: hoy a las 19:00.",
    );
  });

  it("si ya se entrenó, lo dice y pasa el aviso a mañana", () => {
    expect(
      describeReminder({ enabled: true, hour: 19, minute: 0 }, [sesionHoy()], HOY),
    ).toBe("Hoy ya has entrenado: el próximo aviso es mañana a las 19:00.");
  });

  it("si la hora ya pasó, habla de mañana", () => {
    const tarde = new Date(2026, 9, 7, 21, 0);
    expect(describeReminder({ enabled: true, hour: 19, minute: 0 }, [], tarde)).toBe(
      "Próximo aviso: mañana a las 19:00.",
    );
  });
});
