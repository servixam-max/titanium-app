"use client";

import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, CheckCircle, Hash, Weight, RotateCcw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Exercise } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { estimate1RM, checkNewSetRecord, ExerciseRecord } from "@/lib/records";
import { LastPerformance, LoadSuggestion } from "@/lib/progression";
import VoiceLoggerButton from "./VoiceLoggerButton";
import NumberTicker from "@/components/ui/NumberTicker";
import { ParsedVoiceWorkout } from "@/lib/voice-parser";

interface SetLoggerProps {
  exercise: Exercise;
  isLastSet: boolean;
  isLastExercise: boolean;
  weight: number;
  reps: number;
  showRepeat?: boolean;
  existingRecord?: ExerciseRecord;
  lastPerformance?: LastPerformance;
  suggestion?: LoadSuggestion;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onComplete: (rpe?: number) => void;
  onRepeatLastSet?: () => void;
  className?: string;
}

function clamp(value: number, min = 0, max = 9999): number {
  return Math.max(min, Math.min(max, value));
}

/** "hace 3 días" / "ayer" / "hoy", para dar contexto a la última marca. */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "hace 1 semana";
  if (weeks < 5) return `hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "hace 1 mes" : `hace ${months} meses`;
}

export default function SetLogger({
  exercise,
  isLastSet,
  isLastExercise,
  weight,
  reps,
  showRepeat = false,
  existingRecord,
  lastPerformance,
  suggestion,
  onWeightChange,
  onRepsChange,
  onComplete,
  onRepeatLastSet,
  className,
}: SetLoggerProps) {
  const [localWeight, setLocalWeight] = useState(String(weight || ""));
  const [localReps, setLocalReps] = useState(String(reps || ""));
  // RPE opcional: si se marca, el descanso se ajusta al esfuerzo real.
  const [rpe, setRpe] = useState<number | undefined>(undefined);

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

  const applySuggestion = () => {
    if (!suggestion) return;
    if (suggestion.weight > 0) {
      setLocalWeight(String(suggestion.weight));
      onWeightChange(suggestion.weight);
    }
    setLocalReps(String(suggestion.reps));
    onRepsChange(suggestion.reps);
    haptics.selection();
  };

  const handleVoiceParsed = (data: ParsedVoiceWorkout) => {
    if (data.weight !== undefined) {
      setLocalWeight(String(data.weight));
      onWeightChange(data.weight);
    }
    if (data.reps !== undefined) {
      setLocalReps(String(data.reps));
      onRepsChange(data.reps);
    }
    if (data.autoSubmit) {
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-0.5">
        {showRepeat && onRepeatLastSet ? (
          <button
            type="button"
            onClick={onRepeatLastSet}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/5 rounded-xl active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repetir serie</span>
          </button>
        ) : (
          <div />
        )}
        <VoiceLoggerButton onParsed={handleVoiceParsed} />
      </div>

      {/* Última marca + sugerencia de progresión: la app deja de preguntar y propone */}
      {(lastPerformance || suggestion) && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3 py-2">
          <div className="min-w-0 flex flex-col gap-0.5">
            {lastPerformance ? (
              <p className="text-xs text-zinc-400 leading-tight">
                Última vez:{" "}
                <span className="font-mono font-bold text-white">
                  {lastPerformance.topWeight} kg × {lastPerformance.repsAtTopWeight}
                </span>
                <span className="ml-1 text-zinc-500">· {relativeDate(lastPerformance.date)}</span>
              </p>
            ) : (
              <p className="text-xs text-zinc-400 leading-tight">Primera vez con este ejercicio</p>
            )}

            {suggestion && (
              <p className="flex items-center gap-1.5 text-xs leading-tight">
                {suggestion.action === "increase" && <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                {suggestion.action === "down" && <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
                {suggestion.action === "start" && <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-accent-cyan" />}
                {suggestion.action === "hold" && <Weight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />}
                <span className="truncate text-zinc-300">
                  <span className="font-mono font-bold text-primary">
                    {suggestion.weight > 0 ? `${suggestion.weight} kg × ` : ""}
                    {suggestion.reps}
                  </span>{" "}
                  · {suggestion.reason}
                </span>
              </p>
            )}
          </div>

          {suggestion && (suggestion.weight !== weight || suggestion.reps !== reps) && (
            <button
              type="button"
              onClick={applySuggestion}
              className="flex-shrink-0 rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
            >
              Usar
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Weight input */}
        <div className="bg-[#131626] border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-caps text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Weight className="w-3.5 h-3.5 text-primary" />
              Peso (kg)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWeight(-2.5)}
              className="w-10 h-10 rounded-xl bg-[#181d2e] border border-white/10 hover:border-primary/40 flex items-center justify-center text-white active:scale-95 transition-all"
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
              className="flex-1 min-w-0 h-10 bg-[#0d101a] border border-white/10 rounded-xl text-center text-white font-mono font-bold text-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => adjustWeight(2.5)}
              className="w-10 h-10 rounded-xl bg-[#181d2e] border border-white/10 hover:border-primary/40 flex items-center justify-center text-white active:scale-95 transition-all"
              aria-label="Subir peso"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reps input */}
        <div className="bg-[#131626] border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-label-caps text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-primary" />
              Reps
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustReps(-1)}
              className="w-10 h-10 rounded-xl bg-[#181d2e] border border-white/10 hover:border-primary/40 flex items-center justify-center text-white active:scale-95 transition-all"
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
              className="flex-1 min-w-0 h-10 bg-[#0d101a] border border-white/10 rounded-xl text-center text-white font-mono font-bold text-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => adjustReps(1)}
              className="w-10 h-10 rounded-xl bg-[#181d2e] border border-white/10 hover:border-primary/40 flex items-center justify-center text-white active:scale-95 transition-all"
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
          <NumberTicker value={estimated1RM} suffix=" kg" className="text-white font-mono font-black text-sm" />
          <span className="text-zinc-400 text-[10px] font-mono">(Epley)</span>
        </div>
      )}

      {/* PR badge — shown when current values beat the existing record */}
      {(prStatus.isBest1RM || prStatus.isBestWeight) && (Number(localWeight) || 0) > 0 && (Number(localReps) || 0) > 0 && (
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-gradient-to-r from-primary/20 to-emerald-500/20 border border-primary/40 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="text-base">🏆</span>
          <span className="text-primary text-xs font-mono font-black uppercase tracking-wider">¡Nuevo Récord!</span>
        </div>
      )}

      {/* Esfuerzo percibido (RPE): opcional, ajusta el descanso y la progresión */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          ¿Cómo fue?
        </span>
        <div className="flex items-center gap-1.5">
          {[6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRpe(rpe === value ? undefined : value);
                haptics.selection();
              }}
              aria-pressed={rpe === value}
              aria-label={`Esfuerzo ${value} de 10`}
              className={`h-8 w-8 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 ${
                rpe === value
                  ? "bg-primary text-black border border-primary"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <PrimaryButton
        leftIcon={<CheckCircle className="w-6 h-6" />}
        onClick={() => onComplete(rpe)}
      >
        {isLastSet && isLastExercise ? "FINALIZAR" : "COMPLETAR SERIE"}
      </PrimaryButton>
    </div>
  );
}
