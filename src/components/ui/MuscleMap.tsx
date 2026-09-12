"use client";

import { motion } from "framer-motion";

export type MuscleGroup =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "back"
  | "lats"
  | "traps"
  | "glutes"
  | "hamstrings"
  | "calves"
  | "core";

export interface MuscleActivity {
  group: MuscleGroup;
  volumeKg: number; // total volume for this group
}

interface MuscleMapProps {
  activity: MuscleActivity[];
  maxVolume?: number;
  className?: string;
}

// Map exercise category → muscle group
export function categoryToMuscles(category: string): MuscleGroup[] {
  const map: Record<string, MuscleGroup[]> = {
    chest: ["chest"],
    shoulders: ["shoulders"],
    biceps: ["biceps"],
    triceps: ["triceps"],
    forearms: ["forearms"],
    abs: ["abs", "core"],
    core: ["abs", "obliques", "core"],
    back: ["back", "lats"],
    lats: ["lats", "back"],
    traps: ["traps"],
    glutes: ["glutes"],
    legs: ["quads", "hamstrings", "glutes"],
    quads: ["quads"],
    hamstrings: ["hamstrings"],
    calves: ["calves"],
    full_body: ["chest", "back", "shoulders", "quads", "abs"],
    hiit: ["chest", "back", "shoulders", "quads", "abs"],
    cardio: ["quads", "calves", "hamstrings"],
  };
  return map[category?.toLowerCase()] ?? [];
}

function getColor(volumeKg: number, maxVolume: number): string {
  if (volumeKg === 0 || maxVolume === 0) return "rgba(255,255,255,0.07)";
  const ratio = Math.min(1, volumeKg / maxVolume);
  if (ratio < 0.33) return "rgba(0, 214, 143, 0.35)";
  if (ratio < 0.66) return "rgba(0, 214, 143, 0.65)";
  return "rgba(0, 214, 143, 0.95)";
}

function getStroke(volumeKg: number, maxVolume: number): string {
  if (volumeKg === 0 || maxVolume === 0) return "rgba(255,255,255,0.12)";
  const ratio = Math.min(1, volumeKg / maxVolume);
  if (ratio < 0.33) return "rgba(0, 214, 143, 0.5)";
  return "#00D68F";
}

export default function MuscleMap({ activity, maxVolume, className }: MuscleMapProps) {
  const activityMap = new Map<MuscleGroup, number>();
  for (const a of activity) {
    activityMap.set(a.group, (activityMap.get(a.group) ?? 0) + a.volumeKg);
  }

  const computedMax = maxVolume ?? Math.max(...Array.from(activityMap.values()), 1);

  const vol = (group: MuscleGroup) => activityMap.get(group) ?? 0;
  const fill = (group: MuscleGroup) => getColor(vol(group), computedMax);
  const stroke = (group: MuscleGroup) => getStroke(vol(group), computedMax);
  const active = (group: MuscleGroup) => vol(group) > 0;

  return (
    <div className={`flex gap-3 items-start justify-center ${className ?? ""}`}>
      {/* FRONT VIEW */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Frontal</span>
        <svg viewBox="0 0 80 200" width={80} height={200} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="40" cy="14" rx="11" ry="13" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Neck */}
          <rect x="36" y="26" width="8" height="8" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

          {/* CHEST */}
          <motion.path
            d="M26 36 Q28 34 32 34 L32 52 Q28 54 26 52 Z"
            fill={fill("chest")}
            stroke={stroke("chest")}
            strokeWidth={active("chest") ? 1 : 0.5}
            animate={{ opacity: active("chest") ? 1 : 0.7 }}
            transition={{ duration: 0.5 }}
          />
          <motion.path
            d="M54 36 Q52 34 48 34 L48 52 Q52 54 54 52 Z"
            fill={fill("chest")}
            stroke={stroke("chest")}
            strokeWidth={active("chest") ? 1 : 0.5}
            animate={{ opacity: active("chest") ? 1 : 0.7 }}
            transition={{ duration: 0.5 }}
          />

          {/* SHOULDERS */}
          <motion.ellipse cx="22" cy="40" rx="6" ry="8"
            fill={fill("shoulders")} stroke={stroke("shoulders")}
            strokeWidth={active("shoulders") ? 1 : 0.5}
            animate={{ opacity: active("shoulders") ? 1 : 0.7 }}
          />
          <motion.ellipse cx="58" cy="40" rx="6" ry="8"
            fill={fill("shoulders")} stroke={stroke("shoulders")}
            strokeWidth={active("shoulders") ? 1 : 0.5}
            animate={{ opacity: active("shoulders") ? 1 : 0.7 }}
          />

          {/* ABS */}
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <motion.rect
                x="30" y={56 + row * 9} width="8" height="7" rx="2"
                fill={fill("abs")} stroke={stroke("abs")}
                strokeWidth={active("abs") ? 1 : 0.5}
                animate={{ opacity: active("abs") ? 1 : 0.7 }}
              />
              <motion.rect
                x="42" y={56 + row * 9} width="8" height="7" rx="2"
                fill={fill("abs")} stroke={stroke("abs")}
                strokeWidth={active("abs") ? 1 : 0.5}
                animate={{ opacity: active("abs") ? 1 : 0.7 }}
              />
            </g>
          ))}

          {/* OBLIQUES */}
          <motion.path d="M26 56 L30 56 L30 83 L26 82 Z" rx="2"
            fill={fill("obliques")} stroke={stroke("obliques")}
            strokeWidth={active("obliques") ? 1 : 0.5}
            animate={{ opacity: active("obliques") ? 1 : 0.7 }}
          />
          <motion.path d="M50 56 L54 56 L54 82 L50 83 Z" rx="2"
            fill={fill("obliques")} stroke={stroke("obliques")}
            strokeWidth={active("obliques") ? 1 : 0.5}
            animate={{ opacity: active("obliques") ? 1 : 0.7 }}
          />

          {/* BICEPS */}
          <motion.path d="M14 48 Q12 52 13 62 L16 62 Q17 52 16 48 Z"
            fill={fill("biceps")} stroke={stroke("biceps")}
            strokeWidth={active("biceps") ? 1 : 0.5}
            animate={{ opacity: active("biceps") ? 1 : 0.7 }}
          />
          <motion.path d="M66 48 Q68 52 67 62 L64 62 Q63 52 64 48 Z"
            fill={fill("biceps")} stroke={stroke("biceps")}
            strokeWidth={active("biceps") ? 1 : 0.5}
            animate={{ opacity: active("biceps") ? 1 : 0.7 }}
          />

          {/* FOREARMS */}
          <motion.path d="M12 64 Q11 72 12 80 L15 80 Q16 72 16 64 Z"
            fill={fill("forearms")} stroke={stroke("forearms")}
            strokeWidth={active("forearms") ? 0.8 : 0.4}
            animate={{ opacity: active("forearms") ? 1 : 0.7 }}
          />
          <motion.path d="M68 64 Q69 72 68 80 L65 80 Q64 72 64 64 Z"
            fill={fill("forearms")} stroke={stroke("forearms")}
            strokeWidth={active("forearms") ? 0.8 : 0.4}
            animate={{ opacity: active("forearms") ? 1 : 0.7 }}
          />

          {/* QUADS */}
          <motion.path d="M29 93 Q26 98 26 118 Q30 122 34 118 Q36 98 34 93 Z"
            fill={fill("quads")} stroke={stroke("quads")}
            strokeWidth={active("quads") ? 1 : 0.5}
            animate={{ opacity: active("quads") ? 1 : 0.7 }}
          />
          <motion.path d="M51 93 Q54 98 54 118 Q50 122 46 118 Q44 98 46 93 Z"
            fill={fill("quads")} stroke={stroke("quads")}
            strokeWidth={active("quads") ? 1 : 0.5}
            animate={{ opacity: active("quads") ? 1 : 0.7 }}
          />

          {/* CALVES (front tibialis) */}
          <motion.path d="M27 125 Q26 138 27 152 L30 152 Q31 138 30 125 Z"
            fill={fill("calves")} stroke={stroke("calves")}
            strokeWidth={active("calves") ? 0.8 : 0.4}
            animate={{ opacity: active("calves") ? 1 : 0.7 }}
          />
          <motion.path d="M53 125 Q54 138 53 152 L50 152 Q49 138 50 125 Z"
            fill={fill("calves")} stroke={stroke("calves")}
            strokeWidth={active("calves") ? 0.8 : 0.4}
            animate={{ opacity: active("calves") ? 1 : 0.7 }}
          />

          {/* Torso outline */}
          <path d="M26 34 L26 90 L30 95 L50 95 L54 90 L54 34 L48 34 L48 52 L32 52 L32 34 Z"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

          {/* Hip / pelvis */}
          <path d="M26 86 Q40 92 54 86 L54 94 Q40 100 26 94 Z"
            fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* BACK VIEW */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Dorsal</span>
        <svg viewBox="0 0 80 200" width={80} height={200} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="40" cy="14" rx="11" ry="13" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Neck */}
          <rect x="36" y="26" width="8" height="8" rx="2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />

          {/* TRAPS */}
          <motion.path d="M32 34 Q40 38 48 34 Q44 42 40 44 Q36 42 32 34 Z"
            fill={fill("traps")} stroke={stroke("traps")}
            strokeWidth={active("traps") ? 1 : 0.5}
            animate={{ opacity: active("traps") ? 1 : 0.7 }}
          />

          {/* SHOULDERS (rear delts) */}
          <motion.ellipse cx="22" cy="40" rx="6" ry="8"
            fill={fill("shoulders")} stroke={stroke("shoulders")}
            strokeWidth={active("shoulders") ? 1 : 0.5}
            animate={{ opacity: active("shoulders") ? 1 : 0.7 }}
          />
          <motion.ellipse cx="58" cy="40" rx="6" ry="8"
            fill={fill("shoulders")} stroke={stroke("shoulders")}
            strokeWidth={active("shoulders") ? 1 : 0.5}
            animate={{ opacity: active("shoulders") ? 1 : 0.7 }}
          />

          {/* BACK (upper + mid) */}
          <motion.path d="M28 36 L28 68 Q34 72 40 72 Q46 72 52 68 L52 36 Z"
            fill={fill("back")} stroke={stroke("back")}
            strokeWidth={active("back") ? 1 : 0.5}
            animate={{ opacity: active("back") ? 1 : 0.7 }}
          />

          {/* LATS */}
          <motion.path d="M26 52 L28 52 L28 72 Q24 78 22 84 L26 86 Q28 78 28 72 Z"
            fill={fill("lats")} stroke={stroke("lats")}
            strokeWidth={active("lats") ? 1 : 0.5}
            animate={{ opacity: active("lats") ? 1 : 0.7 }}
          />
          <motion.path d="M54 52 L52 52 L52 72 Q56 78 58 84 L54 86 Q52 78 52 72 Z"
            fill={fill("lats")} stroke={stroke("lats")}
            strokeWidth={active("lats") ? 1 : 0.5}
            animate={{ opacity: active("lats") ? 1 : 0.7 }}
          />

          {/* TRICEPS */}
          <motion.path d="M14 48 Q12 52 14 66 L17 66 Q16 52 16 48 Z"
            fill={fill("triceps")} stroke={stroke("triceps")}
            strokeWidth={active("triceps") ? 1 : 0.5}
            animate={{ opacity: active("triceps") ? 1 : 0.7 }}
          />
          <motion.path d="M66 48 Q68 52 66 66 L63 66 Q64 52 64 48 Z"
            fill={fill("triceps")} stroke={stroke("triceps")}
            strokeWidth={active("triceps") ? 1 : 0.5}
            animate={{ opacity: active("triceps") ? 1 : 0.7 }}
          />

          {/* GLUTES */}
          <motion.path d="M28 88 Q34 96 40 96 Q46 96 52 88 L52 86 Q46 94 40 94 Q34 94 28 86 Z"
            fill={fill("glutes")} stroke={stroke("glutes")}
            strokeWidth={active("glutes") ? 1 : 0.5}
            animate={{ opacity: active("glutes") ? 1 : 0.7 }}
          />
          <motion.path d="M26 86 Q30 96 34 100 L36 96 Q32 90 28 86 Z"
            fill={fill("glutes")} stroke={stroke("glutes")}
            strokeWidth={active("glutes") ? 0.8 : 0.4}
          />
          <motion.path d="M54 86 Q50 96 46 100 L44 96 Q48 90 52 86 Z"
            fill={fill("glutes")} stroke={stroke("glutes")}
            strokeWidth={active("glutes") ? 0.8 : 0.4}
          />

          {/* HAMSTRINGS */}
          <motion.path d="M29 100 Q26 108 26 122 L30 122 Q32 108 32 100 Z"
            fill={fill("hamstrings")} stroke={stroke("hamstrings")}
            strokeWidth={active("hamstrings") ? 1 : 0.5}
            animate={{ opacity: active("hamstrings") ? 1 : 0.7 }}
          />
          <motion.path d="M51 100 Q54 108 54 122 L50 122 Q48 108 48 100 Z"
            fill={fill("hamstrings")} stroke={stroke("hamstrings")}
            strokeWidth={active("hamstrings") ? 1 : 0.5}
            animate={{ opacity: active("hamstrings") ? 1 : 0.7 }}
          />

          {/* CALVES */}
          <motion.path d="M27 126 Q25 136 27 152 L31 152 Q30 136 30 126 Z"
            fill={fill("calves")} stroke={stroke("calves")}
            strokeWidth={active("calves") ? 0.8 : 0.4}
            animate={{ opacity: active("calves") ? 1 : 0.7 }}
          />
          <motion.path d="M53 126 Q55 136 53 152 L49 152 Q50 136 50 126 Z"
            fill={fill("calves")} stroke={stroke("calves")}
            strokeWidth={active("calves") ? 0.8 : 0.4}
            animate={{ opacity: active("calves") ? 1 : 0.7 }}
          />

          {/* Torso outline */}
          <path d="M26 34 L26 90 L30 95 L50 95 L54 90 L54 34 Z"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 pt-6">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Intensidad</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(0,214,143,0.35)" }} />
          <span className="text-[9px] font-mono text-zinc-500">Leve</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(0,214,143,0.65)" }} />
          <span className="text-[9px] font-mono text-zinc-500">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(0,214,143,0.95)" }} />
          <span className="text-[9px] font-mono text-zinc-500">Alto</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(255,255,255,0.07)" }} />
          <span className="text-[9px] font-mono text-zinc-500">Sin trabajo</span>
        </div>
      </div>
    </div>
  );
}
