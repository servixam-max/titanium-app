import { describe, it, expect } from "vitest";
import {
  decidirDestinoRecordatorio,
  rutaDelAviso,
  leerPlanSemanalId,
  RUTA_RECORDATORIO,
  PLAN_SEMANAL_STORAGE_KEY,
} from "./notification-route";

/** Fecha con un día de la semana concreto (2026-10-05 es lunes). */
function fecha(diaSemana: number): Date {
  return new Date(2026, 9, 4 + diaSemana, 19, 0, 0);
}

describe("notification-route — qué abre el recordatorio", () => {
  it("un lunes con plan abre la sesión del lunes, no la home", () => {
    const destino = decidirDestinoRecordatorio({
      planId: "push-pull-4",
      fecha: fecha(1),
    });
    expect(destino).toEqual({ tipo: "sesion", dia: 1 });
  });

  it("el mismo aviso tocado otro día abre la sesión de ESE día", () => {
    // Es el caso real: el aviso se programa el domingo para el lunes, y si se
    // toca el miércoles debe abrir lo que toca el miércoles.
    const planId = "push-pull-4";
    expect(decidirDestinoRecordatorio({ planId, fecha: fecha(2) })).toEqual({
      tipo: "sesion",
      dia: 2,
    });
    expect(decidirDestinoRecordatorio({ planId, fecha: fecha(3) })).toEqual({
      tipo: "sesion",
      dia: 1,
    });
  });

  it("en descanso obligatorio no inventa una sesión", () => {
    expect(decidirDestinoRecordatorio({ planId: "push-pull-4", fecha: fecha(7) })).toEqual({
      tipo: "inicio",
    });
  });

  it("sin plan elegido no adivina: abre la home", () => {
    expect(decidirDestinoRecordatorio({ planId: null, fecha: fecha(1) })).toEqual({
      tipo: "inicio",
    });
  });

  it("un plan que ya no existe no rompe nada", () => {
    expect(
      decidirDestinoRecordatorio({ planId: "plan-borrado", fecha: fecha(1) }),
    ).toEqual({ tipo: "inicio" });
  });

  it("con un entreno a medias vuelve a él en vez de empezar otro", () => {
    expect(
      decidirDestinoRecordatorio({
        planId: "push-pull-4",
        modoEnCurso: "individual",
        fecha: fecha(1),
      }),
    ).toEqual({ tipo: "reanudar", modo: "individual" });
  });

  it("un modo desconocido no se toma por un entreno en curso", () => {
    expect(
      decidirDestinoRecordatorio({
        planId: "push-pull-4",
        modoEnCurso: "otra-cosa",
        fecha: fecha(1),
      }),
    ).toEqual({ tipo: "sesion", dia: 1 });
  });
});

describe("notification-route — ruta del aviso", () => {
  it("los avisos nuevos apuntan a la pantalla que resuelve el día", () => {
    expect(rutaDelAviso({ route: RUTA_RECORDATORIO })).toBe("/workout/hoy");
  });

  it("los avisos ya programados con «/» también abren la sesión de hoy", () => {
    // Se programan siete días por delante: tras actualizar quedan avisos
    // viejos en el teléfono y deben funcionar igual.
    expect(rutaDelAviso({ route: "/" })).toBe(RUTA_RECORDATORIO);
  });

  it("sin datos del aviso se va a la sesión de hoy, no a la home", () => {
    expect(rutaDelAviso(undefined)).toBe(RUTA_RECORDATORIO);
    expect(rutaDelAviso(null)).toBe(RUTA_RECORDATORIO);
    expect(rutaDelAviso({})).toBe(RUTA_RECORDATORIO);
  });

  it("una ruta distinta y válida se respeta", () => {
    expect(rutaDelAviso({ route: "/history" })).toBe("/history");
  });

  it("una ruta con formato raro no se usa", () => {
    expect(rutaDelAviso({ route: "https://ejemplo.com" })).toBe(RUTA_RECORDATORIO);
    expect(rutaDelAviso({ route: 42 })).toBe(RUTA_RECORDATORIO);
  });
});

describe("notification-route — plan guardado", () => {
  it("lee el plan que guarda la home", () => {
    window.localStorage.setItem(PLAN_SEMANAL_STORAGE_KEY, "fullbody-3");
    expect(leerPlanSemanalId()).toBe("fullbody-3");
  });

  it("sin plan guardado devuelve null", () => {
    window.localStorage.removeItem(PLAN_SEMANAL_STORAGE_KEY);
    expect(leerPlanSemanalId()).toBeNull();
  });

  it("un valor vacío no cuenta como plan", () => {
    window.localStorage.setItem(PLAN_SEMANAL_STORAGE_KEY, "   ");
    expect(leerPlanSemanalId()).toBeNull();
  });
});
