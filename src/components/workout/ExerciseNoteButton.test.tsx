import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExerciseNoteButton from "./ExerciseNoteButton";

describe("ExerciseNoteButton — nota rápida del ejercicio (F2.1)", () => {
  it("cerrada es una píldora discreta que invita a añadir nota", () => {
    render(<ExerciseNoteButton onSave={vi.fn()} />);

    expect(screen.getByText("Añadir nota")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("al pulsarla abre el campo y guarda al salir del campo", () => {
    const onSave = vi.fn();
    render(<ExerciseNoteButton onSave={onSave} />);

    fireEvent.click(screen.getByText("Añadir nota"));
    const input = screen.getByLabelText("Nota del ejercicio");
    fireEvent.change(input, { target: { value: "  codo a 90º  " } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith("  codo a 90º  ");
    expect(screen.getByText("Nota guardada")).toBeInTheDocument();
  });

  it("con nota ya guardada, la muestra cerrada y la precarga al editar", () => {
    render(<ExerciseNoteButton note="subir 2,5 kg" onSave={vi.fn()} />);

    fireEvent.click(screen.getByText("subir 2,5 kg"));
    expect(screen.getByLabelText("Nota del ejercicio")).toHaveValue("subir 2,5 kg");
  });

  it("Enter guarda sin esperar a salir del campo", () => {
    const onSave = vi.fn();
    render(<ExerciseNoteButton onSave={onSave} />);

    fireEvent.click(screen.getByText("Añadir nota"));
    const input = screen.getByLabelText("Nota del ejercicio");
    fireEvent.change(input, { target: { value: "fallo al final" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("fallo al final");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("vaciar el campo y guardar borra la nota", () => {
    const onSave = vi.fn();
    render(<ExerciseNoteButton note="vieja" onSave={onSave} />);

    fireEvent.click(screen.getByText("vieja"));
    const input = screen.getByLabelText("Nota del ejercicio");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith("");
    expect(screen.getByText("Nota borrada")).toBeInTheDocument();
  });

  it("Escape cancela sin guardar", () => {
    const onSave = vi.fn();
    render(<ExerciseNoteButton note="original" onSave={onSave} />);

    fireEvent.click(screen.getByText("original"));
    const input = screen.getByLabelText("Nota del ejercicio");
    fireEvent.change(input, { target: { value: "cambio a medias" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("original")).toBeInTheDocument();
  });

  it("usa un campo de 16px: en móvil iOS no dispara el zoom automático", () => {
    render(<ExerciseNoteButton onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Añadir nota"));

    const input = screen.getByLabelText("Nota del ejercicio");
    expect(input.className).toContain("text-[16px]");
  });
});
