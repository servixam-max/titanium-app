import { describe, it, expect } from "vitest";
import {
  countSetsDonePerRound,
  decideSupersetAdvance,
  getSupersetMembers,
  getSupersetPartnerInRoutine,
  normalizeSupersetGroup,
} from "./supersets";
import { Exercise, ExerciseLog } from "./types";

/** Ejercicio rutinario con los mínimos necesarios para la decisión. */
function ex(
  id: string,
  sets: number,
  restSeconds: number,
  supersetGroup?: string,
): Exercise {
  return {
    id,
    name: id,
    sets,
    reps: "10",
    restSeconds,
    equipment: "dumbbells",
    supersetGroup,
  };
}

/** Registro de sesión con N series completadas. */
function log(index: string, completedSets: number): ExerciseLog {
  return {
    id: `log-${index}`,
    clientId: "c",
    ownerUserId: "u",
    createdAt: "2026-10-02T10:00:00.000Z",
    modifiedAt: "2026-10-02T10:00:00.000Z",
    version: 1,
    exerciseId: index,
    exerciseName: index,
    order: 0,
    sets: Array.from({ length: completedSets }, (_, i) => ({
      id: `set-${i}`,
      clientId: "c",
      ownerUserId: "u",
      createdAt: "2026-10-02T10:00:00.000Z",
      modifiedAt: "2026-10-02T10:00:00.000Z",
      version: 1,
      setNumber: i + 1,
      completed: true,
      timestamp: "2026-10-02T10:00:00.000Z",
    })),
  };
}

/** Par clásico: press de pecho + remo de espalda en superserie. */
const PAR = [ex("press", 3, 75, "ss-1"), ex("remo", 3, 90, "ss-1"), ex("curl", 3, 60)];
const ALL_DONE_PAR = [3, 3, 0];

describe("normalizeSupersetGroup — el grupo se normaliza", () => {
  it("recorta los espacios de los extremos", () => {
    expect(normalizeSupersetGroup("  ss-1  ")).toBe("ss-1");
  });

  it("un grupo vacío no agrupa a nadie", () => {
    expect(normalizeSupersetGroup("")).toBeUndefined();
    expect(normalizeSupersetGroup("   ")).toBeUndefined();
    expect(normalizeSupersetGroup(undefined)).toBeUndefined();
    expect(normalizeSupersetGroup(null)).toBeUndefined();
  });
});

describe("getSupersetMembers / getSupersetPartnerInRoutine — quién forma el par", () => {
  it("agrupa los ejercicios que comparten el mismo grupo", () => {
    const partners = getSupersetMembers(PAR, PAR[0]);
    expect(partners.map((m) => m.exercise.id)).toEqual(["press", "remo"]);
  });

  it("el compañero del press es el remo y el del remo es el press", () => {
    expect(getSupersetPartnerInRoutine(PAR, PAR[0])?.id).toBe("remo");
    expect(getSupersetPartnerInRoutine(PAR, PAR[1])?.id).toBe("press");
  });

  it("un ejercicio sin grupo o en grupo solitario no tiene compañero", () => {
    const solo = [ex("press", 3, 75, "ss-solo"), ex("remo", 3, 90)];
    expect(getSupersetPartnerInRoutine(solo, solo[0])).toBeUndefined();
    expect(getSupersetPartnerInRoutine(PAR, PAR[2])).toBeUndefined();
  });

  it("un campo de grupo mal formado (espacios) también agrupa", () => {
    const routine = [ex("press", 3, 75, " ss-1 "), ex("remo", 3, 90, "ss-1")];
    expect(getSupersetPartnerInRoutine(routine, routine[0])?.id).toBe("remo");
  });
});

describe("decideSupersetAdvance — encadenar sin descanso intermedio", () => {
  it("completar serie del primero pasa directo al segundo con descanso 0", () => {
    // La serie 1 del press se acaba de registrar: va directo al remo.
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: [1, 0, 0],
      exerciseIndex: 0,
    });
    expect(decision).toEqual({
      exerciseIndex: 1,
      setNumber: 1,
      restSeconds: 0,
      kind: "chain",
    });
  });

  it("enciende la vuelta siguiente: del último set del primero salta a la última serie del segundo", () => {
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: [3, 2, 0],
      exerciseIndex: 0,
    });
    expect(decision).toEqual({ exerciseIndex: 1, setNumber: 3, restSeconds: 0, kind: "chain" });
  });
});

describe("decideSupersetAdvance — la vuelta completa cierra con descanso", () => {
  it("tras el segundo ejercicio llega su descanso y se vuelve al primero", () => {
    // Se registró la serie 2 del remo (último del par): descanso del remo + vuelta al press.
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: [2, 2, 0],
      exerciseIndex: 1,
    });
    expect(decision).toEqual({
      exerciseIndex: 0,
      setNumber: 3,
      restSeconds: 90, // el descanso del último ejercicio del grupo
      kind: "vuelta",
    });
  });

  it("el descanso de la vuelta es el del ejercicio recién completado, no el del próximo", () => {
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: [3, 3, 0],
      exerciseIndex: 1, // remo, restSeconds 90; el press descansaría 75
    });
    expect(decision?.restSeconds).toBe(90);
  });
});

describe("decideSupersetAdvance — salida del grupo", () => {
  it("al agotar el par sale hacia el ejercicio siguiente del grupo con descanso", () => {
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: ALL_DONE_PAR,
      exerciseIndex: 1, // el remo acaba su serie 3
    });
    expect(decision).toEqual({
      exerciseIndex: 2, // curl, después del grupo
      setNumber: 1,
      restSeconds: 90,
      kind: "exit",
    });
  });

  it("si el grupo es lo último de la rutina devuelve null (ronda/fin: lo decide el store)", () => {
    const decision = decideSupersetAdvance({
      exercises: [PAR[0], PAR[1]],
      setsDone: [3, 3],
      exerciseIndex: 1,
    });
    expect(decision).toBeNull();
  });

  it("con el grupo agotado y el ejercicio actual sin series pendientes, sale aunque sea el primero", () => {
    // Press de 3 series, remo de solo 2: tras el press 3 el grupo ya está agotado.
    const desiguales = [ex("press", 3, 75, "ss-1"), ex("remo", 2, 90, "ss-1"), ex("curl", 3, 60)];
    const decision = decideSupersetAdvance({
      exercises: desiguales,
      setsDone: [3, 2, 0],
      exerciseIndex: 0,
    });
    expect(decision).toEqual({ exerciseIndex: 2, setNumber: 1, restSeconds: 75, kind: "exit" });
  });
});

describe("decideSupersetAdvance — casos límite de series desiguales", () => {
  it("la vuelta agotada del compañero se cierra con la serie restante del actual", () => {
    // press 2 / remo 3: en la vuelta 2 el press (agotado tras su serie 2) ya no
    // tiene pareja, así que el flujo normal deja terminar al remo.
    const desiguales = [ex("press", 2, 75, "ss-1"), ex("remo", 3, 90, "ss-1"), ex("curl", 3, 60)];
    expect(
      decideSupersetAdvance({ exercises: desiguales, setsDone: [2, 1, 0], exerciseIndex: 0 }),
    ).toEqual({ exerciseIndex: 1, setNumber: 2, restSeconds: 0, kind: "chain" });
  });

  it("pareja ya agotada y ejercicio actual con series restantes: flujo normal (null)", () => {
    // press 2 / remo 3: tras el remo 2, al press no le quedan vueltas y al remo sí.
    const desiguales = [ex("press", 2, 75, "ss-1"), ex("remo", 3, 90, "ss-1"), ex("curl", 3, 60)];
    expect(
      decideSupersetAdvance({ exercises: desiguales, setsDone: [2, 2, 0], exerciseIndex: 1 }),
    ).toBeNull();
  });
});

describe("decideSupersetAdvance — grupos de más de dos ejercicios", () => {
  const TRIO = [
    ex("press", 2, 75, "ss-x"),
    ex("remo", 2, 90, "ss-x"),
    ex("sentadilla", 2, 60, "ss-x"),
    ex("plancha", 3, 45),
  ];

  it("cada miembro encadena con el siguiente sin descanso", () => {
    expect(
      decideSupersetAdvance({ exercises: TRIO, setsDone: [1, 0, 0, 0], exerciseIndex: 0 }),
    ).toEqual({ exerciseIndex: 1, setNumber: 1, restSeconds: 0, kind: "chain" });
    expect(
      decideSupersetAdvance({ exercises: TRIO, setsDone: [1, 1, 0, 0], exerciseIndex: 1 }),
    ).toEqual({ exerciseIndex: 2, setNumber: 1, restSeconds: 0, kind: "chain" });
  });

  it("al cerrar la vuelta del trío vuelve al primero con el descanso del último", () => {
    expect(
      decideSupersetAdvance({ exercises: TRIO, setsDone: [1, 1, 1, 0], exerciseIndex: 2 }),
    ).toEqual({ exerciseIndex: 0, setNumber: 2, restSeconds: 60, kind: "vuelta" });
  });

  it("si un miembro intermedio se agota, se salta en el encadenado y se cierra la vuelta con el último", () => {
    // El remo solo tiene 1 serie: tras el remo 1 del trío se pasa a la sentadilla.
    const desiguales = [
      ex("press", 2, 75, "ss-x"),
      ex("remo", 1, 90, "ss-x"),
      ex("sentadilla", 2, 60, "ss-x"),
    ];
    expect(
      decideSupersetAdvance({ exercises: desiguales, setsDone: [1, 1, 0], exerciseIndex: 1 }),
    ).toEqual({ exerciseIndex: 2, setNumber: 1, restSeconds: 0, kind: "chain" });
  });
});

describe("decideSupersetAdvance — nada de superserie", () => {
  it("devuelve null fuera del índice válido", () => {
    expect(decideSupersetAdvance({ exercises: PAR, setsDone: [0, 0, 0], exerciseIndex: 9 })).toBeNull();
  });

  it("devuelve null en ejercicios sin supersetGroup", () => {
    const decision = decideSupersetAdvance({
      exercises: PAR,
      setsDone: [1, 0, 0],
      exerciseIndex: 2, // curl, sin grupo
    });
    expect(decision).toBeNull();
  });

  it("devuelve null con un grupo de un solo miembro", () => {
    const solo = [ex("press", 3, 75, "ss-solo")];
    expect(
      decideSupersetAdvance({ exercises: solo, setsDone: [1], exerciseIndex: 0 }),
    ).toBeNull();
  });
});

describe("countSetsDonePerRound — el store alimenta la decisión", () => {
  it("cuenta las series completadas por índice de rutina", () => {
    const logs = [log("press", 2), log("remo", 1), log("curl", 0)];
    expect(countSetsDonePerRound(logs, PAR, 1)).toEqual([2, 1, 0]);
  });

  it("aguanta una sesión vacía o indefinida", () => {
    expect(countSetsDonePerRound(undefined, PAR, 1)).toEqual([0, 0, 0]);
  });

  it("reinicia el conteo por ronda en rutinas de varias rounds", () => {
    const logs = [log("press", 3), log("remo", 5), log("curl", 4)];
    // Ronda 2: cada ejercicio ya tiene 3 series de la ronda anterior.
    expect(countSetsDonePerRound(logs, PAR, 2)).toEqual([0, 2, 1]);
    // La serie "extra" nunca se cuenta: nunca baja de 0.
    expect(countSetsDonePerRound(logs, PAR, 9)).toEqual([0, 0, 0]);
  });

  it("señala el estado simulado tras registrar la serie en curso (preview de la UI)", () => {
    const logs = [log("press", 0), log("remo", 0), log("curl", 0)];
    const simulated = countSetsDonePerRound(logs, PAR, 1).map((done, idx) =>
      idx === 0 ? done + 1 : done,
    );
    expect(
      decideSupersetAdvance({ exercises: PAR, setsDone: simulated, exerciseIndex: 0 }),
    ).toEqual({ exerciseIndex: 1, setNumber: 1, restSeconds: 0, kind: "chain" });
  });
});
