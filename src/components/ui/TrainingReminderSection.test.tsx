import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// La sección de Ajustes del recordatorio diario (F8.3): interruptor honesto
// (solo queda encendido con permiso real), hora editable y, en el navegador,
// un aviso claro de que los avisos programados necesitan la app instalada.

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
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
import TrainingReminderSection from "./TrainingReminderSection";
import { REMINDER_STORAGE_KEY, loadTrainingReminder } from "@/lib/training-reminder";

const isNativeMock = vi.mocked(Capacitor.isNativePlatform);
const checkMock = vi.mocked(LocalNotifications.checkPermissions);
const requestMock = vi.mocked(LocalNotifications.requestPermissions);
const scheduleMock = vi.mocked(LocalNotifications.schedule);
const cancelMock = vi.mocked(LocalNotifications.cancel);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  isNativeMock.mockReturnValue(false);
  checkMock.mockResolvedValue({ display: "granted" });
  requestMock.mockResolvedValue({ display: "granted" });
  scheduleMock.mockResolvedValue({ notifications: [] });
  cancelMock.mockResolvedValue(undefined);
});

describe("TrainingReminderSection — en el navegador", () => {
  it("no deja encender y explica por qué, sin prometer avisos", () => {
    render(<TrainingReminderSection userId="xam" sessions={[]} />);

    const interruptor = screen.getByRole("switch", {
      name: /recordatorio diario de entreno/i,
    });
    expect(interruptor).toBeDisabled();
    expect(interruptor).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/necesitan la app instalada/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/hora del recordatorio/i)).not.toBeInTheDocument();
  });
});

describe("TrainingReminderSection — en la app instalada", () => {
  it("al encender pide permiso, programa la semana y lo deja encendido", async () => {
    isNativeMock.mockReturnValue(true);
    checkMock
      .mockResolvedValueOnce({ display: "prompt" })
      .mockResolvedValue({ display: "granted" });

    render(<TrainingReminderSection userId="xam" sessions={[]} />);
    fireEvent.click(screen.getByRole("switch", { name: /recordatorio diario/i }));

    await waitFor(() => {
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock.mock.calls[0][0].notifications).toHaveLength(7);
    expect(loadTrainingReminder("xam").enabled).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent(/próximo aviso|ya has entrenado/i);
    expect(screen.getByLabelText(/hora del recordatorio/i)).toHaveValue("19:00");
  });

  it("si se deniega el permiso, el interruptor vuelve a apagado y se explica", async () => {
    isNativeMock.mockReturnValue(true);
    checkMock.mockResolvedValue({ display: "prompt" });
    requestMock.mockResolvedValue({ display: "denied" });

    render(<TrainingReminderSection userId="xam" sessions={[]} />);
    fireEvent.click(screen.getByRole("switch", { name: /recordatorio diario/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/sin permiso de notificaciones/i);
    });

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(loadTrainingReminder("xam").enabled).toBe(false);
    expect(scheduleMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "error");
  });

  it("cambiar la hora la guarda y reprograma los avisos", async () => {
    isNativeMock.mockReturnValue(true);
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ xam: { enabled: true, hour: 7, minute: 0 } }),
    );

    render(<TrainingReminderSection userId="xam" sessions={[]} />);

    const hora = await screen.findByLabelText(/hora del recordatorio/i);
    fireEvent.change(hora, { target: { value: "20:30" } });

    await waitFor(() => {
      expect(loadTrainingReminder("xam")).toMatchObject({ enabled: true, hour: 20, minute: 30 });
    });
    expect(scheduleMock).toHaveBeenCalled();
    expect(hora).toHaveValue("20:30");
  });

  it("si el permiso se retiró en el sistema, el interruptor no miente", async () => {
    isNativeMock.mockReturnValue(true);
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ xam: { enabled: true, hour: 19, minute: 0 } }),
    );
    checkMock.mockResolvedValue({ display: "denied" });

    render(<TrainingReminderSection userId="xam" sessions={[]} />);

    await waitFor(() => {
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/permiso de notificaciones está desactivado/i);
    expect(loadTrainingReminder("xam").enabled).toBe(false);
  });

  it("dice que hoy no habrá aviso si ya hay un entreno terminado", async () => {
    isNativeMock.mockReturnValue(true);
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ xam: { enabled: true, hour: 23, minute: 59 } }),
    );

    const sesion = {
      id: "s1",
      completed: true,
      endTime: new Date().toISOString(),
    } as never;

    render(<TrainingReminderSection userId="xam" sessions={[sesion]} />);

    await waitFor(() => {
      expect(screen.getByTestId("reminder-next")).toHaveTextContent(/hoy ya has entrenado/i);
    });
  });
});
