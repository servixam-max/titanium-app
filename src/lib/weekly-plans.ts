/**
 * Planes semanales por día de la semana.
 *
 * Sustituyen a los planes por contador (`schedule: [1,2,3,...]`), que decidían
 * la sesión de hoy según cuántos entrenos llevabas hechos en vez de según qué
 * día es. Estos se definen por día de la semana (1=lunes … 7=domingo).
 *
 * Cada plan declara en `recomendacion` por qué encaja, para que la UI pueda
 * aconsejar sin inventarse justificaciones.
 */

import type { PlanSemanal } from "./weekly-plan";

/** Descanso obligatorio (no se ofrece entrenar). */
const DESCANSO = { dias: [] as number[], descansoOpcional: false };
/** Descanso pero se puede entrenar si apetece. */
const DESCANSO_OPCIONAL = { dias: [] as number[], descansoOpcional: true };

export const PLANES_SEMANALES: PlanSemanal[] = [
  {
    id: "push-pull-4",
    name: "Empuje · Tirón (recomendado)",
    description:
      "Lunes Día 1 y martes Día 2, repetido: cuatro sesiones de lunes a jueves y descanso el fin de semana.",
    daysPerWeek: 4,
    weeks: 4,
    week: {
      1: { dias: [1], etiqueta: "Empuje" },
      2: { dias: [2], etiqueta: "Tirón + Pierna" },
      3: { dias: [1], etiqueta: "Empuje" },
      4: { dias: [2], etiqueta: "Tirón + Pierna" },
      5: DESCANSO_OPCIONAL,
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["fuerza", "4 días", "30-35 min"],
    recommended: true,
    recomendacion:
      "El más equilibrado para progresar: cada músculo recibe dos estímulos por semana con un día de separación, y el fin de semana queda libre para descansar o hacer algo suave.",
  },
  {
    id: "fullbody-3",
    name: "Full Body 3 días",
    description:
      "Lunes, miércoles y viernes: sesiones completas con descanso entre medias para recuperar bien.",
    daysPerWeek: 3,
    weeks: 4,
    week: {
      1: { dias: [3], etiqueta: "Full Body" },
      2: DESCANSO_OPCIONAL,
      3: { dias: [3], etiqueta: "Full Body" },
      4: DESCANSO_OPCIONAL,
      5: { dias: [3], etiqueta: "Full Body" },
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["fuerza", "3 días", "35 min"],
    recomendacion:
      "Ideal si solo puedes entrenar tres días: cada sesión toca todo el cuerpo y siempre hay un día de descanso antes de la siguiente.",
  },
  {
    id: "principiante-3",
    name: "Empezando 3 días",
    description:
      "Lunes Empuje, miércoles Tirón y viernes Pierna. Sesiones cortas y muy separadas para no sobrecargar.",
    daysPerWeek: 3,
    weeks: 4,
    week: {
      1: { dias: [1], etiqueta: "Empuje" },
      2: DESCANSO_OPCIONAL,
      3: { dias: [2], etiqueta: "Tirón + Pierna" },
      4: DESCANSO_OPCIONAL,
      5: { dias: [6], etiqueta: "Pierna & Glúteo" },
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["principiante", "3 días", "30-35 min"],
    recomendacion:
      "Para empezar sin agujetas que te echen para atrás: dos días de descanso entre sesiones y volumen bajo.",
  },
  {
    id: "fuerza-4",
    name: "Fuerza 4 días",
    description:
      "Empuje, Tirón, Torso Power y Pierna repartidos de lunes a jueves para quien quiere más volumen.",
    daysPerWeek: 4,
    weeks: 4,
    week: {
      1: { dias: [1], etiqueta: "Empuje" },
      2: { dias: [2], etiqueta: "Tirón + Pierna" },
      3: { dias: [5], etiqueta: "Torso Power" },
      4: { dias: [6], etiqueta: "Pierna & Glúteo" },
      5: DESCANSO_OPCIONAL,
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["fuerza", "hipertrofia", "4 días"],
    recomendacion:
      "Más volumen por músculo que el plan de empuje/tirón, a cambio de sesiones algo más largas.",
  },
  {
    id: "fuerza-cardio-5",
    name: "Fuerza + Cardio 5 días",
    description:
      "Tres días de fuerza y dos de HIIT intercalados: lunes, miércoles y viernes fuerza; martes y jueves cardio.",
    daysPerWeek: 5,
    weeks: 4,
    week: {
      1: { dias: [1], etiqueta: "Empuje" },
      2: { dias: [4], etiqueta: "HIIT" },
      3: { dias: [2], etiqueta: "Tirón + Pierna" },
      4: { dias: [9], etiqueta: "HIIT" },
      5: { dias: [3], etiqueta: "Full Body" },
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["fuerza", "cardio", "5 días"],
    recomendacion:
      "Añade trabajo cardiovascular sin perder el estímulo de fuerza, alternando para no acumular fatiga en las piernas.",
  },
  {
    id: "hiit-3",
    name: "Cardio 3 días",
    description:
      "HIIT lunes, miércoles y viernes. Sesiones cortas de alta intensidad para mejorar el fondo.",
    daysPerWeek: 3,
    weeks: 4,
    week: {
      1: { dias: [4], etiqueta: "HIIT Full Body" },
      2: DESCANSO_OPCIONAL,
      3: { dias: [9], etiqueta: "HIIT & Tabata" },
      4: DESCANSO_OPCIONAL,
      5: { dias: [13], etiqueta: "Tabata" },
      6: DESCANSO_OPCIONAL,
      7: DESCANSO,
    },
    tags: ["cardio", "3 días", "20-30 min"],
    recomendacion:
      "Para el fondo y bajar grasa sin tocar pesas: todo el trabajo es cardiovascular y las sesiones son cortas.",
  },
  {
    id: "libre",
    name: "Sin plan (libre)",
    description:
      "Eliges tú la sesión cada día. La app te propone una continuación, pero no te impone nada.",
    daysPerWeek: 0,
    weeks: 0,
    week: {
      1: DESCANSO_OPCIONAL,
      2: DESCANSO_OPCIONAL,
      3: DESCANSO_OPCIONAL,
      4: DESCANSO_OPCIONAL,
      5: DESCANSO_OPCIONAL,
      6: DESCANSO_OPCIONAL,
      7: DESCANSO_OPCIONAL,
    },
    tags: ["libre"],
    recomendacion:
      "Si ya entrenas por tu cuenta o quieres ir decidiendo sobre la marcha día a día.",
  },
];

export function getPlanSemanal(id: string): PlanSemanal | undefined {
  return PLANES_SEMANALES.find((p) => p.id === id);
}
