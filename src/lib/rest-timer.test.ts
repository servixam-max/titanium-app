import { describe, it, expect } from "vitest";
import {
  formatRestClock,
  isRestUrgent,
  restRemainingFraction,
} from "./rest-timer";

describe("formatRestClock — reloj del descanso flotante (F2.2)", () => {
  it("formatea minutos y segundos con dos cifras", () => {
    expect(formatRestClock(75)).toBe("1:15");
    expect(formatRestClock(60)).toBe("1:00");
    expect(formatRestClock(300)).toBe("5:00");
  });

  it("por debajo del minuto mantiene el cero delante", () => {
    expect(formatRestClock(59)).toBe("0:59");
    expect(formatRestClock(8)).toBe("0:08");
    expect(formatRestClock(0)).toBe("0:00");
  });

  it("los valores raros no rompen el reloj", () => {
    expect(formatRestClock(-5)).toBe("0:00");
    expect(formatRestClock(NaN)).toBe("0:00");
    expect(formatRestClock(12.7)).toBe("0:12");
  });
});

describe("isRestUrgent — último tramo del descanso", () => {
  it("marca los últimos 10 segundos", () => {
    expect(isRestUrgent(10)).toBe(true);
    expect(isRestUrgent(1)).toBe(true);
  });

  it("no marca el resto ni el cero", () => {
    expect(isRestUrgent(11)).toBe(false);
    expect(isRestUrgent(0)).toBe(false);
    expect(isRestUrgent(-3)).toBe(false);
  });
});

describe("restRemainingFraction — anillo de progreso", () => {
  it("devuelve la fracción restante del total", () => {
    expect(restRemainingFraction(75, 75)).toBe(1);
    expect(restRemainingFraction(37.5, 75)).toBe(0.5);
    expect(restRemainingFraction(0, 75)).toBe(0);
  });

  it("se recorta a 0..1 y aguanta totales inválidos", () => {
    expect(restRemainingFraction(90, 75)).toBe(1);
    expect(restRemainingFraction(-1, 75)).toBe(0);
    expect(restRemainingFraction(30, 0)).toBe(0);
  });
});
