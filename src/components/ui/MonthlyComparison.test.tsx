import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MonthlyComparison from "./MonthlyComparison";

// La comparativa mensual (F3.4). Lo que decide el componente: qué enseña sin
// datos, el encabezado con las fechas reales de los dos tramos, el total con
// su chip de tendencia, las barras por grupo (este mes / mes pasado) y los
// casos de "nuevo" y de bajada. La lógica de la ventana y los porcentajes
// tiene sus propias pruebas en `src/lib/monthly-comparison.test.ts`.

// Miércoles 8 oct 2026: el tramo en curso es 1–8 oct y el anterior 1–8 sep.
const HOY = new Date(2026, 9, 8, 12, 0);

/** Sesión completada con una serie del ejercicio dado a una fecha local. */
function sessionAt(
  month: number,
  day: number,
  weight: number,
  reps: number,
  exerciseId = "press-banca",
  exerciseName = "Press de Banca Plano",
) {
  return {
    completed: true,
    endTime: new Date(2026, month, day, 18, 0).toISOString(),
    exercises: [
      {
        exerciseId,
        exerciseName,
        sets: [{ completed: true, weight, reps }],
      },
    ],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MonthlyComparison (F3.4)", () => {
  it("sin datos lo dice en claro y no finge barras", () => {
    render(<MonthlyComparison sessions={[]} />);

    expect(
      screen.getByText("Aún no hay entrenamientos que comparar."),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("enseña las fechas reales de los dos tramos comparados", () => {
    render(<MonthlyComparison sessions={[sessionAt(9, 2, 60, 10)]} />);

    expect(
      screen.getByText("1–8 oct vs 1–8 sep · mismo tramo"),
    ).toBeInTheDocument();
  });

  it("el total muestra las dos cifras y su variación", () => {
    render(
      <MonthlyComparison
        sessions={[
          sessionAt(9, 2, 500, 10), // este mes: 5000 pecho + 2250×2 sinergias = 9500
          sessionAt(8, 2, 400, 10), // mes pasado: 4000 pecho + 1800×2 = 7600
        ]}
      />,
    );

    expect(screen.getByText("9.500")).toBeInTheDocument();
    expect(
      screen.getByText(/Mes pasado, mismo tramo: 7\.600 kg/),
    ).toBeInTheDocument();
    // +25 % en el total y en los tres grupos con actividad.
    expect(screen.getAllByText("+25 %").length).toBeGreaterThanOrEqual(4);
  });

  it("un grupo nuevo se etiqueta como nuevo, sin porcentaje inventado", () => {
    render(
      <MonthlyComparison
        sessions={[sessionAt(9, 2, 30, 12, "curl-biceps", "Curl de Bíceps")]}
      />,
    );

    expect(screen.getByText("Brazos")).toBeInTheDocument();
    // "nuevo" aparece en el chip del total y en el del grupo.
    expect(screen.getAllByText("nuevo").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("una bajada frente al mes pasado se marca con su porcentaje", () => {
    render(
      <MonthlyComparison
        sessions={[
          sessionAt(9, 2, 50, 10), // este mes 500
          sessionAt(8, 2, 100, 10), // mes pasado 1000 → -50 %
        ]}
      />,
    );

    // -50 % en el total y en los grupos con actividad.
    expect(screen.getAllByText("-50 %").length).toBeGreaterThanOrEqual(1);
  });

  it("cada grupo lleva sus dos barras (este mes y mes pasado)", () => {
    const { container } = render(
      <MonthlyComparison
        sessions={[sessionAt(9, 2, 100, 10), sessionAt(8, 2, 50, 10)]}
      />,
    );

    const grupos = container.querySelectorAll("[data-group]");
    expect(grupos.length).toBeGreaterThanOrEqual(3);
    // El primer grupo (pecho, el más fuerte) está al 100 %.
    const pecho = container.querySelector('[data-group="chest"]');
    expect(pecho).not.toBeNull();
    expect(pecho!.getAttribute("data-trend")).toBe("up");
    expect(pecho!.querySelectorAll("span[style]").length).toBe(2);
  });

  it("las barras llevan descripción accesible con las dos cifras", () => {
    render(<MonthlyComparison sessions={[sessionAt(9, 2, 60, 10)]} />);

    const descripcion = screen.getByRole("img", { name: /Pecho/ });
    expect(descripcion.getAttribute("aria-label")).toContain("600 kg este mes");
    expect(descripcion.getAttribute("aria-label")).toContain("1–8 oct");
    expect(descripcion.getAttribute("aria-label")).toContain("0 kg el mes pasado");
  });

  it("la leyenda dice qué barra es cada mes", () => {
    render(<MonthlyComparison sessions={[sessionAt(9, 2, 60, 10)]} />);

    expect(screen.getByText("Este mes")).toBeInTheDocument();
    expect(screen.getByText("Mes pasado")).toBeInTheDocument();
  });

  it("no explota sin sesiones (undefined o null)", () => {
    const { container: sinProps } = render(<MonthlyComparison />);
    expect(sinProps.querySelector("section")).not.toBeNull();

    const { container: conNull } = render(<MonthlyComparison sessions={null} />);
    expect(conNull.querySelector("section")).not.toBeNull();
  });
});
