"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Clock, Layers, Dumbbell, Sparkles, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  if (!routine) return null;

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center overflow-hidden">
          {/* Backdrop Blur with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 w-full sm:max-w-lg h-[90dvh] sm:h-[86dvh] bg-[#0c0c10] border-t sm:border border-white/15 rounded-t-[32px] sm:rounded-3xl flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.9)]"
          >
            {/* Grabber bar for mobile feel */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

            {/* Header Hero Image */}
            <div className="relative h-44 sm:h-48 w-full bg-zinc-900 overflow-hidden flex-shrink-0">
              {routine.coverImage && (
                <ExerciseImage
                  src={routine.coverImage}
                  alt={routine.title}
                  containerClassName="w-full h-full"
                  className="object-cover opacity-60 scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-[#0c0c10]/50 to-black/30" />

              {/* Top Close Button */}
              <button
                onClick={onClose}
                className="absolute top-3.5 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-black/80 active:scale-95 transition-all z-20"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Routine Title overlay */}
              <div className="absolute bottom-3 left-4 right-4 z-10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-container text-black shadow-[0_0_10px_rgba(204,255,0,0.4)]">
                    DÍA {routine.day < 10 ? `0${routine.day}` : routine.day}
                  </span>
                  <span className="text-[11px] font-label-caps text-zinc-300 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary-container" />
                    {routine.duration}
                  </span>
                  <span className="text-[11px] font-label-caps text-zinc-300 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                    <Layers className="w-3.5 h-3.5 text-primary-container" />
                    {totalSets} series
                  </span>
                </div>
                <h2 className="font-headline-lg text-xl sm:text-2xl text-white font-bold tracking-wide truncate drop-shadow-md">
                  {routine.title}
                </h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5">
              <p className="text-xs text-zinc-400 leading-relaxed">
                {routine.subtitle}
              </p>

              {/* HIIT Equipment toggle if applicable */}
              {isHIIT && routine.alternativeExercises && (
                <div className="p-1 bg-zinc-900/90 border border-white/10 rounded-xl flex gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setEquipmentPreference("dumbbells")}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold font-label-caps transition-all ${
                      equipmentPreference === "dumbbells"
                        ? "bg-primary-container text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
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
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Peso Corporal
                  </button>
                </div>
              )}

              {/* Mode segmented control */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-label-caps text-zinc-300 font-bold uppercase tracking-wider">
                  {exercises.length} Ejercicios
                </span>
                <div className="relative flex bg-zinc-900/90 border border-white/10 rounded-xl p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMode("guided")}
                    className={`relative z-10 px-3.5 py-1.5 rounded-lg transition-colors duration-200 ${
                      mode === "guided" ? "text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode === "guided" && (
                      <motion.div
                        layoutId="detail-mode-pill"
                        className="absolute inset-0 bg-primary-container rounded-lg shadow-[0_0_10px_rgba(204,255,0,0.3)] -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    Modo Guiado
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("individual")}
                    className={`relative z-10 px-3.5 py-1.5 rounded-lg transition-colors duration-200 ${
                      mode === "individual" ? "text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode === "individual" && (
                      <motion.div
                        layoutId="detail-mode-pill"
                        className="absolute inset-0 bg-primary-container rounded-lg shadow-[0_0_10px_rgba(204,255,0,0.3)] -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    Individual
                  </button>
                </div>
              </div>

              {/* Exercises List with subtle stagger */}
              <div className="space-y-2 pb-6">
                {exercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + idx * 0.04, duration: 0.3 }}
                  >
                    <ExerciseCard
                      exercise={ex}
                      index={idx}
                      mode={mode}
                      onClick={() => {
                        if (mode === "individual") {
                          handleStartWorkoutFlow(idx);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sticky Bottom Action Bar - completely above any navbar */}
            <div className="p-4 bg-[#0a0a0d] border-t border-white/10 flex-shrink-0 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-30">
              <PrimaryButton
                leftIcon={<Play className="w-5 h-5 fill-current" />}
                onClick={() => handleStartWorkoutFlow(0)}
                className="w-full h-14 font-headline-md text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(204,255,0,0.5)] transition-all"
              >
                {mode === "guided" ? "INICIAR ENTRENAMIENTO GUIADO" : "INICIAR MODO INDIVIDUAL"}
              </PrimaryButton>
            </div>
          </motion.div>

          {/* Warmup Question Modal */}
          <WarmupModal
            isOpen={showWarmupModal}
            onClose={() => setShowWarmupModal(false)}
            onStartWarmup={() => handleWarmupConfirm(true)}
            onSkipWarmup={() => handleWarmupConfirm(false)}
            routineTitle={routine.title}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
