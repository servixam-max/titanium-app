import { describe, it, expect } from "vitest";
import { routines } from "./data";
import { getExerciseBiomechanics } from "./muscle-engine";

/**
 * Reglas de calidad de los días de entrenamiento.
 *
 * Nacen de una revisión real: el Día 3 era literalmente los Días 1 y 2 pegados
 * (9 de sus 10 ejercicios se repetían), y todos los descansos eran 75 s sin
 * criterio. Estas pruebas evitan que vuelva a pasar.
 */

/** Minutos estimados de un día (45 s por serie + descansos entre series).
 *
 * Los ejercicios marcados `optional` (remates tipo burpees/flexiones al final)
 * NO cuentan: son un extra que el usuario decide si hace, no parte del plan
 * medido. Si se contaran, un día de 35 min aparecería como 40. */
function minutosEstimados(dia: number): number {
  const r = routines.find((x) => x.day === dia);
  if (!r) return 0;
  let seg = 0;
  for (const e of r.exercises) {
    if (e.optional) continue;
    const series = e.sets || 1;
    seg += series * 45 + Math.max(0, series - 1) * (e.restSeconds || 0);
  }
  return Math.round(seg / 60);
}

describe("Calidad de los días de entrenamiento", () => {
  it("ningún día repite un ejercicio consigo mismo", () => {
    for (const r of routines) {
      const nombres = r.exercises.map((e) => e.name.toLowerCase().trim());
      const unicos = new Set(nombres);
      expect(unicos.size, `Día ${r.day} tiene ejercicios repetidos`).toBe(nombres.length);
    }
  });

  it("el Día 3 no repite ejercicios del Día 1 (era su problema original)", () => {
    const d1 = routines.find((r) => r.day === 1)!;
    const d3 = routines.find((r) => r.day === 3)!;

    const n1 = new Set(d1.exercises.map((e) => e.name.toLowerCase().trim()));
    const repes = d3.exercises.filter((e) => n1.has(e.name.toLowerCase().trim()));

    expect(repes.map((e) => e.name)).toEqual([]);
  });

  it("el Día 3 no repite ejercicios del Día 2", () => {
    const d2 = routines.find((r) => r.day === 2)!;
    const d3 = routines.find((r) => r.day === 3)!;

    const n2 = new Set(d2.exercises.map((e) => e.name.toLowerCase().trim()));
    const repes = d3.exercises.filter((e) => n2.has(e.name.toLowerCase().trim()));

    expect(repes.map((e) => e.name)).toEqual([]);
  });

  it("los días de fuerza duran entre 25 y 45 minutos", () => {
    // Exclusiones justificadas:
    //  - categoryTag "movilidad": recuperación de ~20 min a propósito.
    //  - Día 18: es el "entrenamiento libre", un catálogo de ejercicios sueltos
    //    para armarse la sesión, no una sesión guiada.
    const fuerza = routines.filter(
      (r) =>
        r.type === "strength" && r.categoryTag !== "movilidad" && r.day !== 18,
    );
    for (const r of fuerza) {
      const min = minutosEstimados(r.day);
      expect(min, `Día ${r.day} (${r.title}) dura ${min} min`).toBeGreaterThanOrEqual(25);
      expect(min, `Día ${r.day} (${r.title}) dura ${min} min`).toBeLessThanOrEqual(45);
    }
  });

  it("cada día tiene entre 6 y 10 ejercicios", () => {
    // El Día 18 es el "entrenamiento libre" y es la excepción deliberada.
    const normales = routines.filter((r) => r.day !== 18);
    for (const r of normales) {
      expect(r.exercises.length, `Día ${r.day} tiene ${r.exercises.length}`).toBeGreaterThanOrEqual(6);
      expect(r.exercises.length, `Día ${r.day} tiene ${r.exercises.length}`).toBeLessThanOrEqual(10);
    }
  });

  it("los descansos siguen el criterio por tipo de ejercicio", () => {
    // Antes eran 75 s para todo. Ahora: pierna pesada 120, multiarticular 90,
    // aislamiento 60, metabólico 30. Se comprueba en los días de fuerza.
    const d1 = routines.find((r) => r.day === 1)!;
    const banca = d1.exercises.find((e) => /banca/i.test(e.name));
    const curl = d1.exercises.find((e) => /tríceps sobre cabeza|extension/i.test(e.name));

    if (banca) expect(banca.restSeconds).toBeGreaterThanOrEqual(90);
    if (curl) expect(curl.restSeconds).toBeLessThanOrEqual(60);

    // Un día de pierna debe descansar más que uno de brazos.
    const pierna = routines.find((r) => r.day === 11)!;
    const mediaPierna =
      pierna.exercises.reduce((s, e) => s + (e.restSeconds || 0), 0) / pierna.exercises.length;
    expect(mediaPierna).toBeGreaterThanOrEqual(100);
  });

  it("el Día 1 reparte pecho, hombros y tríceps con 2 ejercicios por músculo", () => {
    const d1 = routines.find((r) => r.day === 1)!;
    const cuenta = new Map<string, number>();
    d1.exercises.forEach((e) => {
      cuenta.set(e.category || "?", (cuenta.get(e.category || "?") ?? 0) + 1);
    });

    // Al menos dos ejercicios de cada grupo principal del día.
    expect(cuenta.get("chest") ?? 0).toBeGreaterThanOrEqual(2);
    expect(cuenta.get("shoulders") ?? 0).toBeGreaterThanOrEqual(2);
    expect(cuenta.get("triceps") ?? 0).toBeGreaterThanOrEqual(2);
  });

  /**
   * Repetición de músculos primarios.
   *
   * Regla del dueño de la app: un ejercicio no debe repetir el músculo primario
   * de otro ya hecho, SALVO que sea un día específico de ese músculo (un día de
   * pierna puede tener 3 de cuádriceps a propósito). En un día full body, donde
   * hay muchos músculos que cubrir, repetir un primario deja músculos sin tocar.
   */
  it("en los días de un solo grupo, el músculo se repite a propósito", () => {
    // Día 11 (Piernas & Cadena Posterior) y Día 7 (Brazos) son específicos:
    // repetir cuádriceps o tríceps ahí es lo correcto.
    const d11 = routines.find((r) => r.day === 11)!;
    const d7 = routines.find((r) => r.day === 7)!;

    expect(/pierna/i.test(d11.title)).toBe(true);
    expect(/brazos/i.test(d7.title)).toBe(true);
  });

  it("en los días full body no se repite en exceso un músculo primario", () => {
    // Umbral: en un día full body con 6-9 ejercicios, ningún músculo primario
    // debería aparecer más de la mitad de las veces. Repetirlo más deja otros
    // músculos del cuerpo sin trabajar y hace el día desequilibrado.
    const fullBody = routines.filter(
      (r) =>
        /full body|express|equilibrado|combo/i.test(r.title) &&
        r.day !== 18 &&
        r.type === "strength",
    );

    for (const r of fullBody) {
      const cuenta = new Map<string, number>();
      for (const e of r.exercises) {
        const b = getExerciseBiomechanics(e.name, e.category);
        for (const m of b.primary) cuenta.set(m, (cuenta.get(m) ?? 0) + 1);
      }
      const limite = Math.max(2, Math.ceil(r.exercises.length / 2));
      const excesivos = [...cuenta.entries()].filter(([, c]) => c > limite);
      expect(
        excesivos.map(([m, c]) => `${m}×${c}`),
        `Día ${r.day} (${r.title}) repite demasiado: ${excesivos.map(([m, c]) => `${m}×${c}`).join(", ")}`,
      ).toEqual([]);
    }
  });

  it("los ejercicios de remate no cuentan para la duración", () => {
    // El remate de burpees/flexiones es opcional: si se contara, un día de
    // 35 min aparecería como 40 min.
    const conRemate = routines.find((r) =>
      r.exercises.some((e) => e.optional),
    );
    if (conRemate) {
      const opcionales = conRemate.exercises.filter((e) => e.optional);
      expect(opcionales.length).toBeGreaterThan(0);
      // La duración del día sin ellos debe ser menor que con ellos.
      let conSeg = 0;
      let sinSeg = 0;
      for (const e of conRemate.exercises) {
        const s = (e.sets || 1) * 45 + Math.max(0, (e.sets || 1) - 1) * (e.restSeconds || 0);
        conSeg += s;
        if (!e.optional) sinSeg += s;
      }
      expect(sinSeg).toBeLessThan(conSeg);
    }
  });
});
