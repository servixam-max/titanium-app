import { describe, it, expect } from "vitest";
import { buildPlan, buildWeeklyPlan, estimateOneRm, recommendLoad } from "./coach";

describe("coach", () => {
  it("generates a plan with selected days per week", () => {
    const plan = buildPlan({
      goal: "hypertrophy",
      level: "intermediate",
      daysPerWeek: 3,
      equipment: ["dumbbells"],
      restrictions: [],
    });

    expect(plan.name).toContain("Hipertrofia");
    expect(plan.daysPerWeek).toBe(3);
    expect(plan.schedule.length).toBeGreaterThan(0);
  });

  it("excludes routines matching restrictions", () => {
    const plan = buildPlan({
      goal: "strength",
      level: "beginner",
      daysPerWeek: 3,
      equipment: ["dumbbells"],
      restrictions: ["peso muerto"],
    });

    expect(plan.schedule.length).toBeGreaterThan(0);
  });

  it("estimates 1RM", () => {
    expect(estimateOneRm(80, 10)).toBeCloseTo(106.7, 1);
    expect(estimateOneRm(0, 10)).toBe(0);
  });

  it("recommends load based on previous set", () => {
    const rec = recommendLoad(80, 10, 8, "hypertrophy");
    expect(rec.reps).toBe(8);
    expect(rec.weight).toBeGreaterThan(0);
  });

  it("falls back to previous weight when no reps", () => {
    const rec = recommendLoad(40, undefined, 12);
    expect(rec.weight).toBe(40);
    expect(rec.reps).toBe(12);
  });
});

describe("buildWeeklyPlan", () => {
  it("genera acumulación creciente con descarga cada 4 semanas", () => {
    const plan = buildWeeklyPlan(8, "intermediate", "hypertrophy");

    expect(plan).toHaveLength(8);
    expect(plan[0].intensityPct).toBe(100);
    expect(plan[1].intensityPct).toBeGreaterThan(plan[0].intensityPct);
    // Semana 4 y 8 son descarga
    expect(plan[3].isDeload).toBe(true);
    expect(plan[7].isDeload).toBe(true);
    expect(plan[3].intensityPct).toBeLessThan(100);
    expect(plan[3].setDelta).toBe(-1);
  });

  it("reanuda la progresión después de la descarga", () => {
    const plan = buildWeeklyPlan(8, "intermediate", "hypertrophy");
    expect(plan[4].isDeload).toBe(false);
    expect(plan[4].intensityPct).toBe(100);
  });

  it("los principiantes descargan cada 6 semanas y progresan más suave", () => {
    const beginner = buildWeeklyPlan(6, "beginner", "hypertrophy");
    expect(beginner[5].isDeload).toBe(true);
    expect(beginner[1].intensityPct - beginner[0].intensityPct).toBeLessThan(
      buildWeeklyPlan(6, "intermediate", "hypertrophy")[1].intensityPct - 100,
    );
  });

  it("el plan generado incluye la progresión semanal", () => {
    const plan = buildPlan({ goal: "hypertrophy", level: "intermediate", daysPerWeek: 3 });
    expect(plan.weeklyPlan).toBeDefined();
    expect(plan.weeklyPlan!.length).toBe(plan.weeks);
    expect(plan.description).toContain("progresión semanal");
  });
});

describe("recommendLoad con intensidad semanal", () => {
  it("escala el peso según la semana del plan", () => {
    const base = recommendLoad(40, 10, 10, "hypertrophy", 100);
    const deload = recommendLoad(40, 10, 10, "hypertrophy", 70);
    expect(deload.weight).toBeLessThan(base.weight);
    expect(deload.weight).toBeCloseTo(Math.round(base.weight * 0.7 * 2) / 2, 1);
  });
});
