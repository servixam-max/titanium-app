import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WhatsNewContent } from "./WhatsNewModal";

const baseProps = {
  version: "8.5.17",
  notes: ["Aviso de novedades al actualizar", "Descansos a 75 s"],
  loading: false,
  onDismiss: vi.fn(),
};

describe("WhatsNewContent", () => {
  it("saluda con la versión instalada y lista los cambios", () => {
    render(<WhatsNewContent {...baseProps} />);

    expect(screen.getByText("Novedades de la v8.5.17")).toBeInTheDocument();
    expect(screen.getByText("Aviso de novedades al actualizar")).toBeInTheDocument();
    expect(screen.getByText("Descansos a 75 s")).toBeInTheDocument();
  });

  it("cierra al pulsar Entendido", () => {
    const onDismiss = vi.fn();
    render(<WhatsNewContent {...baseProps} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText("Entendido"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("muestra un texto corto cuando no hay notas de la versión", () => {
    render(<WhatsNewContent {...baseProps} notes={[]} />);

    expect(
      screen.getByText("Mejoras y correcciones de mantenimiento."),
    ).toBeInTheDocument();
  });

  it("avisa de que se están cargando las novedades", () => {
    render(<WhatsNewContent {...baseProps} notes={[]} loading />);

    expect(screen.getByText("Cargando novedades...")).toBeInTheDocument();
  });

  it("recuerda dónde releerlas (Ajustes → Novedades)", () => {
    render(<WhatsNewContent {...baseProps} />);

    expect(
      screen.getByText(/Podrás releerlas cuando quieras en Ajustes → Novedades/),
    ).toBeInTheDocument();
  });
});
