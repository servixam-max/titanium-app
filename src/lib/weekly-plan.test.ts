import { describe, it, expect } from "vitest";
import { sesionDeHoy, diaSemanaIso, yaEntrenadoHoy } from "./weekly-plan";
import { PLANES_SEMANALES, getPlanSemanal } from "./weekly-plans";

/** Fecha con un día de la semana concreto (2026-10-05 es lunes). */
function fecha(diaSemana: 1 | 2 | 3 | 4 | 5 | 6 | 7): Date {
  const lunes = new Date("2026-10-05T10:00:00");
  const d = new Date(lunes);
  d.setDate(lunes.getDate() + (diaSemana - 1));
  return d;
}

describe("Plan semanal por día de la semana", () => {
  it("diaSemanaIso usa lunes=1 y domingo=7", () => {
    expect(diaSemanaIso(fecha(1))).toBe(1); // lunes
    expect(diaSemanaIso(fecha(5))).toBe(5); // viernes
    expect(diaSemanaIso(fecha(7))).toBe(7); // domingo
  });

  it("el plan recomendado pone Día 1 el lunes", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    const hoy = sesionDeHoy(plan, fecha(1));
    expect(hoy.dias).toEqual([1]);
    expect(hoy.esDescanso).toBe(false);
  });

  it("el plan recomendado pone Día 2 el martes", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    expect(sesionDeHoy(plan, fecha(2)).dias).toEqual([2]);
  });

  it("el miércoles vuelve al Día 1 (es el plan que se pidió)", () => {
    // Este es el caso concreto: lunes D1, martes D2, miércoles D1 otra vez.
    const plan = getPlanSemanal("push-pull-4")!;
    expect(sesionDeHoy(plan, fecha(3)).dias).toEqual([1]);
  });

  it("el jueves toca Día 2 y el viernes descanso opcional", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    expect(sesionDeHoy(plan, fecha(4)).dias).toEqual([2]);

    const viernes = sesionDeHoy(plan, fecha(5));
    expect(viernes.esDescanso).toBe(true);
    expect(viernes.descansoOpcional).toBe(true);
    expect(viernes.etiqueta).toBe("Descanso opcional");
  });

  it("el domingo es descanso obligatorio, no opcional", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    const domingo = sesionDeHoy(plan, fecha(7));
    expect(domingo.esDescanso).toBe(true);
    expect(domingo.descansoOpcional).toBe(false);
  });

  it("el mismo día de la semana SIEMPRE da la misma sesión", () => {
    // Regresión del fallo: antes dependía de cuántos entrenos llevabas hechos.
    const plan = getPlanSemanal("push-pull-4")!;
    const jueves1 = sesionDeHoy(plan, fecha(4));
    const jueves2 = sesionDeHoy(plan, new Date("2026-11-19T10:00:00")); // otro jueves
    expect(jueves1.dias).toEqual(jueves2.dias);
  });

  it("sin plan, la app pide elegir uno en vez de inventarse una sesión", () => {
    const hoy = sesionDeHoy(null, fecha(1));
    expect(hoy.etiqueta).toBe("Elige un plan");
    expect(hoy.esDescanso).toBe(true);
    expect(hoy.descansoOpcional).toBe(true);
  });

  it("el motivo explica qué toca y por qué", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    const hoy = sesionDeHoy(plan, fecha(3));
    expect(hoy.motivo).toContain("Miércoles");
    expect(hoy.motivo).toContain("Día 1");
    expect(hoy.motivo).toContain(plan.name);
  });

  it("yaEntrenadoHoy detecta cuando la sesión del día está hecha", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    // Miércoles toca Día 1.
    expect(yaEntrenadoHoy(plan, [1], fecha(3))).toBe(true);
    expect(yaEntrenadoHoy(plan, [2], fecha(3))).toBe(false);
    expect(yaEntrenadoHoy(plan, [], fecha(3))).toBe(false);
  });

  it("en descanso, yaEntrenadoHoy no marca nada como hecho", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    expect(yaEntrenadoHoy(plan, [1, 2, 3], fecha(7))).toBe(false);
  });

  it("todos los planes son coherentes (días válidos y sin duplicados en un mismo día)", () => {
    for (const p of PLANES_SEMANALES) {
      for (let d = 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7; d <= 7; d = (d + 1) as typeof d) {
        const entrada = p.week[d as 1 | 2 | 3 | 4 | 5 | 6 | 7];
        expect(entrada, `${p.id} no define el día ${d}`).toBeTruthy();

        // Los días de rutina deben existir (1-18).
        for (const dia of entrada.dias) {
          expect(dia, `${p.id} día ${d} usa rutina inexistente ${dia}`).toBeGreaterThanOrEqual(1);
          expect(dia).toBeLessThanOrEqual(18);
        }
        // Sin repetir el mismo día de rutina dos veces en la misma jornada.
        expect(new Set(entrada.dias).size).toBe(entrada.dias.length);
      }
    }
  });

  it("el plan recomendado tiene 4 días de entreno por semana", () => {
    const plan = getPlanSemanal("push-pull-4")!;
    const entrenos = ([1, 2, 3, 4, 5, 6, 7] as const).filter(
      (d) => plan.week[d].dias.length > 0,
    );
    expect(entrenos.length).toBe(plan.daysPerWeek);
    expect(entrenos.length).toBe(4);
  });

  it("hay un plan recomendado y exactamente uno", () => {
    const recs = PLANES_SEMANALES.filter((p) => p.recommended);
    expect(recs.length).toBe(1);
    expect(recs[0].recomendacion).toBeTruthy();
  });
});
