"use client";

import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, CheckCircle, Hash, Weight, RotateCcw } from "lucide-react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Exercise } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { estimate1RM, checkNewSetRecord, ExerciseRecord } from "@/lib/records";

interface SetLoggerProps {
  exercise: Exercise;
  isLastSet: boolean;
  isLastExercise: boolean;
  weight: number;
  reps: number;
  showRepeat?: boolean;
  existingRecord?: ExerciseRecord;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onComplete: () => void;
  onRepeatLastSet?: () => void;
  className?: string;
}

function clamp(value: number, min = 0, max = 9999): number {
  return Math.max(min, Math.min(max, value));
}

export default function SetLogger({
  exercise,
  isLastSet,
  isLastExercise,
  weight,
  reps,
  showRepeat = false,
  existingRecord,
  onWeightChange,
  onRepsChange,
  onComplete,
  onRepeatLastSet,
  className,
}: SetLoggerProps) {
  const [localWeight, setLocalWeight] = useState(String(weight || ""));
  const [localReps, setLocalReps] = useState(String(reps || ""));

  useEffect(() => {
    setLocalWeight(weight > 0 ? String(weight) : "");
  }, [weight, exercise.id]);

  useEffect(() => {
    setLocalReps(reps > 0 ? String(reps) : "");
  }, [reps, exercise.id]);

  const estimated1RM = useMemo(
    () => estimate1RM(Number(localWeight) || 0, Number(localReps) || 0),
    [localWeight, localReps]
  );

  const prStatus = useMemo(
    () => checkNewSetRecord(exercise.id ?? "", Number(localWeight) || 0, Number(localReps) || 0, existingRecord),
    [localWeight, localReps, exercise.id, existingRecord]
  );

  const commitWeight = () => {
    const parsed = Number(localWeight);
    if (!isNaN(parsed)) {
      onWeightChange(clamp(parsed, 0, 9999));
    }
  };

  const commitReps = () => {
    const parsed = Number(localReps);
    if (!isNaN(parsed)) {
      onRepsChange(clamp(parsed, 0, 9999));
    }
  };

  const adjustWeight = (delta: number) => {
    const base = Number(localWeight) || 0;
    const next = clamp(base + delta, 0, 9999);
    setLocalWeight(String(next));
    onWeightChange(next);
    haptics.tick();
  };

  const adjustReps = (delta: number) => {
    const base = Number(localReps) || 0;
    const next = clamp(base + delta, 0, 9999);
    setLocalReps(String(next));
    onRepsChange(next);
    haptics.tick();
  };

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {showRepeat && onRepeatLastSet && (
        <PrimaryButton
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={onRepeatLastSet}
          className="mb-1"
        >
          Repetir última serie
        </PrimaryButton>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Weight input */}
        <div className="bg-[#121620] border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-caps text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Weight className="w-3.5 h-3.5 text-primary" />
              Peso (kg)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWeight(-2.5)}
              className="w-10 h-10 rounded-xl bg-[#161e2e] border border-white/10 flex items-center justify-center text-white active:scale-95"
              aria-label="Bajar peso"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={(e) => e.key === "Enter" && commitWeight()}
              className="flex-1 min-w-0 h-10 bg-background border border-white/10 rounded-xl text-center text-white font-mono font-bold text-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => adjustWeight(2.5)}
              className="w-10 h-10 rounded-xl bg-[#161e2e] border border-white/10 flex items-center justify-center text-white active:scale-95"
              aria-label="Subir peso"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reps input */}
        <div className="bg-[#121620] border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-caps text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-primary" />
              Reps
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustReps(-1)}
              className="w-10 h-10 rounded-xl bg-[#161e2e] border border-white/10 flex items-center justify-center text-white active:scale-95"
              aria-label="Bajar reps"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={localReps}
              onChange={(e) => setLocalReps(e.target.value)}
              onBlur={commitReps}
              onKeyDown={(e) => e.key === "Enter" && commitReps()}
              className="flex-1 min-w-0 h-10 bg-background border border-white/10 rounded-xl text-center text-white font-mono font-bold text-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => adjustReps(1)}
              className="w-10 h-10 rounded-xl bg-[#161e2e] border border-white/10 flex items-center justify-center text-white active:scale-95"
              aria-label="Subir reps"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1RM estimate — shown when weight > 0 and reps >= 2 */}
      {estimated1RM > 0 && (Number(localReps) || 0) >= 2 && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl">
          <span className="text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">1RM Est.</span>
          <span className="text-white font-mono font-black text-sm">{estimated1RM} kg</span>
          <span className="text-zinc-400 text-[10px] font-mono">(Epley)</span>
        </div>
      )}

      {/* PR badge — shown when current values beat the existing record */}
      {(prStatus.isBest1RM || prStatus.isBestWeight) && (Number(localWeight) || 0) > 0 && (Number(localReps) || 0) > 0 && (
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-primary/15 border border-primary/40 rounded-full">
          <span className="text-base">🏆</span>
          <span className="text-primary text-xs font-mono font-black uppercase tracking-wider">¡Nuevo Récord!</span>
        </div>
      )}

      <PrimaryButton
        leftIcon={<CheckCircle className="w-6 h-6" />}
        onClick={onComplete}
      >
        {isLastSet && isLastExercise ? "FINALIZAR" : "COMPLETAR SERIE"}
      </PrimaryButton>
    </div>
  );
}
