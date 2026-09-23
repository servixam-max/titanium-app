import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangelogList from "./ChangelogList";
import { ChangelogEntry } from "@/lib/changelog";
import { APP_VERSION } from "@/lib/ota-sync";

const entry = (version: string, notes: string[]): ChangelogEntry => ({
  version,
  name: `FORTIXAM v${version}`,
  publishedAt: "2026-09-22T18:23:56Z",
  notes,
  url: `https://github.com/servixam-max/titanium-app/releases/tag/v${version}`,
});

const baseProps = {
  loading: false,
  error: "",
  fromCache: false,
  onRetry: vi.fn(),
};

describe("ChangelogList", () => {
  it("marca la versión instalada con su etiqueta", () => {
    render(
      <ChangelogList
        {...baseProps}
        entries={[entry(APP_VERSION.version, ["Un cambio"]), entry("8.5.10", ["Viejo"])]}
      />,
    );

    expect(screen.getByText(`v${APP_VERSION.version}`)).toBeInTheDocument();
    expect(screen.getByText("Instalada")).toBeInTheDocument();
  });

  it("muestra los cambios de la versión más nueva al abrirse", () => {
    render(
      <ChangelogList {...baseProps} entries={[entry("8.5.20", ["Novedad visible"]), entry("8.5.19", [])]} />,
    );
    expect(screen.getByText("Novedad visible")).toBeInTheDocument();
  });

  it("pliega y despliega una versión al pulsarla", () => {
    render(
      <ChangelogList {...baseProps} entries={[entry("8.5.20", ["Uno"]), entry("8.5.19", ["Dos"])]} />,
    );
    expect(screen.queryByText("Dos")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("v8.5.19"));
    expect(screen.getByText("Dos")).toBeInTheDocument();

    fireEvent.click(screen.getByText("v8.5.19"));
    expect(screen.queryByText("Dos")).not.toBeInTheDocument();
  });

  it("solo pinta las 3 versiones más nuevas y ofrece el resto", () => {
    const entries = ["8.5.20", "8.5.19", "8.5.18", "8.5.17", "8.5.16"].map((v) => entry(v, [`Nota ${v}`]));
    render(<ChangelogList {...baseProps} entries={entries} />);

    expect(screen.getByText("v8.5.20")).toBeInTheDocument();
    expect(screen.getByText("v8.5.18")).toBeInTheDocument();
    expect(screen.queryByText("v8.5.17")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Ver 2 versiones anteriores/));
    expect(screen.getByText("v8.5.17")).toBeInTheDocument();
    expect(screen.getByText("v8.5.16")).toBeInTheDocument();
  });

  it("muestra estado de carga y de error con reintento", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ChangelogList {...baseProps} entries={[]} loading />);
    expect(screen.getByText("Cargando novedades...")).toBeInTheDocument();

    rerender(
      <ChangelogList {...baseProps} entries={[]} error="Sin conexión" onRetry={onRetry} />,
    );
    expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reintentar"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("avisa cuando no hay versiones publicadas", () => {
    render(<ChangelogList {...baseProps} entries={[]} />);
    expect(screen.getByText("Todavía no hay novedades publicadas.")).toBeInTheDocument();
  });

  it("indica que lo mostrado viene de la copia guardada", () => {
    render(<ChangelogList {...baseProps} entries={[entry("8.5.20", ["Nota"])]} fromCache />);
    expect(screen.getByText(/última copia guardada/)).toBeInTheDocument();
  });
});
