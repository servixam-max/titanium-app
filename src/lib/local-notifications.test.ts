import { describe, it, expect, vi, beforeEach } from "vitest";

// El puente con las notificaciones locales del APK (F8.3). Lo que se verifica
// aquí: que en web no se prometa nada, que el permiso se pida solo al encender
// y que la sincronización silenciosa no programe nada si ya no hay permiso.

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  cancelTrainingReminders,
  remindersSupported,
  requestReminderPermission,
  syncTrainingReminders,
} from "./local-notifications";

const isNativeMock = vi.mocked(Capacitor.isNativePlatform);
const checkMock = vi.mocked(LocalNotifications.checkPermissions);
const requestMock = vi.mocked(LocalNotifications.requestPermissions);
const scheduleMock = vi.mocked(LocalNotifications.schedule);
const cancelMock = vi.mocked(LocalNotifications.cancel);

const HOY = new Date(2026, 9, 7, 12, 0, 0);

beforeEach(() => {
  vi.clearAllMocks();
  isNativeMock.mockReturnValue(true);
  checkMock.mockResolvedValue({ display: "granted" });
  requestMock.mockResolvedValue({ display: "granted" });
  scheduleMock.mockResolvedValue({ notifications: [] });
  cancelMock.mockResolvedValue(undefined);
});

describe("local-notifications — disponibilidad", () => {
  it("en el navegador no hay notificaciones programadas", async () => {
    isNativeMock.mockReturnValue(false);

    expect(remindersSupported()).toBe(false);
    expect(await requestReminderPermission()).toBe("unavailable");

    const result = await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [], HOY);
    expect(result).toEqual({ ok: false, scheduled: 0, permission: "unavailable" });
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

describe("local-notifications — permiso", () => {
  it("si ya está concedido no vuelve a preguntar", async () => {
    expect(await requestReminderPermission()).toBe("granted");
    expect(checkMock).toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("pregunta una vez cuando aún no hay permiso", async () => {
    checkMock.mockResolvedValue({ display: "prompt" });
    requestMock.mockResolvedValue({ display: "granted" });

    expect(await requestReminderPermission()).toBe("granted");
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("si el usuario deniega, lo dice sin disfrazarlo", async () => {
    checkMock.mockResolvedValue({ display: "prompt" });
    requestMock.mockResolvedValue({ display: "denied" });

    expect(await requestReminderPermission()).toBe("denied");
  });

  it("un fallo del plugin no se confunde con un permiso concedido", async () => {
    checkMock.mockRejectedValue(new Error("boom"));
    expect(await requestReminderPermission()).toBe("error");
  });
});

describe("local-notifications — sincronización", () => {
  it("apagado cancela lo que hubiera y no programa nada", async () => {
    const result = await syncTrainingReminders({ enabled: false, hour: 19, minute: 0 }, [], HOY);

    expect(result).toEqual({ ok: true, scheduled: 0, permission: null });
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("encendido con permiso programa la semana (7 avisos) y cancela los viejos", async () => {
    const result = await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [], HOY);

    expect(result.ok).toBe(true);
    expect(result.scheduled).toBe(7);
    expect(result.permission).toBe("granted");
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledTimes(1);

    const payload = scheduleMock.mock.calls[0][0];
    expect(payload.notifications).toHaveLength(7);
    expect(payload.notifications[0].schedule?.at).toEqual(new Date(2026, 9, 7, 19, 0));
    expect(payload.notifications.every((n) => n.schedule?.allowWhileIdle === true)).toBe(true);
  });

  it("si hoy ya se entrenó, el primero es mañana", async () => {
    const sesion = {
      completed: true,
      endTime: new Date(2026, 9, 7, 9, 0).toISOString(),
    };

    await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [sesion], HOY);

    const payload = scheduleMock.mock.calls[0][0];
    expect(payload.notifications[0].schedule?.at).toEqual(new Date(2026, 9, 8, 19, 0));
  });

  it("sin permiso no programa ni pide el diálogo por su cuenta", async () => {
    checkMock.mockResolvedValue({ display: "denied" });

    const result = await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [], HOY);

    expect(result.ok).toBe(false);
    expect(result.permission).toBe("denied");
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });

  it("un aviso inexacto del sistema no se oculta", async () => {
    scheduleMock.mockResolvedValue({
      notifications: [],
      warning: { code: "OS-PLUG-LNOT-0017", message: "Scheduled as an inexact alarm instead." },
    });

    const result = await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [], HOY);

    expect(result.ok).toBe(true);
    expect(result.warning).toContain("OS-PLUG-LNOT-0017");
  });

  it("un fallo al programar se devuelve con su mensaje real", async () => {
    scheduleMock.mockRejectedValue(new Error("alarm manager caído"));

    const result = await syncTrainingReminders({ enabled: true, hour: 19, minute: 0 }, [], HOY);

    expect(result.ok).toBe(false);
    expect(result.permission).toBe("error");
    expect(result.error).toContain("alarm manager caído");
  });

  it("cancelar nunca rompe la pantalla", async () => {
    cancelMock.mockRejectedValue(new Error("sin notificaciones"));

    await expect(cancelTrainingReminders()).resolves.toBeUndefined();
  });
});
