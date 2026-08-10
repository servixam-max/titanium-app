"use client";

import { Clock, Flame, Layers, Star } from "lucide-react";
import Link from "next/link";
import { Routine } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface RoutineCardProps {
  routine: Routine;
  showEquipmentToggle?: boolean;
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  legs: "Piernas",
  core: "Core",
  full_body: "Full body",
};

const MUSCLE_COLORS: Record<string, string> = {
  chest: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  back: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  shoulders: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  biceps: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  triceps: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  legs: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  core: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  full_body: "bg-primary-container/20 text-primary-container border-primary-container/30",
};

export default function RoutineCard({
  routine,
  showEquipmentToggle = false,
}: RoutineCardProps) {
  const { equipmentPreference, setEquipmentPreference } = useAppStore();

  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0);

  const muscleGroups = Array.from(
    new Set(
      routine.exercises
        .map((ex) => ex.category)
        .filter((cat): cat is string => Boolean(cat))
    )
  );

  const handleEquipmentChange = (pref: "dumbbells" | "bodyweight") => {
    setEquipmentPreference(pref);
  };

  const isPersonalized = routine.day === 4;
  const coverSrc =
    showEquipmentToggle &&
    equipmentPreference === "bodyweight" &&
    routine.coverImageBodyweight
      ? routine.coverImageBodyweight
      : routine.coverImage;

  return (
    <div
      className={`group bg-surface rounded-xl border border-surface-container-highest overflow-hidden relative shadow-rest flex flex-col transition-all duration-200 hover:shadow-neon hover:border-primary-container/30 active:scale-[0.98] ${
        isPersonalized ? "border-primary-container/40" : ""
      }`}
    >
      {/* Card Header Image */}
      <div className="h-36 bg-surface-container-high relative overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={routine.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ opacity: 0.9 }}
          />
        ) : null}

        {/* Strong gradient overlay for text readability and tactile depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20 z-10" />
        <div className="absolute inset-0 bg-black/20 z-10" />

        {/* HIIT Fire Icon fallback */}
        {routine.type === "hiit" && !routine.coverImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 z-0">
            <Flame className="w-20 h-20 text-primary-container" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-surface-container-highest text-on-surface font-label-caps text-label-caps px-2 py-1 rounded-full border border-surface-variant flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {routine.duration}
            </span>
            <span
              className={`font-label-caps text-label-caps px-2 py-1 rounded-full border flex items-center gap-1 ${
                routine.difficulty === "Cardio HIIT"
                  ? "bg-primary-container/20 text-primary-container border-primary-container/30"
                  : "bg-surface-container-highest text-on-surface border-surface-variant"
              }`}
            >
              {isPersonalized ? "PERSONALIZADO" : routine.difficulty.toUpperCase()}
            </span>
          </div>
          {isPersonalized && (
            <Star className="w-5 h-5 text-primary-container fill-primary-container flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col gap-3 relative z-20">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-headline-md text-headline-md">
            {routine.title}
          </h4>
        </div>

        <p className="font-body-md text-body-md text-secondary leading-snug">
          {routine.subtitle}
        </p>

        {/* Muscle group chips */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {muscleGroups.map((group) => {
              const colors = MUSCLE_COLORS[group] || MUSCLE_COLORS.full_body;
              return (
                <span
                  key={group}
                  className={`font-label-caps text-label-caps px-2 py-1 rounded-full border ${colors}`}
                >
                  {MUSCLE_LABELS[group] || group}
                </span>
              );
            })}
          </div>
        )}

        {/* Quick stats */}
        <div className="flex items-center gap-3">
          <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {totalSets} series
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-surface-variant" />
            {routine.exercises.length} ejercicios
          </span>
        </div>

        {/* Equipment Toggle for Day 3 */}
        {showEquipmentToggle && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleEquipmentChange("bodyweight")}
                className={`flex-1 py-2.5 rounded-lg border font-label-caps text-label-caps transition-all active:scale-95 ${
                  equipmentPreference === "bodyweight"
                    ? "bg-primary-container text-on-primary-fixed border-primary-container shadow-[0_0_10px_rgba(195,244,0,0.2)]"
                    : "bg-surface-container-low text-secondary border-surface-container-highest hover:border-surface-variant"
                }`}
              >
                SIN MATERIAL
              </button>
              <button
                onClick={() => handleEquipmentChange("dumbbells")}
                className={`flex-1 py-2.5 rounded-lg border font-label-caps text-label-caps transition-all active:scale-95 ${
                  equipmentPreference === "dumbbells"
                    ? "bg-primary-container text-on-primary-fixed border-primary-container shadow-[0_0_10px_rgba(195,244,0,0.2)]"
                    : "bg-surface-container-low text-secondary border-surface-container-highest hover:border-surface-variant"
                }`}
              >
                MANCUERNAS
              </button>
            </div>
          </div>
        )}

        <Link
          href={`/routine/${routine.day}`}
          className="w-full h-touch-target-min mt-1 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-neon hover:shadow-neon-strong focus-visible:outline-2 focus-visible:outline-primary-container focus-visible:outline-offset-2"
        >
          Empezar
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
