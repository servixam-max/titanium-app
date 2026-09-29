import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpdateNotes } from "./UpdateChecker";
import { NOTES_PREVIEW } from "@/lib/changelog";

describe("UpdateNotes — resumen de la versión antes de descargar (F1.3)", () => {
  it("dice qué trae la nueva versión con sus cambios", () => {
    render(
      <UpdateNotes
        version="8.5.24"
        notes={["Novedades en la app", "Descansos a 75 s"]}
      />,
    );

    expect(screen.getByText("Qué trae la v8.5.24")).toBeInTheDocument();
    expect(screen.getByText("Novedades en la app")).toBeInTheDocument();
    expect(screen.getByText("Descansos a 75 s")).toBeInTheDocument();
  });

  it("avisa de que está buscando mientras llegan las notas", () => {
    render(<UpdateNotes version="8.5.24" notes={null} />);

    expect(screen.getByText("Buscando las novedades...")).toBeInTheDocument();
  });

  it("usa un texto corto si la release aún no trae cambios", () => {
    render(<UpdateNotes version="8.5.24" notes={[]} />);

    expect(
      screen.getByText("Mejoras y correcciones de mantenimiento."),
    ).toBeInTheDocument();
  });

  it("no alarga el diálogo: recorta a los primeros cambios y ofrece el resto", () => {
    const notes = Array.from(
      { length: NOTES_PREVIEW + 3 },
      (_, i) => `Cambio ${i + 1}`,
    );
    render(<UpdateNotes version="8.5.24" notes={notes} />);

    expect(screen.getByText(`Cambio ${NOTES_PREVIEW}`)).toBeInTheDocument();
    expect(screen.queryByText(`Cambio ${NOTES_PREVIEW + 1}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Ver los 3 cambios restantes"));
    expect(screen.getByText(`Cambio ${NOTES_PREVIEW + 1}`)).toBeInTheDocument();
  });

  it("con pocos cambios no ofrece desplegar nada", () => {
    render(<UpdateNotes version="8.5.24" notes={["Uno", "Dos"]} />);

    expect(screen.queryByText(/cambios restantes/)).not.toBeInTheDocument();
    expect(screen.getByText("Uno")).toBeInTheDocument();
    expect(screen.getByText("Dos")).toBeInTheDocument();
  });
});
