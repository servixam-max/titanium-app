"use client";

import { Clock, Flame, Star } from "lucide-react";
import Link from "next/link";
import { Routine } from "@/lib/types";
import { useAppStore } from "@/lib/store";

interface RoutineCardProps {
  routine: Routine;
  showEquipmentToggle?: boolean;
}

export default function RoutineCard({
  routine,
  showEquipmentToggle = false,
}: RoutineCardProps) {
  const { equipmentPreference, setEquipmentPreference } = useAppStore();

  const handleEquipmentChange = (pref: "dumbbells" | "bodyweight") => {
    setEquipmentPreference(pref);
  };

  return (
    <div className={`bg-surface rounded-xl border border-surface-container-highest overflow-hidden relative shadow-[0px_8px_24px_rgba(0,0,0,0.5)] flex flex-col ${routine.day === 4 ? 'border-primary-container/40' : ''}`}>
      {/* Card Header Image */}
      <div className="h-32 bg-surface-container-high relative overflow-hidden">
        {/* Real Exercise Image - changes based on equipment preference */}
        {routine.coverImage ? (
          <img
                src={
                  showEquipmentToggle && equipmentPreference === "bodyweight" && routine.coverImageBodyweight
                    ? routine.coverImageBodyweight
                    : routine.coverImage
                }
            alt={routine.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.8 }}
          />
        ) : null}
        
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        
        {/* HIIT Fire Icon when no image */}
        {routine.type === "hiit" && !routine.coverImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Flame className="w-20 h-20 text-primary-container" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <span className="bg-surface-container-highest text-on-surface font-label-caps text-label-caps px-2 py-1 rounded-full border border-surface-variant flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {routine.duration}
          </span>
          <span
            className={`font-label-caps text-label-caps px-2 py-1 rounded-full border ${
              routine.difficulty === "Cardio HIIT"
                ? "bg-primary-container/20 text-primary-container border-primary-container/30"
                : "bg-surface-container-highest text-on-surface border-surface-variant"
            }`}
          >
            {routine.day === 4 ? 'PERSONALIZADO' : routine.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-stack-gap flex flex-col gap-base relative z-20">
        <h4 className="font-headline-md text-headline-md flex items-center gap-2">{routine.day === 4 && <Star className="w-5 h-5 text-primary-container fill-primary-container" />}{routine.title}</h4>
        <p className="font-body-md text-body-md text-secondary">
          {routine.subtitle}
        </p>

        <div className="flex items-center gap-2 mt-2">
          <span className="font-label-caps text-label-caps text-secondary-fixed-dim">
            {routine.exercises.length} ejercicios
          </span>
        </div>

        {/* Equipment Toggle for Day 3 */}
        {showEquipmentToggle && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleEquipmentChange("bodyweight")}
                className={`flex-1 py-2 rounded-lg border font-label-caps text-label-caps transition-all active:scale-95 ${
                  equipmentPreference === "bodyweight"
                    ? "bg-primary-container text-on-primary-fixed border-primary-container shadow-[0_0_10px_rgba(195,244,0,0.2)]"
                    : "bg-surface-container-low text-secondary border-surface-container-highest"
                }`}
              >
                SIN MATERIAL
              </button>
              <button
                onClick={() => handleEquipmentChange("dumbbells")}
                className={`flex-1 py-2 rounded-lg border font-label-caps text-label-caps transition-all active:scale-95 ${
                  equipmentPreference === "dumbbells"
                    ? "bg-primary-container text-on-primary-fixed border-primary-container shadow-[0_0_10px_rgba(195,244,0,0.2)]"
                    : "bg-surface-container-low text-secondary border-surface-container-highest"
                }`}
              >
                MANCUERNAS
              </button>
            </div>
          </div>
        )}

        <Link
          href={`/routine/${routine.day}`}
          className="w-full h-touch-target-min mt-4 bg-primary-container text-on-primary-fixed font-headline-md text-headline-md rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          Empezar
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
