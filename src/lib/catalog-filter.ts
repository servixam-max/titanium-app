// FORTIXAM — filtro del catálogo de ejercicios
//
// Estaba duplicado literalmente en la home y en el constructor de rutinas.
// Vive aquí para que las dos pantallas filtren siempre igual (y pueda probarse).

import { Exercise, MuscleCategory, EquipmentType } from "./types";

export type EquipmentFilterValue = "all" | EquipmentType;

export interface CatalogFilterInput {
  exercises: Exercise[];
  query?: string;
  muscle?: MuscleCategory | "all";
  equipment?: EquipmentFilterValue;
}

/** ¿El ejercicio encaja con el texto buscado? Nombre, descripción o categoría. */
function matchesQuery(exercise: Exercise, query: string): boolean {
  if (!query) return true;
  return (
    exercise.name.toLowerCase().includes(query) ||
    (exercise.description?.toLowerCase().includes(query) ?? false) ||
    (exercise.category?.toLowerCase().includes(query) ?? false)
  );
}

function matchesMuscle(exercise: Exercise, muscle: MuscleCategory | "all"): boolean {
  if (muscle === "all") return true;

  // "core" y "full_body" agrupan varias categorías del catálogo
  if (muscle === "core") return exercise.category === "core";
  if (muscle === "full_body") {
    return exercise.category === "full_body" || exercise.category === "hiit";
  }
  return exercise.category === muscle;
}

function matchesEquipment(exercise: Exercise, equipment: EquipmentFilterValue): boolean {
  if (equipment === "all") return true;
  return exercise.equipment === equipment || exercise.equipment === "both";
}

export function filterCatalog({
  exercises,
  query = "",
  muscle = "all",
  equipment = "all",
}: CatalogFilterInput): Exercise[] {
  const q = query.toLowerCase().trim();
  return exercises.filter(
    (exercise) =>
      matchesQuery(exercise, q) &&
      matchesMuscle(exercise, muscle) &&
      matchesEquipment(exercise, equipment),
  );
}
