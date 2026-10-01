// FORTIXAM — supersets (F2.3).
//
// La decisión de negocio del encadenado vive aquí, separada de React y del
// store, para poder probarla sin WebView. Dos ejercicios que comparten el mismo
// `supersetGroup` se entrenan alternando series: una "vuelta" es una serie de
// cada uno. Al completar una serie del primero se pasa DIRECTO al segundo
// (descanso 0) y el descanso prescrito del último ejercicio del grupo llega al
// cerrar la vuelta completa del par.

import { Exercise, ExerciseLog } from "./types";

/** Motivo de la decisión tras completar una serie en superserie. */
export type SupersetAdvanceKind = "chain" | "vuelta" | "exit";

export interface SupersetAdvance {
  /** Índice del ejercicio al que saltar (dentro de routine.exercises). */
  exerciseIndex: number;
  /** Serie (1-based) que toca hacer en el ejercicio destino. */
  setNumber: number;
  /** Descanso antes del ejercicio destino, en segundos. 0 = pasar directo. */
  restSeconds: number;
  /** Por qué se decide: encadenar, cerrar vuelta o salir del grupo. */
  kind: SupersetAdvanceKind;
}

export interface SupersetAdvanceInput {
  /** Lista completa de ejercicios de la rutina, en orden. */
  exercises: Exercise[];
  /**
   * Series completadas dentro de la ronda actual, por índice de rutina. Con
   * rutinas de varias `rounds` el store pasa el conteo reiniciado por ronda,
   * para que el grupo vuelva a encadenar desde la serie 1 en cada circuito.
   */
  setsDone: number[];
  /** Índice del ejercicio cuya serie se acaba de registrar. */
  exerciseIndex: number;
}

/** Normaliza el identificador de grupo: recorta espacios; vacío ⇒ undefined. */
export function normalizeSupersetGroup(
  group: string | undefined | null,
): string | undefined {
  const clean = String(group ?? "").trim();
  return clean.length > 0 ? clean : undefined;
}

export interface SupersetMember {
  exercise: Exercise;
  index: number;
}

/** Miembros del grupo del ejercicio dado, en orden de rutina. */
export function getSupersetMembers(
  exercises: Exercise[],
  exercise: Exercise | undefined,
): SupersetMember[] {
  const group = normalizeSupersetGroup(exercise?.supersetGroup);
  if (!group) return [];
  return exercises
    .map((ex, index) => ({ exercise: ex, index }))
    .filter(
      (member) =>
        normalizeSupersetGroup(member.exercise.supersetGroup) === group,
    );
}

/** Compañero de superserie del ejercicio (primer miembro distinto de él). */
export function getSupersetPartnerInRoutine(
  exercises: Exercise[],
  exercise: Exercise | undefined,
): Exercise | undefined {
  const partner = getSupersetMembers(exercises, exercise).find(
    (member) => member.exercise !== exercise,
  );
  return partner?.exercise;
}

/**
 * Series completadas por índice de rutina dentro de la ronda actual, a partir
 * de los registros de la sesión. Es lo que alimenta `decideSupersetAdvance`.
 */
export function countSetsDonePerRound(
  sessionExercises: ExerciseLog[] | undefined,
  routineExercises: Exercise[],
  currentRound: number,
): number[] {
  const offset = Math.max(0, currentRound - 1);
  return routineExercises.map((ex, index) => {
    const totalOfExercise = ex.sets ?? 0;
    const done =
      sessionExercises?.[index]?.sets.filter((s) => s.completed).length ?? 0;
    return Math.max(0, done - offset * totalOfExercise);
  });
}

/**
 * Qué pasa al completar una serie de un ejercicio en superserie.
 *
 * 1. El ejercicio que no es el último del grupo ENCADENA con el siguiente
 *    miembro que tenga series pendientes: descanso 0 (sin pausa intermedia).
 * 2. Al cerrar la vuelta (último pendiente del grupo) llega el descanso del
 *    propio ejercicio y la vuelta nueva empieza con el primer miembro que aún
 *    tenga series pendientes.
 * 3. Cuando el grupo se agota, se sale hacia el ejercicio que sigue al último
 *    miembro con su descanso normal. Si no hay ejercicio después, devuelve
 *    null para que el store decida la siguiente ronda o el fin del entreno.
 *
 * Devuelve null cuando no procede ninguna decisión de superserie y el flujo
 * normal del store vale tal cual.
 */
export function decideSupersetAdvance(
  input: SupersetAdvanceInput,
): SupersetAdvance | null {
  const { exercises, setsDone, exerciseIndex } = input;
  const current = exercises[exerciseIndex];
  if (!current) return null;

  const members = getSupersetMembers(exercises, current);
  // Sin grupo o sin compañero no hay superserie: flujo normal.
  if (members.length < 2) return null;

  const doneAt = (index: number): number => Math.max(0, setsDone[index] ?? 0);
  const pendingAt = (index: number): number => {
    const exercise = exercises[index];
    return Math.max(0, (exercise?.sets ?? 0) - doneAt(index));
  };

  // 1) Encadenar directo con el próximo miembro del grupo que tenga series pendientes.
  const nextMember = members.find((member) => member.index > exerciseIndex);
  if (nextMember && pendingAt(nextMember.index) > 0) {
    return {
      exerciseIndex: nextMember.index,
      setNumber: doneAt(nextMember.index) + 1,
      restSeconds: 0,
      kind: "chain",
    };
  }

  // 2) Vuelta completa: el descanso lo marca el ejercicio recién terminado
  //    (último miembro pendiente del grupo) y la vuelta nueva arranca con el
  //    primer miembro que aún tenga series pendientes.
  const memberWithPendingSets = members.find(
    (member) => member.index !== exerciseIndex && pendingAt(member.index) > 0,
  );
  if (memberWithPendingSets) {
    return {
      exerciseIndex: memberWithPendingSets.index,
      setNumber: doneAt(memberWithPendingSets.index) + 1,
      restSeconds: Math.max(0, current.restSeconds ?? 0),
      kind: "vuelta",
    };
  }

  // 3) Grupo agotado: si el ejercicio actual ya hizo todas sus series, se sale
  //    del par hacia el ejercicio siguiente al último miembro del grupo. Así,
  //    si los dos ejercicios del grupo no tienen el mismo número de series, no
  //    se re-entra en el compañero agotado al avanzar.
  if (doneAt(exerciseIndex) >= (current.sets ?? 0)) {
    const afterLastMember = members[members.length - 1].index + 1;
    if (afterLastMember < exercises.length) {
      return {
        exerciseIndex: afterLastMember,
        setNumber: 1,
        restSeconds: Math.max(0, current.restSeconds ?? 0),
        kind: "exit",
      };
    }
  }

  // 4) El propio ejercicio todavía tiene series pendientes sin compañero (o el
  //    grupo acabó con la rutina detrás): sigue el flujo normal del store.
  return null;
}
