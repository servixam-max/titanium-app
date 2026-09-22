import { describe, it, expect } from "vitest";
import { filterCatalog } from "./catalog-filter";
import { Exercise } from "./types";

const catalogo: Exercise[] = [
  { id: "1", name: "Press de Banca Plano", sets: 3, reps: "10", restSeconds: 75, equipment: "dumbbells", category: "chest", description: "Empuje horizontal con mancuernas" },
  { id: "2", name: "Flexiones Clásicas", sets: 3, reps: "12", restSeconds: 60, equipment: "bodyweight", category: "chest" },
  { id: "3", name: "Remo a una mano", sets: 3, reps: "10", restSeconds: 75, equipment: "dumbbells", category: "back" },
  { id: "4", name: "Plancha Abdominal", sets: 3, reps: "30s", restSeconds: 45, equipment: "bodyweight", category: "core" },
  { id: "5", name: "Burpees", sets: 4, reps: "20s", restSeconds: 20, equipment: "bodyweight", category: "hiit" },
  { id: "6", name: "Press con Mancuerna y Banda", sets: 3, reps: "12", restSeconds: 60, equipment: "both", category: "shoulders" },
];

describe("filterCatalog", () => {
  it("sin filtros devuelve todo", () => {
    expect(filterCatalog({ exercises: catalogo })).toHaveLength(6);
  });

  it("busca por nombre, descripción y categoría", () => {
    expect(filterCatalog({ exercises: catalogo, query: "banca" }).map((e) => e.id)).toEqual(["1"]);
    expect(filterCatalog({ exercises: catalogo, query: "empuje" }).map((e) => e.id)).toEqual(["1"]);
    expect(filterCatalog({ exercises: catalogo, query: "back" }).map((e) => e.id)).toEqual(["3"]);
  });

  it("ignora mayúsculas y espacios sobrantes", () => {
    expect(filterCatalog({ exercises: catalogo, query: "  BURPEES  " }).map((e) => e.id)).toEqual(["5"]);
  });

  it("agrupa core y full_body como hace la interfaz", () => {
    expect(filterCatalog({ exercises: catalogo, muscle: "core" }).map((e) => e.id)).toEqual(["4"]);
    // full_body incluye también los ejercicios HIIT
    expect(filterCatalog({ exercises: catalogo, muscle: "full_body" }).map((e) => e.id)).toEqual(["5"]);
  });

  it("filtra por músculo concreto", () => {
    expect(filterCatalog({ exercises: catalogo, muscle: "chest" }).map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("el equipamiento 'both' aparece en cualquier filtro específico", () => {
    expect(filterCatalog({ exercises: catalogo, equipment: "dumbbells" }).map((e) => e.id)).toEqual(["1", "3", "6"]);
    expect(filterCatalog({ exercises: catalogo, equipment: "bodyweight" }).map((e) => e.id)).toEqual(["2", "4", "5", "6"]);
  });

  it("combina los tres filtros", () => {
    expect(
      filterCatalog({ exercises: catalogo, query: "press", muscle: "shoulders", equipment: "dumbbells" }).map((e) => e.id),
    ).toEqual(["6"]);
    expect(filterCatalog({ exercises: catalogo, query: "press", muscle: "core" })).toHaveLength(0);
  });
});
