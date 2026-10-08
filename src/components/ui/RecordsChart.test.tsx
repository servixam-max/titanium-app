import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecordsChart from "./RecordsChart";

// La gráfica de récords (F3.3). Lo que decide el componente: qué enseña
// cuando no hay datos, el resumen del récord vigente, el matiz de fiabilidad,
// el selector de ejercicio cuando hay varios y la banda del récord sobre la
// línea. La lógica de la evolución y la geometría tiene sus propias pruebas en
// `src/lib/records-chart.test.ts`.

vi.mock("@/lib/haptics", () => ({
  haptics: { tick: vi.fn(), selection: vi.fn(), impact: vi.fn() },
}));

/** Sesión completada a una fecha local con una serie del ejercicio dado. */
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
  vi.clearAllMocks();
});

describe("RecordsChart — gráfica de récords (F3.3)", () => {
  it("sin datos lo dice claro, sin gráfica fingida", () => {
    render(<RecordsChart sessions={[]} />);

    expect(
      screen.getByText("Aún no hay marcas con peso para dibujar la evolución."),
    ).toBeInTheDocument();
    // Sin gráfica: no hay línea que dibujar
    const tarjeta = screen.getByTestId("records-chart");
    expect(tarjeta.querySelector('[data-testid="records-chart-svg"]')).toBeNull();
  });

  it("enseña el récord vigente con su fecha y la serie real", () => {
    render(
      <RecordsChart
        sessions={[
          sessionAt(8, 7, 60, 10), // 80
          sessionAt(8, 23, 75, 5), // 88 ← récord
          sessionAt(8, 30, 80, 4), // 91 ← récord vigente
        ]}
      />,
    );

    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.getByText(/Récord el 30 sep/)).toBeInTheDocument();
    // 30 sep 2026 es miércoles → semana del lunes 28 sep.
    expect(screen.getByText(/semana del 28 sep/)).toBeInTheDocument();
    expect(screen.getByText("80 kg × 4")).toBeInTheDocument();
  });

  it("dibuja la línea con un punto por jornada y la banda del récord", () => {
    const { container } = render(
      <RecordsChart
        sessions={[sessionAt(8, 7, 60, 10), sessionAt(8, 14, 70, 6), sessionAt(8, 21, 75, 5)]}
      />,
    );

    const svg = container.querySelector('[data-testid="records-chart-svg"]');
    expect(svg).not.toBeNull();
    // Trazo de la línea + área
    expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    // 3 puntos de datos; el del récord lleva anillo (2 círculos), los otros 1
    expect(svg!.querySelectorAll("circle").length).toBe(4);
    // Línea vertical punteada de la banda del récord
    const banda = svg!.querySelector('line[stroke-dasharray="3 4"]');
    expect(banda).not.toBeNull();
  });

  it("matiza cuando el récord salió de más de 12 repeticiones", () => {
    render(
      <RecordsChart sessions={[sessionAt(8, 14, 40, 15)]} />,
    );

    expect(
      screen.getByText(/más de 12 repeticiones: la estimación es orientativa/),
    ).toBeInTheDocument();
  });

  it("con un récord fiable no muestra el matiz", () => {
    render(<RecordsChart sessions={[sessionAt(8, 14, 80, 10)]} />);

    expect(
      screen.queryByText(/la estimación es orientativa/),
    ).not.toBeInTheDocument();
  });

  it("con varios ejercicios deja elegir y cambia la gráfica", () => {
    render(
      <RecordsChart
        sessions={[
          sessionAt(8, 14, 60, 10, "press-banca", "Press de Banca Plano"),
          sessionAt(8, 20, 30, 12, "curl-biceps", "Curl de Bíceps"),
        ]}
      />,
    );

    // Por defecto, el entrenado más recientemente (curl)
    expect(screen.getByText("Curl de Bíceps")).toBeInTheDocument();

    // Abre el selector y elige el otro
    fireEvent.click(screen.getByRole("button", { name: /Elegir ejercicio/ }));
    fireEvent.click(screen.getByRole("button", { name: /Press de Banca Plano/ }));

    expect(screen.getByRole("button", { name: /Elegir ejercicio: Press de Banca Plano/ })).toBeInTheDocument();
  });

  it("con un solo ejercicio no muestra selector, solo el nombre", () => {
    render(<RecordsChart sessions={[sessionAt(8, 14, 80, 10)]} />);

    expect(screen.queryByRole("button", { name: /Elegir ejercicio/ })).toBeNull();
    expect(screen.getByText("Press de Banca Plano")).toBeInTheDocument();
  });

  it("la gráfica lleva descripción accesible con el récord", () => {
    render(<RecordsChart sessions={[sessionAt(8, 22, 75, 5)]} />);

    const grafico = screen.getByRole("img");
    expect(grafico.getAttribute("aria-label")).toContain("Press de Banca Plano");
    expect(grafico.getAttribute("aria-label")).toContain("88 kg");
    expect(grafico.getAttribute("aria-label")).toContain("22 sep");
  });

  it("no explota sin sesiones (undefined o null)", () => {
    const { container: sinProps } = render(<RecordsChart />);
    expect(sinProps.querySelector("section")).not.toBeNull();

    const { container: conNull } = render(<RecordsChart sessions={null} />);
    expect(conNull.querySelector("section")).not.toBeNull();
  });
});
