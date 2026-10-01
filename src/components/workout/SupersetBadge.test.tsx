import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SupersetBadge from "./SupersetBadge";

describe("SupersetBadge — etiqueta del par en superserie (F2.3)", () => {
  it("muestra el badge de superserie con el nombre del compañero", () => {
    render(<SupersetBadge partnerName="Remo" />);

    expect(screen.getByText("Superserie con Remo")).toBeInTheDocument();
    expect(screen.getByTitle("Superserie encadenada con Remo")).toBeInTheDocument();
  });

  it("sin compañero conocido se limita a etiquetar la superserie", () => {
    render(<SupersetBadge />);

    const badge = screen.getByTitle("Superserie encadenada");
    expect(badge).toHaveTextContent("Superserie");
    expect(badge.textContent).not.toContain("con");
  });

  it("el icono es decorativo (aria-hidden) para no ensuciar lectores de pantalla", () => {
    render(<SupersetBadge partnerName="Curl" />);

    expect(screen.getByTitle("Superserie encadenada con Curl")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
