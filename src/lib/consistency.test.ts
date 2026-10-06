import { describe, it, expect } from "vitest";
import {
  buildConsistencySummary,
  levelForVolume,
  toDateKey,
  startOfWeekMonday,
  addDays,
  describeConsistencyDay,
  CONSISTENCY_DAY_COUNT,
  CONSISTENCY_WEEK_COUNT,
  type ConsistencySessionLike,
} from "./consistency";

// El heatmap de constancia (F3.2). Lo que se decide sin React: la ventana de
// 4 semanas (lunes a domingo), el volumen por día con la regla de toda la app
// (solo sets completados), la intensidad relativa 1-4 y el resumen de días.
//
// Las fechas se construyen en hora LOCAL a propósito: los entrenos de la
// noche pertenecen al día local del usuario, no al día UTC.

/** Sesión completada con un set de `weight` kg × `reps` a una fecha local. */
function sessionAt(
  year: number,
  month: number,
  day: number,
  weight = 20,
  reps = 10,
  hour = 10,
): ConsistencySessionLike {
  return {
    completed: true,
    endTime: new Date(year, month, day, hour, 30).toISOString(),
    exercises: [{ sets: [{ completed: true, weight, reps }] }],
  };
}

// Miércoles 7 oct 2026: hoy cae a mitad de semana, así que la ventana tiene
// días pasados y futuros en la misma fila inferior.
const HOY = new Date(2026, 9, 7); // 7 oct 2026

describe("consistency — ventana de 4 semanas", () => {
  it("cubre 28 días en 4 semanas de lunes a domingo", () => {
    const resumen = buildConsistencySummary([], { today: HOY });

    expect(resumen.weeks).toHaveLength(CONSISTENCY_WEEK_COUNT);
    expect(resumen.days).toHaveLength(CONSISTENCY_DAY_COUNT);
    for (const semana of resumen.weeks) {
      expect(semana.days).toHaveLength(7);
      expect(new Date(`${semana.days[0].dateKey}T00:00:00`).getDay()).toBe(1); // lunes
      expect(new Date(`${semana.days[6].dateKey}T00:00:00`).getDay()).toBe(0); // domingo
    }
  });

  it("empieza el lunes de hace 3 semanas y termina el domingo de la actual", () => {
    const resumen = buildConsistencySummary([], { today: HOY });

    expect(resumen.days[0].dateKey).toBe("2026-09-14"); // lunes
    expect(resumen.days[27].dateKey).toBe("2026-10-11"); // domingo
    expect(resumen.weeks[0].label).toBe("14/9");
    expect(resumen.weeks[3].label).toBe("5/10");
  });

  it("marca hoy y los días futuros, que nunca cuentan como entrenados", () => {
    const resumen = buildConsistencySummary([], { today: HOY });

    const hoy = resumen.days.find((d) => d.dateKey === "2026-10-07");
    expect(hoy?.isToday).toBe(true);

    const futuros = resumen.days.filter((d) => d.isFuture);
    expect(futuros.map((d) => d.dateKey)).toEqual([
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(futuros.every((d) => !d.trained && d.level === 0)).toBe(true);

    // El resumen solo mide lo transcurrido: 14 sep → 7 oct = 24 días.
    expect(resumen.elapsedDays).toBe(24);
  });

  it("una sesión con fecha futura no pinta el día como entrenado", () => {
    const resumen = buildConsistencySummary(
      [sessionAt(2026, 9, 9)], // 9 oct, dos días después de "hoy"
      { today: HOY },
    );

    const futuro = resumen.days.find((d) => d.dateKey === "2026-10-09");
    expect(futuro?.trained).toBe(false);
    expect(resumen.trainedDays).toBe(0);
  });
});

describe("consistency — volumen por día", () => {
  it("suma peso × reps solo de los sets completados", () => {
    const sesion: ConsistencySessionLike = {
      completed: true,
      endTime: new Date(2026, 9, 6, 18, 0).toISOString(),
      exercises: [
        {
          sets: [
            { completed: true, weight: 40, reps: 10 }, // 400
            { completed: true, weight: 40, reps: 8 }, // 320
            { completed: false, weight: 100, reps: 10 }, // no cuenta
          ],
        },
        { sets: [{ completed: true, weight: 20, reps: 10 }] }, // 200
      ],
    };

    const resumen = buildConsistencySummary([sesion], { today: HOY });
    const dia = resumen.days.find((d) => d.dateKey === "2026-10-06");
    expect(dia?.volumeKg).toBe(920);
    expect(dia?.trained).toBe(true);
  });

  it("agrupa por día local: un entreno de las 23:30 es de ese día", () => {
    const resumen = buildConsistencySummary(
      [sessionAt(2026, 9, 6, 30, 10, 23)],
      { today: HOY },
    );

    const dia = resumen.days.find((d) => d.dateKey === "2026-10-06");
    expect(dia?.trained).toBe(true);
    expect(resumen.days.find((d) => d.dateKey === "2026-10-07")?.trained).toBe(false);
  });

  it("ignora sesiones sin completar, sin endTime o con fecha inválida", () => {
    const resumen = buildConsistencySummary(
      [
        { ...sessionAt(2026, 9, 20), completed: false },
        { completed: true, endTime: null, exercises: [] } as ConsistencySessionLike,
        { completed: true, endTime: "no-es-una-fecha", exercises: [] },
      ],
      { today: HOY },
    );

    expect(resumen.trainedDays).toBe(0);
  });

  it("ignora días fuera de la ventana y suma varios entrenos del mismo día", () => {
    const resumen = buildConsistencySummary(
      [
        sessionAt(2026, 8, 1), // 1 sep: fuera de la ventana (empieza el 14 sep)
        sessionAt(2026, 9, 6, 20, 10), // dos sesiones el mismo día
        sessionAt(2026, 9, 6, 20, 10),
      ],
      { today: HOY },
    );

    expect(resumen.trainedDays).toBe(1);
    const dia = resumen.days.find((d) => d.dateKey === "2026-10-06");
    expect(dia?.volumeKg).toBe(400);
  });
});

describe("consistency — niveles de intensidad 0-4", () => {
  it("reparte los niveles en proporción al día más fuerte", () => {
    const resumen = buildConsistencySummary(
      [
        sessionAt(2026, 8, 14, 100, 10), // 1000 kg → máximo → nivel 4
        sessionAt(2026, 8, 15, 60, 10), // 600 → 60 % → nivel 3
        sessionAt(2026, 8, 16, 30, 10), // 300 → 30 % → nivel 2
        sessionAt(2026, 8, 17, 10, 10), // 100 → 10 % → nivel 1
      ],
      { today: HOY },
    );

    const nivel = (fecha: string) =>
      resumen.days.find((d) => d.dateKey === fecha)?.level;

    expect(nivel("2026-09-14")).toBe(4);
    expect(nivel("2026-09-15")).toBe(3);
    expect(nivel("2026-09-16")).toBe(2);
    expect(nivel("2026-09-17")).toBe(1);
    expect(nivel("2026-09-18")).toBe(0); // sin entreno
    expect(resumen.maxDayVolumeKg).toBe(1000);
  });

  it("un día de peso corporal sin kilos anotados cuenta como entrenado", () => {
    const sesion: ConsistencySessionLike = {
      completed: true,
      endTime: new Date(2026, 9, 5, 9, 0).toISOString(),
      exercises: [{ sets: [{ completed: true, reps: 20 }] }], // sin weight
    };

    const resumen = buildConsistencySummary([sesion], { today: HOY });
    const dia = resumen.days.find((d) => d.dateKey === "2026-10-05");
    expect(dia?.trained).toBe(true);
    expect(dia?.volumeKg).toBe(0);
    expect(dia?.level).toBe(1);
  });

  it("levelForVolume respeta los umbrales 25/50/75 %", () => {
    expect(levelForVolume(0, 1000)).toBe(1);
    expect(levelForVolume(249, 1000)).toBe(1);
    expect(levelForVolume(250, 1000)).toBe(2);
    expect(levelForVolume(499, 1000)).toBe(2);
    expect(levelForVolume(500, 1000)).toBe(3);
    expect(levelForVolume(749, 1000)).toBe(3);
    expect(levelForVolume(750, 1000)).toBe(4);
    expect(levelForVolume(1000, 1000)).toBe(4);
    // Sin referencia (todo el volumen es 0): entrenar ya es nivel 1.
    expect(levelForVolume(0, 0)).toBe(1);
  });
});

describe("consistency — resumen y etiquetas", () => {
  it("calcula días entrenados y porcentaje sobre lo transcurrido", () => {
    const resumen = buildConsistencySummary(
      [
        sessionAt(2026, 8, 14),
        sessionAt(2026, 8, 16),
        sessionAt(2026, 8, 21),
        sessionAt(2026, 8, 28),
        sessionAt(2026, 9, 5),
        sessionAt(2026, 9, 7),
      ],
      { today: HOY },
    );

    expect(resumen.trainedDays).toBe(6);
    expect(resumen.elapsedDays).toBe(24);
    expect(resumen.consistencyPct).toBe(25); // 6/24 = 25 %
  });

  it("sin historial el resumen queda a cero y no divide por cero", () => {
    const resumen = buildConsistencySummary([], { today: HOY });
    expect(resumen.trainedDays).toBe(0);
    expect(resumen.consistencyPct).toBe(0);
  });

  it("las etiquetas de día son legibles en español", () => {
    const resumen = buildConsistencySummary(
      [sessionAt(2026, 8, 14, 40, 10)],
      { today: HOY },
    );
    const dia = resumen.days[0];
    expect(dia.label).toBe("lun 14 sep");
    expect(describeConsistencyDay(dia)).toBe("lun 14 sep: entrenado · 400 kg");
  });

  it("describe cada estado posible de una celda", () => {
    const sinEntrenar = buildConsistencySummary([], { today: HOY }).days[1];
    expect(describeConsistencyDay(sinEntrenar)).toContain("sin entrenar");

    const futuro = buildConsistencySummary([], { today: HOY }).days[27];
    expect(describeConsistencyDay(futuro)).toContain("aún por llegar");

    const corporal = buildConsistencySummary(
      [
        {
          completed: true,
          endTime: new Date(2026, 9, 5, 9, 0).toISOString(),
          exercises: [{ sets: [{ completed: true, reps: 20 }] }],
        },
      ],
      { today: HOY },
    ).days.find((d) => d.dateKey === "2026-10-05")!;
    expect(describeConsistencyDay(corporal)).toContain("sin peso anotado");
  });
});

describe("consistency — utilidades de fecha", () => {
  it("toDateKey usa la fecha local, no la UTC", () => {
    // Las 23:30 locales pertenecen al día local aunque en UTC sea otro día.
    expect(toDateKey(new Date(2026, 9, 6, 23, 30))).toBe("2026-10-06");
  });

  it("startOfWeekMonday devuelve el lunes tanto desde miércoles como desde domingo", () => {
    expect(toDateKey(startOfWeekMonday(new Date(2026, 9, 7)))).toBe("2026-10-05"); // miércoles
    expect(toDateKey(startOfWeekMonday(new Date(2026, 9, 11)))).toBe("2026-10-05"); // domingo
    expect(toDateKey(startOfWeekMonday(new Date(2026, 9, 5)))).toBe("2026-10-05"); // lunes
  });

  it("addDays cruza meses y años manteniendo la medianoche local", () => {
    const finDeAno = addDays(new Date(2026, 11, 30), 3);
    expect(toDateKey(finDeAno)).toBe("2027-01-02");
    expect(finDeAno.getHours()).toBe(0);
  });
});
