import { describe, it, expect } from "vitest";
import { generateWorkoutDebrief } from "./ai-debrief";
import { WorkoutSession } from "./types";

describe("ai-debrief (Smart Post-Workout Analysis)", () => {
  const mockCurrentSession: WorkoutSession = {
    id: "curr-1",
    clientId: "c1",
    ownerUserId: "u1",
    routineId: 1,
    mode: "guided",
    startTime: "2026-09-01T10:00:00Z",
    endTime: "2026-09-01T10:45:00Z",
    completed: true,
    totalVolume: 5000,
    createdAt: "2026-09-01T10:00:00Z",
    modifiedAt: "2026-09-01T10:45:00Z",
    version: 1,
    exercises: [],
  };

  it("generates headline and summary for solo session", () => {
    const debrief = generateWorkoutDebrief(mockCurrentSession, [], "Xam");
    expect(debrief.headline).toContain("Xam");
    expect(debrief.summary).toBeDefined();
    expect(debrief.suggestedRestHours).toBeGreaterThanOrEqual(24);
    expect(debrief.tags.length).toBeGreaterThan(0);
  });

  it("calculates positive progressive overload volume delta", () => {
    const pastSession: WorkoutSession = {
      ...mockCurrentSession,
      id: "past-1",
      totalVolume: 4000, // current 5000 is +25%
    };

    const debrief = generateWorkoutDebrief(mockCurrentSession, [pastSession], "Xam");
    expect(debrief.volumeDeltaPercent).toBe(25);
    expect(debrief.headline).toContain("Sobrecarga progresiva");
  });
});
