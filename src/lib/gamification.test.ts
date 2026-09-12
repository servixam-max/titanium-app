import { describe, it, expect } from "vitest";
import {
  calculateTotalXP,
  getAthleteLevel,
  computeAchievements,
} from "./gamification";
import { LocalSession } from "./db";

describe("Gamification - XP & Athlete Levels", () => {
  it("calculates level 1 for 0 XP", () => {
    const level = getAthleteLevel(0);
    expect(level.currentLevel.level).toBe(1);
    expect(level.currentLevel.title).toBe("Bronce I");
    expect(level.progressPercent).toBe(0);
  });

  it("calculates progression correctly across thresholds", () => {
    const level = getAthleteLevel(600);
    expect(level.currentLevel.level).toBe(2);
    expect(level.currentLevel.title).toBe("Bronce II");
    expect(level.nextLevel?.title).toBe("Plata I");
  });

  it("calculates max level properly", () => {
    const level = getAthleteLevel(25000);
    expect(level.currentLevel.level).toBe(8);
    expect(level.currentLevel.title).toBe("Élite Legendario");
    expect(level.nextLevel).toBeNull();
    expect(level.progressPercent).toBe(100);
  });

  it("calculates XP from sessions correctly", () => {
    const mockSessions: LocalSession[] = [
      {
        id: "s1",
        clientId: "c1",
        ownerUserId: "u1",
        routineId: 1,
        mode: "guided",
        startTime: "2026-09-01T10:00:00Z",
        endTime: "2026-09-01T10:30:00Z", // 30 mins -> 60 XP
        completed: true, // 100 XP base
        totalVolume: 1000, // 1000 / 25 = 40 XP
        createdAt: "2026-09-01T10:00:00Z",
        modifiedAt: "2026-09-01T10:30:00Z",
        version: 1,
        exercises: [],
      },
    ];

    const xp = calculateTotalXP(mockSessions);
    // 100 base + 60 duration + 40 volume = 200 XP
    expect(xp).toBe(200);
  });
});

describe("Gamification - Achievements", () => {
  it("unlocks first workout achievement after 1 completed session", () => {
    const mockSessions: LocalSession[] = [
      {
        id: "s1",
        clientId: "c1",
        ownerUserId: "u1",
        routineId: 1,
        mode: "guided",
        startTime: "2026-09-01T10:00:00Z",
        endTime: "2026-09-01T10:30:00Z",
        completed: true,
        totalVolume: 500,
        createdAt: "2026-09-01T10:00:00Z",
        modifiedAt: "2026-09-01T10:30:00Z",
        version: 1,
        exercises: [],
      },
    ];

    const achievements = computeAchievements(mockSessions, 1);
    const first = achievements.find((a) => a.id === "first_workout");
    expect(first?.isUnlocked).toBe(true);
  });

  it("unlocks streak achievements when streak is achieved", () => {
    const achievements = computeAchievements([], 7);
    const streak3 = achievements.find((a) => a.id === "streak_3");
    const streak7 = achievements.find((a) => a.id === "streak_7");
    const streak30 = achievements.find((a) => a.id === "streak_30");

    expect(streak3?.isUnlocked).toBe(true);
    expect(streak7?.isUnlocked).toBe(true);
    expect(streak30?.isUnlocked).toBe(false);
  });
});
