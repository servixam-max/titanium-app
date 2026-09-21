import { WorkoutSession } from "./types";
import { getExerciseById } from "./data";

export interface WorkoutDebriefResult {
  headline: string;
  summary: string;
  volumeDeltaPercent: number;
  primaryMusclesTrained: string[];
  suggestedRestHours: number;
  recommendationTomorrow: string;
  tags: { label: string; variant: "success" | "warning" | "cyan" }[];
}

const MUSCLE_SPANISH_NAMES: Record<string, string> = {
  chest: "Pectoral",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Piernas",
  core: "Core / Abdomen",
  full_body: "Cuerpo Completo",
  hiit: "Cardio y Resistencia",
};

export function generateWorkoutDebrief(
  currentSession: WorkoutSession,
  historicalSessions: WorkoutSession[] = [],
  athleteName: string = "Atleta"
): WorkoutDebriefResult {
  const currentVol =
    currentSession.totalVolume ??
    (currentSession.exercises || []).reduce(
      (sum, ex) =>
        sum +
        (ex.sets || []).reduce(
          (sSum, st) => sSum + (st.weight || 0) * (st.reps || 0),
          0
        ),
      0
    );

  // 1. Calculate historical average volume for the same routine or general
  const completedPast = historicalSessions.filter(
    (s) => s.completed && s.id !== currentSession.id
  );

  let pastAvgVol = 0;
  if (completedPast.length > 0) {
    const recent = completedPast.slice(-5);
    const sum = recent.reduce(
      (acc, s) =>
        acc +
        (s.totalVolume ??
          (s.exercises || []).reduce(
            (eAcc, ex) =>
              eAcc +
              (ex.sets || []).reduce(
                (stAcc, st) => stAcc + (st.weight || 0) * (st.reps || 0),
                0
              ),
            0
          )),
      0
    );
    pastAvgVol = sum / recent.length;
  }

  const volumeDeltaPercent =
    pastAvgVol > 0 ? Math.round(((currentVol - pastAvgVol) / pastAvgVol) * 100) : 0;

  // 2. Extract muscle groups worked in this session
  const musclesSet = new Set<string>();
  for (const ex of currentSession.exercises || []) {
    const cat = getExerciseById(ex.exerciseId)?.category;
    if (cat && MUSCLE_SPANISH_NAMES[cat]) {
      musclesSet.add(MUSCLE_SPANISH_NAMES[cat]);
    }
  }
  const primaryMusclesTrained =
    musclesSet.size > 0 ? Array.from(musclesSet) : ["Fuerza General"];

  // 3. Formulate headline and summary
  let headline = `¡Excelente sesión, ${athleteName}!`;
  const tags: WorkoutDebriefResult["tags"] = [];

  if (volumeDeltaPercent > 5) {
    headline = `🔥 ¡Sobrecarga progresiva lograda, ${athleteName}!`;
    tags.push({ label: `+${volumeDeltaPercent}% Volumen`, variant: "success" });
  } else if (volumeDeltaPercent < -5) {
    headline = `⚡ Sesión de descarga y velocidad, ${athleteName}`;
    tags.push({ label: `${volumeDeltaPercent}% Carga`, variant: "warning" });
  } else {
    tags.push({ label: "Ritmo Constante", variant: "cyan" });
  }

  const muscleListStr = primaryMusclesTrained.join(", ");
  const summary =
    volumeDeltaPercent > 0
      ? `Has estimulado intensamente ${muscleListStr} moviendo un volumen de ${(
          currentVol / 1000
        ).toFixed(1)} toneladas, superando tu media previa.`
      : `Has completado un trabajo focalizado en ${muscleListStr} con ${(
          currentVol / 1000
        ).toFixed(1)}T acumuladas con buena consistencia biomecánica.`;

  // 4. Recommendation for tomorrow
  let suggestedRestHours = 48;
  let recommendationTomorrow = "Descanso activo o hidratación adecuada.";

  if (musclesSet.has("Piernas")) {
    suggestedRestHours = 48;
    recommendationTomorrow =
      "El tren inferior necesitará 48h de recuperación. Mañana es ideal para torso superior o movilidad.";
    tags.push({ label: "48h descanso piernas", variant: "cyan" });
  } else if (musclesSet.has("Pectoral") || musclesSet.has("Hombros")) {
    suggestedRestHours = 36;
    recommendationTomorrow =
      "Tus grupos de empuje han recibido estímulo óptimo. Mañana tus piernas y espalda están al 100% listas.";
    tags.push({ label: "Torso descansando", variant: "cyan" });
  } else {
    suggestedRestHours = 24;
    recommendationTomorrow =
      "Buen ritmo general. Mantén 2.5L de agua y 7-8 horas de sueño para reparar el tejido muscular.";
  }

  return {
    headline,
    summary,
    volumeDeltaPercent,
    primaryMusclesTrained,
    suggestedRestHours,
    recommendationTomorrow,
    tags,
  };
}
