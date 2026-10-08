import { describe, it, expect } from "vitest";
import { descansoRecomendado } from "./rest-guide";

/**
 * Descansos por tipo de ejercicio.
 *
 * El fallo que evita esto: el catálogo usaba 75 s para casi todo (247
 * ejercicios), así que una sentadilla pesada y un curl de bíceps descansaban lo
 * mismo. Ni es fisiológico ni tiene sentido para el usuario.
 */
describe("Descanso recomendado por tipo de ejercicio", () => {
  it("pierna pesada descansa más que un aislamiento", () => {
    const pierna = descansoRecomendado("Peso Muerto con Mancuernas");
    const biceps = descansoRecomendado("Curl de Bíceps Clásico");

    expect(pierna.segundos).toBe(120);
    expect(biceps.segundos).toBe(60);
    expect(pierna.segundos).toBeGreaterThan(biceps.segundos);
  });

  it("un multiarticular de torso queda entre los dos", () => {
    const banca = descansoRecomendado("Press de Banca Plano");
    expect(banca.segundos).toBe(90);
    expect(banca.categoria).toBe("multiarticular");
  });

  it("lo metabólico no pide descanso largo aunque nombre pierna", () => {
    // Una sentadilla CON SALTO es trabajo metabólico: debe descansar poco,
    // no 2 minutos. Es el caso que un criterio ingenuo confundiría.
    const salto = descansoRecomendado("Saltos en Sentadilla (Jump Squats)");
    expect(salto.segundos).toBe(30);
    expect(salto.categoria).toBe("metabolico");
  });

  it("los isométricos descansan 60 s", () => {
    expect(descansoRecomendado("Plancha Activa").segundos).toBe(60);
    expect(descansoRecomendado("Wall Sit Isométrico").segundos).toBe(60);
  });

  it("el burpee descansa 30 s (es pulso, no fuerza)", () => {
    expect(descansoRecomendado("Burpees al Fallo").segundos).toBe(30);
  });

  it("acierta también sin nombre reconocible, usando la categoría", () => {
    expect(descansoRecomendado("Ejercicio raro", "legs").segundos).toBe(120);
    expect(descansoRecomendado("Ejercicio raro", "chest").segundos).toBe(90);
    expect(descansoRecomendado("Ejercicio raro", "biceps").segundos).toBe(60);
    expect(descansoRecomendado("Ejercicio raro", "full_body").segundos).toBe(45);
  });

  it("nunca devuelve un descanso absurdo", () => {
    const nombres = [
      "Press de Banca Plano",
      "Sentadilla Goblet",
      "Curl Martillo",
      "Burpees",
      "Plancha",
      "",
      undefined as unknown as string,
    ];
    nombres.forEach((n) => {
      const { segundos } = descansoRecomendado(n);
      expect(segundos).toBeGreaterThanOrEqual(30);
      expect(segundos).toBeLessThanOrEqual(120);
    });
  });
});
