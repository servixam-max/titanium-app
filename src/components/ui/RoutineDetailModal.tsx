"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Clock, Layers, Dumbbell, Sparkles, Flame } from "lucide-react";
import { Routine, TrainingMode } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import ExerciseImage from "@/components/ui/ExerciseImage";
import ExerciseCard from "@/components/ui/ExerciseCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import WarmupModal from "@/components/ui/WarmupModal";

interface RoutineDetailModalProps {
  routine: Routine | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RoutineDetailModal({
  routine,
  isOpen,
  onClose,
}: RoutineDetailModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TrainingMode>("guided");
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [selectedExerciseIdx, setSelectedExerciseIdx] = useState<number | undefined>(undefined);

  const {
    startWorkout,
    equipmentPreference,
    setEquipmentPreference,
  } = useAppStore();

  if (!isOpen || !routine) return null;

  const isHIIT = routine.type === "hiit";
  const exercises =
    isHIIT &&
    equipmentPreference === "bodyweight" &&
    routine.alternativeExercises
      ? routine.alternativeExercises
      : routine.exercises;

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

  const handleStartWorkoutFlow = (exerciseIndex?: number) => {
    setSelectedExerciseIdx(exerciseIndex);
    setShowWarmupModal(true);
  };

  const handleWarmupConfirm = (wantWarmup: boolean) => {
    setShowWarmupModal(false);
    onClose();

    const workoutRoutine = {
      ...routine,
      exercises,
    };

    const targetIdx = selectedExerciseIdx ?? 0;
    startWorkout(workoutRoutine, mode, targetIdx);

    if (wantWarmup) {
      router.push(
        `/warmup?redirect=/workout/${mode}${mode === "individual" ? `?exercise=${targetIdx}` : ""}`
      );
    } else {
      if (mode === "guided") {
        router.push("/workout/guided");
      } else {
        router.push(`/workout/individual?exercise=${targetIdx}`);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fade-in">
        <div className="w-full sm:max-w-lg h-[92dvh] sm:h-[88dvh] bg-surface-container-lowest border border-surface-container-highest rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slide-up relative">
          {/* Header Image / Hero */}
          <div className="relative h-44 sm:h-48 w-full bg-surface-container-high overflow-hidden flex-shrink-0">
            {routine.coverImage && (
              <ExerciseImage
                src={routine.coverImage}
                alt={routine.title}
                containerClassName="w-full h-full"
                className="object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent" />

            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all z-10"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Routine Title overlay */}
            <div className="absolute bottom-3 left-4 right-4 z-10">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-container text-black shadow-neon">
                  DÍA {routine.day < 10 ? `0${routine.day}` : routine.day}
                </span>
                <span className="text-[11px] font-label-caps text-on-surface-variant flex items-center gap-1 bg-surface-container/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                  <Clock className="w-3 h-3 text-primary-container" />
                  {routine.duration}
                </span>
                <span className="text-[11px] font-label-caps text-on-surface-variant flex items-center gap-1 bg-surface-container/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
                  <Layers className="w-3 h-3 text-primary-container" />
                  {totalSets} series
                </span>
              </div>
              <h2 className="font-headline-lg text-xl sm:text-2xl text-white font-bold tracking-wide truncate">
                {routine.title}
              </h2>
            </div>
          </div>

          {/* Body content - scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {routine.subtitle}
            </p>

            {/* HIIT Equipment toggle if applicable */}
            {isHIIT && routine.alternativeExercises && (
              <div className="p-1 bg-surface-container-high border border-surface-container-highest rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setEquipmentPreference("dumbbells")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold font-label-caps transition-all ${
                    equipmentPreference === "dumbbells"
                      ? "bg-primary-container text-black shadow-sm"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  Con Mancuernas
                </button>
                <button
                  type="button"
                  onClick={() => setEquipmentPreference("bodyweight")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold font-label-caps transition-all ${
                    equipmentPreference === "bodyweight"
                      ? "bg-primary-container text-black shadow-sm"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  Peso Corporal
                </button>
              </div>
            )}

            {/* Mode selection tabs */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-label-caps text-on-surface-variant font-bold uppercase tracking-wider">
                {exercises.length} Ejercicios
              </span>
              <div className="flex bg-surface-container-high border border-surface-container-highest rounded-lg p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMode("guided")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === "guided"
                      ? "bg-primary-container text-black"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  Modo Guiado
                </button>
                <button
                  type="button"
                  onClick={() => setMode("individual")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === "individual"
                      ? "bg-primary-container text-black"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-2 pb-4">
              {exercises.map((ex, idx) => (
                <ExerciseCard
                  key={ex.id || idx}
                  exercise={ex}
                  index={idx}
                  mode={mode}
                  onClick={() => {
                    if (mode === "individual") {
                      handleStartWorkoutFlow(idx);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-4 bg-surface-container-low border-t border-surface-container-highest flex-shrink-0 flex gap-2">
            <PrimaryButton
              leftIcon={<Play className="w-5 h-5 fill-current" />}
              onClick={() => handleStartWorkoutFlow(0)}
              className="flex-1 shadow-neon"
            >
              {mode === "guided" ? "INICIAR GUIADO" : "INICIAR INDIVIDUAL"}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Warmup Question Modal */}
      <WarmupModal
        isOpen={showWarmupModal}
        onClose={() => setShowWarmupModal(false)}
        onStartWarmup={() => handleWarmupConfirm(true)}
        onSkipWarmup={() => handleWarmupConfirm(false)}
        routineTitle={routine.title}
      />
    </>
  );
}
