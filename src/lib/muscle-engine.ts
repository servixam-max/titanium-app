/**
 * Biomechanical Muscle Activation Engine
 * Accurately models primary and secondary muscle activation,
 * effective bodyweight mechanical load, and intensity benchmarks.
 */

import { LocalSession } from "./db";
import { getExerciseById } from "./data";

export type AnatomicalMuscle =
  | "chest"
  | "deltoids_ant"
  | "deltoids_lat"
  | "deltoids_post"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "traps"
  | "lats"
  | "lower_back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export interface MuscleInfo {
  id: AnatomicalMuscle;
  name: string;
  scientificName: string;
  majorGroup: "chest" | "back" | "shoulders" | "arms" | "legs" | "core";
  view: "front" | "back" | "both";
  description: string;
}

export const MUSCLE_METADATA: Record<AnatomicalMuscle, MuscleInfo> = {
  chest: {
    id: "chest",
    name: "Pectorales",
    scientificName: "Pectoralis Major & Minor",
    majorGroup: "chest",
    view: "front",
    description: "Fuerza de empuje horizontal y estabilidad de la cintura escapular.",
  },
  deltoids_ant: {
    id: "deltoids_ant",
    name: "Deltoides Anterior",
    scientificName: "Deltoideus Anterior",
    majorGroup: "shoulders",
    view: "front",
    description: "Elevación frontal y empujes verticales.",
  },
  deltoids_lat: {
    id: "deltoids_lat",
    name: "Deltoides Lateral",
    scientificName: "Deltoideus Lateralis",
    majorGroup: "shoulders",
    view: "both",
    description: "Abducción del brazo y anchura visual de los hombros en V.",
  },
  deltoids_post: {
    id: "deltoids_post",
    name: "Deltoides Posterior",
    scientificName: "Deltoideus Posterior",
    majorGroup: "shoulders",
    view: "back",
    description: "Retracción escapular, postura erguida y salud del manguito rotador.",
  },
  biceps: {
    id: "biceps",
    name: "Bíceps",
    scientificName: "Biceps Brachii",
    majorGroup: "arms",
    view: "front",
    description: "Flexión de codo y supinación del antebrazo en movimientos de tirón.",
  },
  triceps: {
    id: "triceps",
    name: "Tríceps",
    scientificName: "Triceps Brachii",
    majorGroup: "arms",
    view: "back",
    description: "Extensión del codo, clave en todos los bloqueos y empujes de fuerza.",
  },
  forearms: {
    id: "forearms",
    name: "Antebrazos",
    scientificName: "Brachioradialis & Flexores",
    majorGroup: "arms",
    view: "both",
    description: "Fuerza de agarre, tracción de peso y estabilidad de muñeca.",
  },
  abs: {
    id: "abs",
    name: "Abdominales",
    scientificName: "Rectus Abdominis",
    majorGroup: "core",
    view: "front",
    description: "Flexión espinal, protección visceral y transmisión de potencia corporal.",
  },
  obliques: {
    id: "obliques",
    name: "Oblicuos",
    scientificName: "Obliquus Externus & Internus",
    majorGroup: "core",
    view: "front",
    description: "Rotación y estabilización antibalanceo del tronco.",
  },
  traps: {
    id: "traps",
    name: "Trapecios",
    scientificName: "Trapezius Superior & Medius",
    majorGroup: "back",
    view: "back",
    description: "Elevación y fijación de escápulas, soporte para cargas pesadas.",
  },
  lats: {
    id: "lats",
    name: "Dorsales",
    scientificName: "Latissimus Dorsi",
    majorGroup: "back",
    view: "back",
    description: "Tracción vertical y horizontal, amplitud dorsal y forma en V.",
  },
  lower_back: {
    id: "lower_back",
    name: "Lumbares",
    scientificName: "Erector Spinae",
    majorGroup: "back",
    view: "back",
    description: "Extensión lumbar y bisagra de cadera indispensable para la espalda.",
  },
  glutes: {
    id: "glutes",
    name: "Glúteos",
    scientificName: "Gluteus Maximus & Medius",
    majorGroup: "legs",
    view: "back",
    description: "El grupo muscular más potente del cuerpo: extensión y estabilidad de cadera.",
  },
  quads: {
    id: "quads",
    name: "Cuádriceps",
    scientificName: "Quadriceps Femoris",
    majorGroup: "legs",
    view: "front",
    description: "Extensión de rodilla, potencia en sentadillas, zancadas y saltos.",
  },
  hamstrings: {
    id: "hamstrings",
    name: "Isquiosurales",
    scientificName: "Biceps Femoris & Semitendinosus",
    majorGroup: "legs",
    view: "back",
    description: "Flexión de rodilla y bisagra posterior para velocidad y fuerza.",
  },
  calves: {
    id: "calves",
    name: "Gemelos",
    scientificName: "Gastrocnemius & Soleus",
    majorGroup: "legs",
    view: "both",
    description: "Flexión plantar, amortiguación de saltos y propulsión dinámica.",
  },
};

export interface ExerciseBiomechanicalRule {
  primary: AnatomicalMuscle[];
  secondary: AnatomicalMuscle[];
  bodyweightEqKg: number; // Effective resistance per rep when weight is 0
}

/**
 * Biomechanical mapping for Fortixam exercise naming patterns
 */
export function getExerciseBiomechanics(name: string, category?: string): ExerciseBiomechanicalRule {
  const n = name.toLowerCase();

  // Chest / Empuje Horizontal
  if (n.includes("banca") || n.includes("floor press") || (n.includes("press") && n.includes("pecho"))) {
    return {
      primary: ["chest"],
      secondary: ["triceps", "deltoids_ant"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("apertura") || n.includes("fly")) {
    return {
      primary: ["chest"],
      secondary: ["deltoids_ant"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("flexion") || n.includes("push-up") || n.includes("pushup")) {
    if (n.includes("diamante")) {
      return {
        primary: ["triceps", "chest"],
        secondary: ["deltoids_ant", "abs"],
        bodyweightEqKg: 46,
      };
    }
    if (n.includes("pike") || n.includes("pica")) {
      return {
        primary: ["deltoids_ant", "deltoids_lat"],
        secondary: ["triceps", "traps"],
        bodyweightEqKg: 42,
      };
    }
    if (n.includes("explosiv")) {
      return {
        primary: ["chest", "triceps"],
        secondary: ["deltoids_ant", "abs"],
        bodyweightEqKg: 50,
      };
    }
    return {
      primary: ["chest"],
      secondary: ["triceps", "deltoids_ant", "abs"],
      bodyweightEqKg: 45,
    };
  }
  if (n.includes("fondo") || n.includes("dip")) {
    return {
      primary: ["triceps"],
      secondary: ["chest", "deltoids_ant"],
      bodyweightEqKg: 50,
    };
  }

  // Hombros / Empuje Vertical
  if (n.includes("militar") || (n.includes("press") && (n.includes("hombro") || n.includes("arnold")))) {
    return {
      primary: ["deltoids_ant", "deltoids_lat"],
      secondary: ["triceps", "traps"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("push press") || n.includes("thruster")) {
    return {
      primary: ["deltoids_ant", "quads"],
      secondary: ["triceps", "glutes", "traps"],
      bodyweightEqKg: 40,
    };
  }
  if (n.includes("lateral") && (n.includes("elevaci") || n.includes("raise"))) {
    return {
      primary: ["deltoids_lat"],
      secondary: ["traps"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("pájaro") || n.includes("reverse fly") || n.includes("posterior")) {
    return {
      primary: ["deltoids_post", "traps"],
      secondary: ["lats"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("encogimiento") || n.includes("shrug")) {
    return {
      primary: ["traps"],
      secondary: ["forearms"],
      bodyweightEqKg: 0,
    };
  }

  // Espalda / Tracción
  if (n.includes("remo") || n.includes("row")) {
    if (n.includes("renegade")) {
      return {
        primary: ["lats", "abs"],
        secondary: ["biceps", "obliques", "deltoids_ant"],
        bodyweightEqKg: 35,
      };
    }
    return {
      primary: ["lats", "traps"],
      secondary: ["biceps", "forearms", "lower_back"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("peso muerto") || n.includes("deadlift")) {
    return {
      primary: ["hamstrings", "glutes", "lower_back"],
      secondary: ["traps", "forearms", "lats"],
      bodyweightEqKg: 45,
    };
  }

  // Brazos Aislamiento
  if (n.includes("curl") || n.includes("bíceps") || n.includes("biceps")) {
    return {
      primary: ["biceps"],
      secondary: ["forearms"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("extensi") && (n.includes("tríceps") || n.includes("triceps") || n.includes("copa") || n.includes("overhead") || n.includes("skull"))) {
    return {
      primary: ["triceps"],
      secondary: ["forearms"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("patada") && n.includes("tríceps")) {
    return {
      primary: ["triceps"],
      secondary: ["deltoids_post"],
      bodyweightEqKg: 0,
    };
  }
  if (n.includes("granjero") || n.includes("farmer")) {
    return {
      primary: ["forearms", "traps"],
      secondary: ["abs", "calves"],
      bodyweightEqKg: 0,
    };
  }

  // Piernas
  if (n.includes("sentadilla") || n.includes("squat")) {
    if (n.includes("salto") || n.includes("jump")) {
      return {
        primary: ["quads", "glutes"],
        secondary: ["calves", "abs"],
        bodyweightEqKg: 48,
      };
    }
    if (n.includes("búlgara") || n.includes("bulgarian") || n.includes("cosaca") || n.includes("cossack")) {
      return {
        primary: ["quads", "glutes"],
        secondary: ["hamstrings", "calves"],
        bodyweightEqKg: 38,
      };
    }
    return {
      primary: ["quads", "glutes"],
      secondary: ["calves", "abs"],
      bodyweightEqKg: 45,
    };
  }
  if (n.includes("zancada") || n.includes("lunge") || n.includes("step")) {
    return {
      primary: ["quads", "glutes"],
      secondary: ["hamstrings", "calves"],
      bodyweightEqKg: 38,
    };
  }
  if (n.includes("glúteo") || n.includes("hip thrust") || n.includes("bridge")) {
    return {
      primary: ["glutes"],
      secondary: ["hamstrings", "lower_back"],
      bodyweightEqKg: 35,
    };
  }

  // Core / Abdomen
  if (n.includes("plancha") || n.includes("plank") || n.includes("hollow")) {
    if (n.includes("lateral") || n.includes("side")) {
      return {
        primary: ["obliques"],
        secondary: ["abs", "glutes", "deltoids_lat"],
        bodyweightEqKg: 28,
      };
    }
    if (n.includes("toque") || n.includes("tap")) {
      return {
        primary: ["deltoids_ant", "abs"],
        secondary: ["obliques", "triceps"],
        bodyweightEqKg: 30,
      };
    }
    return {
      primary: ["abs", "obliques"],
      secondary: ["deltoids_ant", "glutes"],
      bodyweightEqKg: 26,
    };
  }
  if (n.includes("bicicleta") || n.includes("crunch") || n.includes("twist") || n.includes("elevaci") && n.includes("pierna")) {
    return {
      primary: ["abs", "obliques"],
      secondary: ["lower_back"],
      bodyweightEqKg: 22,
    };
  }
  if (n.includes("escalador") || n.includes("climber")) {
    return {
      primary: ["abs"],
      secondary: ["deltoids_ant", "quads", "obliques"],
      bodyweightEqKg: 28,
    };
  }
  if (n.includes("leñador") || n.includes("woodchopper")) {
    return {
      primary: ["obliques", "abs"],
      secondary: ["deltoids_ant", "quads"],
      bodyweightEqKg: 0,
    };
  }

  // Cardio / Full Body
  if (n.includes("burpee") || n.includes("devil") || n.includes("man maker") || n.includes("snatch") || n.includes("clean")) {
    return {
      primary: ["chest", "quads", "deltoids_ant"],
      secondary: ["triceps", "lats", "glutes", "abs", "calves"],
      bodyweightEqKg: 52,
    };
  }
  if (n.includes("boxeo") || n.includes("shadow")) {
    return {
      primary: ["deltoids_ant", "deltoids_lat"],
      secondary: ["obliques", "calves", "triceps"],
      bodyweightEqKg: 25,
    };
  }
  if (n.includes("patinador") || n.includes("skater")) {
    return {
      primary: ["glutes", "quads"],
      secondary: ["calves", "obliques"],
      bodyweightEqKg: 38,
    };
  }
  if (n.includes("jumping jack") || n.includes("knee") || n.includes("rodilla")) {
    return {
      primary: ["calves", "quads"],
      secondary: ["deltoids_lat", "abs"],
      bodyweightEqKg: 32,
    };
  }

  // Fallback by category
  const cat = (category || "").toLowerCase();
  if (cat === "chest") return { primary: ["chest"], secondary: ["triceps", "deltoids_ant"], bodyweightEqKg: 40 };
  if (cat === "shoulders") return { primary: ["deltoids_ant", "deltoids_lat"], secondary: ["traps", "triceps"], bodyweightEqKg: 30 };
  if (cat === "back" || cat === "lats") return { primary: ["lats"], secondary: ["biceps", "traps"], bodyweightEqKg: 40 };
  if (cat === "arms" || cat === "biceps") return { primary: ["biceps"], secondary: ["forearms"], bodyweightEqKg: 25 };
  if (cat === "triceps") return { primary: ["triceps"], secondary: ["chest"], bodyweightEqKg: 35 };
  if (cat === "legs" || cat === "quads") return { primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], bodyweightEqKg: 40 };
  if (cat === "core") return { primary: ["abs", "obliques"], secondary: ["lower_back"], bodyweightEqKg: 25 };

  return {
    primary: ["chest", "quads", "abs"],
    secondary: ["deltoids_ant", "lats", "glutes"],
    bodyweightEqKg: 35,
  };
}

export interface DetailedMuscleStat {
  muscle: AnatomicalMuscle;
  info: MuscleInfo;
  volumeKg: number;
  totalSets: number;
  totalReps: number;
  activationRatio: number; // 0.0 to 1.0 (relative to benchmark)
  intensityLevel: "none" | "light" | "moderate" | "high" | "peak";
}

export type MuscleTimeframe = "week" | "month" | "all";

export function computeMuscleBreakdown(
  sessions: LocalSession[],
  timeframe: MuscleTimeframe = "week"
): {
  muscleStats: Record<AnatomicalMuscle, DetailedMuscleStat>;
  majorGroups: { key: string; name: string; color: string; volume: number; percentage: number }[];
  totalEffectiveVolume: number;
  maxMuscleVolume: number;
  mostTrainedMuscle: AnatomicalMuscle | null;
  leastTrainedMuscle: AnatomicalMuscle | null;
} {
  const completed = sessions.filter((s) => s.completed && s.endTime);

  // Timeframe filter
  const now = new Date();
  let filterDate: Date | null = null;

  if (timeframe === "week") {
    // Current week starting Monday (or last 7 days)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    filterDate = startOfWeek;
  } else if (timeframe === "month") {
    // Current month starting day 1 (or last 30 days)
    filterDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  const filteredSessions = filterDate
    ? completed.filter((s) => new Date(s.endTime!) >= filterDate!)
    : completed;

  // Initialize all anatomical muscles
  const statsMap: Record<AnatomicalMuscle, { volume: number; sets: number; reps: number }> = {
    chest: { volume: 0, sets: 0, reps: 0 },
    deltoids_ant: { volume: 0, sets: 0, reps: 0 },
    deltoids_lat: { volume: 0, sets: 0, reps: 0 },
    deltoids_post: { volume: 0, sets: 0, reps: 0 },
    biceps: { volume: 0, sets: 0, reps: 0 },
    triceps: { volume: 0, sets: 0, reps: 0 },
    forearms: { volume: 0, sets: 0, reps: 0 },
    abs: { volume: 0, sets: 0, reps: 0 },
    obliques: { volume: 0, sets: 0, reps: 0 },
    traps: { volume: 0, sets: 0, reps: 0 },
    lats: { volume: 0, sets: 0, reps: 0 },
    lower_back: { volume: 0, sets: 0, reps: 0 },
    glutes: { volume: 0, sets: 0, reps: 0 },
    quads: { volume: 0, sets: 0, reps: 0 },
    hamstrings: { volume: 0, sets: 0, reps: 0 },
    calves: { volume: 0, sets: 0, reps: 0 },
  };

  for (const session of filteredSessions) {
    for (const ex of session.exercises || []) {
      const catalogEx = getExerciseById(ex.exerciseId);
      const exName = ex.exerciseName || catalogEx?.name || ex.exerciseId;
      const exCategory = catalogEx?.category;
      const biomech = getExerciseBiomechanics(exName, exCategory);

      for (const set of ex.sets || []) {
        const rawWeight = Number(set.weight) || 0;
        const rawReps = Number(set.reps) || (set.completed ? 10 : 0);

        // Calculate effective load per rep
        const effectiveWeight = rawWeight > 0 ? rawWeight : biomech.bodyweightEqKg;
        const setVolume = effectiveWeight * rawReps;

        // Primary muscles get 100% volume
        for (const m of biomech.primary) {
          statsMap[m].volume += setVolume;
          statsMap[m].sets += 1;
          statsMap[m].reps += rawReps;
        }

        // Secondary muscles get 45% volume synergy
        for (const m of biomech.secondary) {
          statsMap[m].volume += Math.round(setVolume * 0.45);
          statsMap[m].sets += 1;
          statsMap[m].reps += Math.round(rawReps * 0.45);
        }
      }
    }
  }

  // Find maximum volume among all muscles to calibrate scale
  const volumes = Object.values(statsMap).map((v) => v.volume);
  const maxMuscleVolume = Math.max(...volumes, 1);
  const totalEffectiveVolume = volumes.reduce((sum, v) => sum + v, 0);

  const muscleStats = {} as Record<AnatomicalMuscle, DetailedMuscleStat>;
  let mostTrainedMuscle: AnatomicalMuscle | null = null;
  let leastTrainedMuscle: AnatomicalMuscle | null = null;
  let highestVol = -1;
  let lowestVol = Infinity;

  (Object.keys(statsMap) as AnatomicalMuscle[]).forEach((m) => {
    const data = statsMap[m];
    const ratio = totalEffectiveVolume > 0 ? data.volume / maxMuscleVolume : 0;

    let intensityLevel: DetailedMuscleStat["intensityLevel"] = "none";
    if (ratio > 0.75) intensityLevel = "peak";
    else if (ratio > 0.45) intensityLevel = "high";
    else if (ratio > 0.2) intensityLevel = "moderate";
    else if (data.volume > 0) intensityLevel = "light";

    if (data.volume > highestVol) {
      highestVol = data.volume;
      mostTrainedMuscle = m;
    }
    if (data.volume < lowestVol) {
      lowestVol = data.volume;
      leastTrainedMuscle = m;
    }

    muscleStats[m] = {
      muscle: m,
      info: MUSCLE_METADATA[m],
      volumeKg: data.volume,
      totalSets: data.sets,
      totalReps: data.reps,
      activationRatio: ratio,
      intensityLevel,
    };
  });

  // Major Groups compilation
  const majorGroupsDict: Record<string, { name: string; color: string; volume: number }> = {
    chest: { name: "Pecho", color: "#00F59B", volume: 0 },
    back: { name: "Espalda", color: "#00E1FF", volume: 0 },
    shoulders: { name: "Hombros", color: "#9333EA", volume: 0 },
    arms: { name: "Brazos", color: "#F59E0B", volume: 0 },
    legs: { name: "Piernas", color: "#FF007A", volume: 0 },
    core: { name: "Core", color: "#10B981", volume: 0 },
  };

  (Object.keys(muscleStats) as AnatomicalMuscle[]).forEach((m) => {
    const st = muscleStats[m];
    const grp = st.info.majorGroup;
    if (majorGroupsDict[grp]) {
      majorGroupsDict[grp].volume += st.volumeKg;
    }
  });

  const majorTotal = Object.values(majorGroupsDict).reduce((s, g) => s + g.volume, 0);
  const majorGroups = Object.entries(majorGroupsDict).map(([key, data]) => ({
    key,
    name: data.name,
    color: data.color,
    volume: data.volume,
    percentage: majorTotal > 0 ? Math.round((data.volume / majorTotal) * 100) : 0,
  }));

  return {
    muscleStats,
    majorGroups,
    totalEffectiveVolume,
    maxMuscleVolume,
    mostTrainedMuscle: highestVol > 0 ? mostTrainedMuscle : null,
    leastTrainedMuscle: highestVol > 0 ? leastTrainedMuscle : null,
  };
}
