import { LocalSession } from "./db";

export interface LevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  badgeColor: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: "Bronce I", minXP: 0, maxXP: 500, badgeColor: "#CD7F32" },
  { level: 2, title: "Bronce II", minXP: 500, maxXP: 1200, badgeColor: "#CD7F32" },
  { level: 3, title: "Plata I", minXP: 1200, maxXP: 2500, badgeColor: "#94A3B8" },
  { level: 4, title: "Plata II", minXP: 2500, maxXP: 4500, badgeColor: "#CBD5E1" },
  { level: 5, title: "Oro", minXP: 4500, maxXP: 7500, badgeColor: "#F59E0B" },
  { level: 6, title: "Platino", minXP: 7500, maxXP: 12000, badgeColor: "#00E1FF" },
  { level: 7, title: "Titanio", minXP: 12000, maxXP: 20000, badgeColor: "#00D68F" },
  { level: 8, title: "Élite Legendario", minXP: 20000, maxXP: 999999, badgeColor: "#FF007A" },
];

export function calculateTotalXP(sessions: LocalSession[]): number {
  let totalXP = 0;
  for (const s of sessions) {
    if (!s.completed) continue;
    // Base: 100 XP
    totalXP += 100;

    // Duration: 2 XP per minute
    const durSec =
      s.durationSeconds ??
      (s.endTime ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000 : 0);
    totalXP += Math.round(Math.max(0, durSec / 60) * 2);

    // Volume: 1 XP per 25 kg moved
    const vol =
      s.totalVolume ??
      (s.exercises || []).reduce(
        (sum, ex) =>
          sum + (ex.sets || []).reduce((sSum, st) => sSum + (st.weight || 0) * (st.reps || 0), 0),
        0
      );
    totalXP += Math.round(vol / 25);
  }
  return totalXP;
}

export function getAthleteLevel(xp: number): {
  currentLevel: LevelInfo;
  nextLevel: LevelInfo | null;
  progressPercent: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
} {
  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      currentLevel = LEVELS[i];
      break;
    }
  }

  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1) || null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      xpInCurrentLevel: xp - currentLevel.minXP,
      xpNeededForNext: 0,
    };
  }

  const range = nextLevel.minXP - currentLevel.minXP;
  const inLevel = Math.max(0, xp - currentLevel.minXP);
  const progressPercent = Math.min(100, Math.round((inLevel / range) * 100));

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpInCurrentLevel: inLevel,
    xpNeededForNext: nextLevel.minXP - xp,
  };
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: "streak" | "volume" | "discipline" | "milestone";
  isUnlocked: boolean;
  progress: number;
  target: number;
  unit: string;
}

export function computeAchievements(sessions: LocalSession[], currentStreak: number): Achievement[] {
  const completed = sessions.filter((s) => s.completed);
  const totalCompleted = completed.length;

  // Cumulative volume
  const totalVolume = completed.reduce(
    (sum, s) =>
      sum +
      (s.exercises || []).reduce(
        (eSum, ex) =>
          eSum + (ex.sets || []).reduce((sSum, st) => sSum + (st.weight || 0) * (st.reps || 0), 0),
        0
      ),
    0
  );

  // Time-of-day checks
  const hasEarlyBird = completed.some((s) => {
    const d = new Date(s.startTime);
    const hour = d.getHours();
    return hour >= 5 && hour < 8;
  });

  const hasNightOwl = completed.some((s) => {
    const d = new Date(s.startTime);
    const hour = d.getHours();
    return hour >= 21 || hour < 4;
  });

  return [
    {
      id: "first_workout",
      icon: "🔥",
      title: "Primera Llama",
      description: "Completa tu primer entrenamiento",
      category: "milestone",
      isUnlocked: totalCompleted >= 1,
      progress: Math.min(1, totalCompleted),
      target: 1,
      unit: "sesión",
    },
    {
      id: "streak_3",
      icon: "⚡",
      title: "Fuego Constante",
      description: "Alcanza una racha de 3 días seguidos",
      category: "streak",
      isUnlocked: currentStreak >= 3,
      progress: Math.min(3, currentStreak),
      target: 3,
      unit: "días",
    },
    {
      id: "streak_7",
      icon: "🛡️",
      title: "Hábito de Hierro",
      description: "Entrena 7 días consecutivos sin fallar",
      category: "streak",
      isUnlocked: currentStreak >= 7,
      progress: Math.min(7, currentStreak),
      target: 7,
      unit: "días",
    },
    {
      id: "streak_30",
      icon: "👑",
      title: "Leyenda de Titanio",
      description: "Racha imparable de 30 días de constancia",
      category: "streak",
      isUnlocked: currentStreak >= 30,
      progress: Math.min(30, currentStreak),
      target: 30,
      unit: "días",
    },
    {
      id: "workouts_10",
      icon: "🎯",
      title: "Dedicación",
      description: "Supera los 10 entrenamientos totales",
      category: "milestone",
      isUnlocked: totalCompleted >= 10,
      progress: Math.min(10, totalCompleted),
      target: 10,
      unit: "sesiones",
    },
    {
      id: "workouts_25",
      icon: "⚔️",
      title: "Guerrero Habitual",
      description: "Alcanza las 25 sesiones completadas",
      category: "milestone",
      isUnlocked: totalCompleted >= 25,
      progress: Math.min(25, totalCompleted),
      target: 25,
      unit: "sesiones",
    },
    {
      id: "workouts_50",
      icon: "🦅",
      title: "Cuerpo Forjado",
      description: "50 entrenamientos en tu historial",
      category: "milestone",
      isUnlocked: totalCompleted >= 50,
      progress: Math.min(50, totalCompleted),
      target: 50,
      unit: "sesiones",
    },
    {
      id: "volume_1t",
      icon: "🏋️",
      title: "Primer Tonel",
      description: "Mueve 1.000 kg acumulados de carga",
      category: "volume",
      isUnlocked: totalVolume >= 1000,
      progress: Math.min(1000, Math.round(totalVolume)),
      target: 1000,
      unit: "kg",
    },
    {
      id: "volume_10t",
      icon: "💪",
      title: "Fuerza Colosal",
      description: "10.000 kg de volumen total levantado",
      category: "volume",
      isUnlocked: totalVolume >= 10000,
      progress: Math.min(10000, Math.round(totalVolume)),
      target: 10000,
      unit: "kg",
    },
    {
      id: "volume_50t",
      icon: "🌋",
      title: "Titán del Acero",
      description: "50.000 kg acumulados — nivel élite",
      category: "volume",
      isUnlocked: totalVolume >= 50000,
      progress: Math.min(50000, Math.round(totalVolume)),
      target: 50000,
      unit: "kg",
    },
    {
      id: "early_bird",
      icon: "🌅",
      title: "Madrugador",
      description: "Entrena antes de las 8:00 AM",
      category: "discipline",
      isUnlocked: hasEarlyBird,
      progress: hasEarlyBird ? 1 : 0,
      target: 1,
      unit: "sesión",
    },
    {
      id: "night_owl",
      icon: "🌙",
      title: "Guerrero Nocturno",
      description: "Entrena después de las 21:00 PM",
      category: "discipline",
      isUnlocked: hasNightOwl,
      progress: hasNightOwl ? 1 : 0,
      target: 1,
      unit: "sesión",
    },
  ];
}
