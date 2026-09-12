import { describe, it, expect } from "vitest";
import { buildPlan, estimateOneRm, recommendLoad } from "./coach";

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
