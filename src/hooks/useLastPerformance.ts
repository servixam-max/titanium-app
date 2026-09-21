"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSessions } from "@/lib/db";
import {
  getLastPerformance,
  suggestNextLoad,
  parseRepRange,
  incrementForExercise,
  LastPerformance,
  LoadSuggestion,
} from "@/lib/progression";
import { Exercise, WorkoutSession } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface UseLastPerformanceResult {
  last?: LastPerformance;
  suggestion?: LoadSuggestion;
  /** Sesiones previas con este ejercicio (contexto para la UI). */
  historyCount: number;
}

/**
 * Devuelve la última marca del ejercicio (peso × reps) y la sugerencia de
 * progresión para hoy. Además precarga peso/reps en el store cuando el
 * ejercicio aún no tiene valores en la sesión activa.
 */
export function useLastPerformance(exercise?: Exercise): UseLastPerformanceResult {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const { activeWorkout, setExerciseWeight, setExerciseReps } = useAppStore();
  const prefilledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!exercise) return;
    let alive = true;
    getSessions()
      .then((list) => {
        if (alive) setSessions(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // Solo se recarga al cambiar de ejercicio (el objeto Exercise se recrea en
    // cada render del workout y recargar por él sería un bucle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id]);

  const last = useMemo(
    () => (exercise ? getLastPerformance(sessions, exercise.id ?? "") : undefined),
    [sessions, exercise],
  );

  const suggestion = useMemo(() => {
    if (!exercise) return undefined;
    return suggestNextLoad({
      last,
      repRange: parseRepRange(exercise.reps),
      increment: incrementForExercise(exercise),
    });
  }, [last, exercise]);

  const historyCount = useMemo(
    () =>
      exercise
        ? sessions.filter((s) =>
            s.exercises?.some(
              (ex) => ex.exerciseId === exercise.id && (ex.sets || []).some((set) => set.completed),
            ),
          ).length
        : 0,
    [sessions, exercise],
  );

  // Precarga del peso/reps sugeridos cuando la sesión aún no tiene valores.
  useEffect(() => {
    if (!exercise || !suggestion || suggestion.weight <= 0) return;
    const exerciseId = exercise.id ?? "";
    const current = activeWorkout.exerciseWeights[exerciseId];
    if (current !== undefined && current > 0) return;

    const key = `${exerciseId}:${suggestion.weight}:${suggestion.reps}`;
    if (prefilledRef.current === key) return;
    prefilledRef.current = key;

    setExerciseWeight(exerciseId, suggestion.weight);
    setExerciseReps(exerciseId, suggestion.reps);
  }, [exercise, suggestion, activeWorkout.exerciseWeights, setExerciseWeight, setExerciseReps]);

  return { last, suggestion, historyCount };
}
