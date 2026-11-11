import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import BodyHeightSection from "./BodyHeightSection";
import { HEIGHT_STORAGE_KEY, loadHeightCm } from "@/lib/body-height";

// La sección de Ajustes de la altura para el IMC (F12.1): sin altura guardada
// se dice que se estima en 1,75 m; una altura válida se guarda y se anuncia;
// una imposible se rechaza sin tocar lo guardado.

beforeEach(() => {
  localStorage.clear();
});

describe("BodyHeightSection — altura para el IMC", () => {
  it("sin altura guardada muestra 1,75 m estimada", () => {
    render(<BodyHeightSection userId="xam" />);

    expect(screen.getByTestId("body-height-current")).toHaveTextContent(
      "1,75 m · estimada",
    );
    expect(screen.queryByRole("button", { name: /volver a 1,75 m/i })).not.toBeInTheDocument();
  });

  it("guarda una altura válida y la anuncia", () => {
    render(<BodyHeightSection userId="xam" />);

    const input = screen.getByLabelText(/altura \(cm\)/i);
    fireEvent.change(input, { target: { value: "182" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar altura/i }));

    expect(loadHeightCm("xam")).toBe(182);
    expect(screen.getByTestId("body-height-current")).toHaveTextContent("1,82 m");
    expect(screen.getByTestId("body-height-current")).not.toHaveTextContent("estimada");
    expect(screen.getByRole("status")).toHaveTextContent("Altura guardada.");
    expect(screen.getByRole("button", { name: /volver a 1,75 m/i })).toBeInTheDocument();
  });

  it("rechaza una altura fuera de rango y no guarda nada", () => {
    render(<BodyHeightSection userId="xam" />);

    const input = screen.getByLabelText(/altura \(cm\)/i);
    fireEvent.change(input, { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar altura/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pon una altura entre 120 y 230 cm.",
    );
    expect(loadHeightCm("xam")).toBeNull();
    expect(localStorage.getItem(HEIGHT_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("body-height-current")).toHaveTextContent(
      "1,75 m · estimada",
    );
  });

  it("«Volver a 1,75 m» borra la altura guardada", () => {
    localStorage.setItem(HEIGHT_STORAGE_KEY, JSON.stringify({ xam: 182 }));
    render(<BodyHeightSection userId="xam" />);

    expect(screen.getByTestId("body-height-current")).toHaveTextContent("1,82 m");

    fireEvent.click(screen.getByRole("button", { name: /volver a 1,75 m/i }));

    expect(loadHeightCm("xam")).toBeNull();
    expect(screen.getByTestId("body-height-current")).toHaveTextContent(
      "1,75 m · estimada",
    );
    expect(screen.queryByRole("button", { name: /volver a 1,75 m/i })).not.toBeInTheDocument();
  });
});
