import { describe, it, expect } from "vitest";
import { decideBackAction, type BackContext } from "./back-navigation";

/**
 * El fallo que arregla esto: en un móvil con navegación por gestos, deslizar
 * desde el borde CERRABA la app en vez de retroceder. Estas pruebas fijan el
 * orden correcto para que no vuelva a pasar.
 */
describe("Gesto atrás de Android — qué debe hacer", () => {
  const base: BackContext = {
    canGoBack: false,
    historyLength: 1,
    pathname: "/",
    hasOpenModal: false,
  };

  it("cierra el modal si hay uno abierto, sin navegar ni salir", () => {
    // Es el caso más molesto: estás en un diálogo y atrás te saca de la app.
    expect(
      decideBackAction({ ...base, hasOpenModal: true, pathname: "/stats", canGoBack: true }),
    ).toBe("close-modal");
  });

  it("retrocede dentro de la app cuando el WebView dice que puede", () => {
    expect(decideBackAction({ ...base, canGoBack: true, pathname: "/stats" })).toBe("history-back");
  });

  it("retrocede cuando hay historial aunque el plugin diga que no", () => {
    // Caso real medido en el emulador: el routing SPA deja canGoBack=false
    // pero el historial sí existe.
    expect(decideBackAction({ ...base, canGoBack: false, historyLength: 3, pathname: "/stats" })).toBe(
      "history-back",
    );
  });

  it("vuelve a la home si no hay historial y no estamos en ella", () => {
    expect(decideBackAction({ ...base, pathname: "/weight" })).toBe("go-home");
  });

  it("sale solo en la home sin historial (comportamiento esperado)", () => {
    expect(decideBackAction({ ...base, pathname: "/" })).toBe("exit");
  });

  it("nunca sale de la app fuera de la home si hay historial", () => {
    // Regresión concreta: el gesto cerraba la app estando en /stats.
    const enStats = decideBackAction({
      canGoBack: true,
      historyLength: 2,
      pathname: "/stats",
      hasOpenModal: false,
    });
    expect(enStats).not.toBe("exit");
  });
});
