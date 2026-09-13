import { describe, it, expect } from "vitest";
import {
  parseWorkoutVoiceCommand,
  formatVoiceConfirmation,
} from "./voice-parser";

describe("voice-parser (NLP Voice Workout Commands)", () => {
  it("parses standard reps and weight in numbers", () => {
    const res = parseWorkoutVoiceCommand("12 repeticiones con 22 kilos");
    expect(res.reps).toBe(12);
    expect(res.weight).toBe(22);
    expect(res.matchedFields).toContain("reps");
    expect(res.matchedFields).toContain("weight");
  });

  it("parses weight with decimal/fraction 'y medio'", () => {
    const res = parseWorkoutVoiceCommand("10 reps con 17 y medio kilos");
    expect(res.reps).toBe(10);
    expect(res.weight).toBe(17.5);
  });

  it("parses Spanish word numbers", () => {
    const res = parseWorkoutVoiceCommand("ocho repeticiones con treinta kilos");
    expect(res.reps).toBe(8);
    expect(res.weight).toBe(30);
  });

  it("parses RPE and autoSubmit command", () => {
    const res = parseWorkoutVoiceCommand("10 reps con 40 kilos rpe 9 guardar");
    expect(res.reps).toBe(10);
    expect(res.weight).toBe(40);
    expect(res.rpe).toBe(9);
    expect(res.autoSubmit).toBe(true);
  });

  it("handles combo shorthand (10 por 25)", () => {
    const res = parseWorkoutVoiceCommand("10 por 25");
    expect(res.reps).toBe(10);
    expect(res.weight).toBe(25);
  });

  it("formats audio confirmation properly", () => {
    const parsed = parseWorkoutVoiceCommand("12 reps con 20 kg guardar");
    const msg = formatVoiceConfirmation(parsed);
    expect(msg).toContain("20 kilos");
    expect(msg).toContain("12 repeticiones");
    expect(msg).toContain("Guardando serie");
  });
});
