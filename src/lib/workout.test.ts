import { describe, it, expect } from "vitest";
import { calculateAdaptiveRest, detectSupersetGroups, isInSuperset, getSupersetPartner } from "./workout";
import { Routine } from "./types";

describe("workout helpers", () => {
  it("adapts rest based on RPE and goal", () => {
    const rest = calculateAdaptiveRest({ baseRestSeconds: 60, lastSetRpe: 9, exerciseType: "compound", goal: "strength" });
    expect(rest).toBeGreaterThan(60);
  });

  it("caps rest between 15 and 300 seconds", () => {
    expect(calculateAdaptiveRest({ baseRestSeconds: 5, exerciseType: "isolation" })).toBe(15);
    expect(calculateAdaptiveRest({ baseRestSeconds: 400, exerciseType: "isolation" })).toBe(300);
  });

  it("detects push/pull supersets", () => {
    const routine = {
      day: 1,
      title: "Test",
      subtitle: "",
      type: "strength" as const,
      duration: "30 min",
      difficulty: "Intermedio" as const,
      equipment: "Mancuernas",
      exercises: [
        { id: "push1", name: "Press", category: "chest", sets: 3, reps: "10", restSeconds: 75, equipment: "dumbbells" },
        { id: "pull1", name: "Remo", category: "back", sets: 3, reps: "10", restSeconds: 75, equipment: "dumbbells" },
      ],
    } as Routine;
    const groups = detectSupersetGroups(routine);
    expect(groups.length).toBeGreaterThan(0);
    expect(isInSuperset("push1", groups)).toBe(true);
    expect(getSupersetPartner("push1", groups)).toBe("pull1");
  });
});
