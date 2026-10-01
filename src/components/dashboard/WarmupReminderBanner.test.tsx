import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WarmupReminderBanner from "./WarmupReminderBanner";

describe("WarmupReminderBanner (F2.4)", () => {
  it("muestra el aviso con los días de pausa y el consejo de calentamiento", () => {
    render(<WarmupReminderBanner daysSince={12} onDismiss={() => {}} />);

    expect(screen.getByText("Llevas 12 días sin entrenar fuerza")).toBeInTheDocument();
    expect(
      screen.getByText(/movilidad y 2 series de aproximación/i),
    ).toBeInTheDocument();
  });

  it("no aparece con entrenos recientes o sin dato", () => {
    const { container } = render(<WarmupReminderBanner daysSince={2} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();

    const sinDato = render(<WarmupReminderBanner daysSince={null} onDismiss={() => {}} />);
    expect(sinDato.container.firstChild).toBeNull();
  });

  it("se descarta con la X sin bloquear nada más", () => {
    const onDismiss = vi.fn();
    render(<WarmupReminderBanner daysSince={7} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "Descartar aviso de calentamiento" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
