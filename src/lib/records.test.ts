import { describe, it, expect } from "vitest";
import { estimate1RM, checkNewSetRecord } from "./records";

describe("estimate1RM (Epley formula)", () => {
  it("returns 0 when weight or reps are 0", () => {
    expect(estimate1RM(0, 10)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });

  it("returns the exact weight when reps is 1", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("calculates estimated 1RM for standard reps", () => {
    // 100 kg x 10 reps -> 100 * (1 + 10/30) = 133.33 -> 133
    expect(estimate1RM(100, 10)).toBe(133);
    // 60 kg x 5 reps -> 60 * (1 + 5/30) = 70
    expect(estimate1RM(60, 5)).toBe(70);
  });
});

describe("checkNewSetRecord", () => {
  const existingRecord = {
    exerciseId: "bench-press",
    exerciseName: "Press Banca",
    bestWeight: 80,
    bestVolume: 800,
    bestEstimated1RM: 100,
    totalSets: 10,
    totalReps: 100,
    lastDate: "2026-09-01",
  };

  it("identifies a new best weight record", () => {
    const result = checkNewSetRecord("bench-press", 85, 5, existingRecord);
    expect(result.isBestWeight).toBe(true);
  });

  it("identifies when no record is broken", () => {
    const result = checkNewSetRecord("bench-press", 70, 8, existingRecord);
    expect(result.isBestWeight).toBe(false);
    expect(result.isBestVolume).toBe(false);
    expect(result.isBest1RM).toBe(false);
  });

  it("identifies when there is no existing record (first time)", () => {
    const result = checkNewSetRecord("squat", 50, 10, undefined);
    expect(result.isBestWeight).toBe(true);
    expect(result.isBestVolume).toBe(true);
    expect(result.isBest1RM).toBe(true);
  });
});
