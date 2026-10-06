import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ConsistencyHeatmap from "./ConsistencyHeatmap";

// El heatmap de constancia (F3.2). Lo que decide el componente: cuántos días
// hay que pintar, cuáles están entrenados, que hoy quede marcado y que los
// días futuros no mientan. La lógica de la ventana y los niveles tiene sus
// propias 18 pruebas en `src/lib/consistency.test.ts`.

// Miércoles 7 oct 2026: hoy cae a mitad de semana → días pasados y futuros.
const HOY = new Date(2026, 9, 7, 12, 0);

/** Sesión completada a una fecha local. */
function sessionAt(
  month: number,
  day: number,
  weight = 20,
  reps = 10,
) {
  return {
    completed: true,
    endTime: new Date(2026, month, day, 18, 0).toISOString(),
    exercises: [{ sets: [{ completed: true, weight, reps }] }],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ConsistencyHeatmap (F3.2)", () => {
  it("pinta 28 celdas en 4 filas de lunas a domingo", () => {
    render(<ConsistencyHeatmap sessions={[]} />);

    const celdas = document.querySelectorAll("[data-date]");
    expect(celdas).toHaveLength(28);

    // La primera celda es el lunes 14 sep; la última, el domingo 11 oct.
    expect(celdas[0].getAttribute("data-date")).toBe("2026-09-14");
    expect(celdas[27].getAttribute("data-date")).toBe("2026-10-11");
  });

  it("marca los días entrenados con su nivel y el máximo con nivel 4", () => {
    render(
      <ConsistencyHeatmap
        sessions={[
          sessionAt(8, 16, 100, 10), // 1000 kg → 4
          sessionAt(8, 17, 30, 10), // 300 kg → 2
        ]}
      />,
    );

    const fuerte = document.querySelector('[data-date="2026-09-16"]')!;
    expect(fuerte.getAttribute("data-trained")).toBe("true");
    expect(fuerte.getAttribute("data-level")).toBe("4");

    const suave = document.querySelector('[data-date="2026-09-17"]')!;
    expect(suave.getAttribute("data-level")).toBe("2");

    const vacio = document.querySelector('[data-date="2026-09-18"]')!;
    expect(vacio.getAttribute("data-trained")).toBe("false");
    expect(vacio.getAttribute("data-level")).toBe("0");
  });

  it("hoy queda marcado y los días futuros, atenuados sin entrenar", () => {
    render(<ConsistencyHeatmap sessions={[]} />);

    const hoy = document.querySelector('[data-date="2026-10-07"]')!;
    expect(hoy.getAttribute("data-today")).toBe("true");
    expect(hoy.getAttribute("data-future")).toBeNull();

    const futuro = document.querySelector('[data-date="2026-10-08"]')!;
    expect(futuro.getAttribute("data-future")).toBe("true");
    expect(futuro.getAttribute("data-trained")).toBe("false");
  });

  it("enseña el resumen: días entrenados y porcentaje de lo transcurrido", () => {
    render(
      <ConsistencyHeatmap
        sessions={[sessionAt(8, 14), sessionAt(8, 16), sessionAt(8, 21)]}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("días entrenados")).toBeInTheDocument();
    // 3 de 24 días transcurridos = 13 %
    expect(screen.getByText("13 %")).toBeInTheDocument();
  });

  it("sin entrenos lo dice claro en vez de fingir una cuadrícula viva", () => {
    render(<ConsistencyHeatmap sessions={[]} />);

    expect(
      screen.getByText("Aún no hay entrenamientos en estas 4 semanas."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/días entrenados/)).not.toBeInTheDocument();
  });

  it("las celdas llevan etiqueta accesible y la cuadrícula una descripción", () => {
    render(<ConsistencyHeatmap sessions={[sessionAt(8, 14, 40, 10)]} />);

    const cuadricula = screen.getByRole("img");
    expect(cuadricula.getAttribute("aria-label")).toBe(
      "Constancia de las últimas 4 semanas: 1 de 24 días entrenados",
    );

    const celda = document.querySelector('[data-date="2026-09-14"]')!;
    expect(celda.getAttribute("title")).toBe("lun 14 sep: entrenado · 400 kg");
  });

  it("no explota sin sesiones (undefined o null)", () => {
    const { container: sinProps } = render(<ConsistencyHeatmap />);
    expect(sinProps.querySelectorAll("[data-date]")).toHaveLength(28);

    const { container: conNull } = render(<ConsistencyHeatmap sessions={null} />);
    expect(conNull.querySelectorAll("[data-date]")).toHaveLength(28);
  });
});
