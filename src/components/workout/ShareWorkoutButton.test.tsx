import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ShareWorkoutButton from "./ShareWorkoutButton";
import { shareSummaryText } from "@/lib/share-summary";

// El botón de compartir el resumen (F2.5). Lo que decide el componente: qué
// texto manda, qué dice al usuario en cada desenlace y que cancelar la hoja
// nativa no se anuncie como error ni como copia.

vi.mock("@/lib/haptics", () => ({
  haptics: { tick: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/share-summary", async (importarOriginal) => {
  const original = await importarOriginal<typeof import("@/lib/share-summary")>();
  return { ...original, shareSummaryText: vi.fn() };
});

const SESION = {
  routineId: 1,
  routineName: "Día 1: Empuje",
  startTime: "2026-10-02T10:00:00.000Z",
  endTime: "2026-10-02T10:42:00.000Z",
  exercises: [{ sets: [{ weight: 40, reps: 12 }] }],
};

const compartirMock = vi.mocked(shareSummaryText);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ShareWorkoutButton — compartir el resumen (F2.5)", () => {
  it("muestra el botón y comparte el resumen real de la sesión", async () => {
    compartirMock.mockResolvedValue({ method: "clipboard", status: "copied" });

    render(<ShareWorkoutButton session={SESION} routineTitle="Día 1: Empuje" />);

    const boton = screen.getByRole("button", { name: /Compartir resumen/i });
    expect(boton.className).toContain("h-12");

    await act(async () => {
      fireEvent.click(boton);
    });

    expect(compartirMock).toHaveBeenCalledTimes(1);
    const texto = compartirMock.mock.calls[0][0];
    expect(texto).toContain("¡Entreno completado en FORTIXAM! 💪");
    expect(texto).toContain("Día 1: Empuje");
    expect(texto).toContain("⏱️ 42 min");
  });

  it("al copiar lo dice claramente y desaparece solo", async () => {
    vi.useFakeTimers();
    compartirMock.mockResolvedValue({ method: "clipboard", status: "copied" });

    render(<ShareWorkoutButton session={SESION} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compartir resumen/i }));
    });

    expect(screen.getByText("Resumen copiado")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText("Resumen copiado")).not.toBeInTheDocument();
  });

  it("cuando la hoja nativa funciona dice “Compartido”", async () => {
    compartirMock.mockResolvedValue({ method: "web-share", status: "shared" });

    render(<ShareWorkoutButton session={SESION} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compartir resumen/i }));
    });

    expect(screen.getByText("Compartido")).toBeInTheDocument();
  });

  it("cancelar la hoja nativa no cambia ningún aviso", async () => {
    compartirMock.mockResolvedValue({ method: "web-share", status: "cancelled" });

    render(<ShareWorkoutButton session={SESION} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compartir resumen/i }));
    });

    expect(screen.queryByText("Resumen copiado")).not.toBeInTheDocument();
    expect(screen.queryByText("Compartido")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo compartir")).not.toBeInTheDocument();
    // El botón vuelve a estar listo para intentarlo otra vez
    expect(screen.getByRole("button", { name: /Compartir resumen/i })).toBeEnabled();
  });

  it("si no hay ningún camino lo admite en vez de fingir éxito", async () => {
    compartirMock.mockResolvedValue({ method: "none", status: "failed" });

    render(<ShareWorkoutButton session={SESION} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compartir resumen/i }));
    });

    expect(screen.getByText("No se pudo compartir")).toBeInTheDocument();
  });

  it("es una zona táctil de 48 px y funciona sin sesión (no rompe)", async () => {
    compartirMock.mockResolvedValue({ method: "clipboard", status: "copied" });

    render(<ShareWorkoutButton session={null} />);
    const boton = screen.getByRole("button", { name: /Compartir resumen/i });
    expect(boton.className).toContain("h-12");

    await act(async () => {
      fireEvent.click(boton);
    });
    expect(compartirMock).toHaveBeenCalledTimes(1);
  });
});
