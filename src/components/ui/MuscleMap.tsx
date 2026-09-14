"use client";

import { useMemo } from "react";
import AnatomicalMuscleViewer from "./AnatomicalMuscleViewer";
import {
  AnatomicalMuscle,
  DetailedMuscleStat,
  MUSCLE_METADATA,
} from "@/lib/muscle-engine";

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
  volumeKg: number;
}

interface MuscleMapProps {
  activity: MuscleActivity[];
  maxVolume?: number;
  className?: string;
}

// Map old category → legacy groups
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

export default function MuscleMap({ activity, maxVolume, className }: MuscleMapProps) {
  // Translate legacy MuscleActivity[] into DetailedMuscleStat map
  const statsMap = useMemo(() => {
    const rawVolumeMap = new Map<string, number>();
    activity.forEach((a) => {
      rawVolumeMap.set(a.group, (rawVolumeMap.get(a.group) || 0) + a.volumeKg);
    });

    const maxVol = maxVolume ?? Math.max(...Array.from(rawVolumeMap.values()), 1);

    const result = {} as Record<AnatomicalMuscle, DetailedMuscleStat>;

    (Object.keys(MUSCLE_METADATA) as AnatomicalMuscle[]).forEach((m) => {
      let vol = 0;
      if (m === "deltoids_ant" || m === "deltoids_lat" || m === "deltoids_post") {
        vol = rawVolumeMap.get("shoulders") || 0;
      } else if (m === "abs" || m === "obliques") {
        vol = rawVolumeMap.get("abs") || rawVolumeMap.get("core") || 0;
      } else if (m === "lower_back") {
        vol = rawVolumeMap.get("back") || 0;
      } else {
        vol = rawVolumeMap.get(m) || 0;
      }

      const ratio = maxVol > 0 ? Math.min(1, vol / maxVol) : 0;
      let intensityLevel: DetailedMuscleStat["intensityLevel"] = "none";
      if (ratio > 0.75) intensityLevel = "peak";
      else if (ratio > 0.45) intensityLevel = "high";
      else if (ratio > 0.2) intensityLevel = "moderate";
      else if (vol > 0) intensityLevel = "light";

      result[m] = {
        muscle: m,
        info: MUSCLE_METADATA[m],
        volumeKg: vol,
        totalSets: vol > 0 ? Math.max(1, Math.round(vol / 250)) : 0,
        totalReps: vol > 0 ? Math.max(10, Math.round(vol / 25)) : 0,
        activationRatio: ratio,
        intensityLevel,
      };
    });

    return result;
  }, [activity, maxVolume]);

  return (
    <AnatomicalMuscleViewer
      muscleStats={statsMap}
      timeframe="week"
      className={className}
    />
  );
}
