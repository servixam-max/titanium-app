import { describe, it, expect } from "vitest";
import { calculateAdaptiveRest, detectSupersetGroups, isInSuperset, getSupersetPartner } from "./workout";
import { Routine } from "./types";

describe("workout helpers", () => {
  it("respeta el descanso prescrito cuando no hay RPE", () => {
    // Los días de fuerza prescriben 75 s y deben quedarse en 75 s.
    expect(calculateAdaptiveRest({ baseRestSeconds: 75 })).toBe(75);
    expect(calculateAdaptiveRest({ baseRestSeconds: 60 })).toBe(60);
  });

  it("alarga el descanso si el esfuerzo fue máximo", () => {
    expect(calculateAdaptiveRest({ baseRestSeconds: 75, lastSetRpe: 9 })).toBe(95);
  });

  it("acorta el descanso si la serie fue cómoda", () => {
    expect(calculateAdaptiveRest({ baseRestSeconds: 75, lastSetRpe: 5 })).toBe(60);
  });

  it("suma recuperación en series largas por tiempo", () => {
    expect(calculateAdaptiveRest({ baseRestSeconds: 20, lastSetDuration: 40 })).toBe(40);
  });

  it("acota el resultado entre 15 y 300 segundos", () => {
    expect(calculateAdaptiveRest({ baseRestSeconds: 5 })).toBe(15);
    expect(calculateAdaptiveRest({ baseRestSeconds: 400 })).toBe(300);
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
