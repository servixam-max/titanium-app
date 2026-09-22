"use client";

import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, CheckCircle, RotateCcw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { Exercise } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { estimate1RM, checkNewSetRecord, ExerciseRecord } from "@/lib/records";
import { LastPerformance, LoadSuggestion } from "@/lib/progression";
import VoiceLoggerButton from "./VoiceLoggerButton";
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
    [localWeight, localReps],
  );

  const prStatus = useMemo(
    () => checkNewSetRecord(exercise.id ?? "", Number(localWeight) || 0, Number(localReps) || 0, existingRecord),
    [localWeight, localReps, exercise.id, existingRecord],
  );

  const commitWeight = () => {
    const parsed = Number(localWeight);
    if (!isNaN(parsed)) onWeightChange(clamp(parsed, 0, 9999));
  };

  const commitReps = () => {
    const parsed = Number(localReps);
    if (!isNaN(parsed)) onRepsChange(clamp(parsed, 0, 9999));
  };

  const adjustWeight = (delta: number) => {
    const next = clamp((Number(localWeight) || 0) + delta, 0, 9999);
    setLocalWeight(String(next));
    onWeightChange(next);
    haptics.tick();
  };

  const adjustReps = (delta: number) => {
    const next = clamp((Number(localReps) || 0) + delta, 0, 9999);
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
      setTimeout(() => onComplete(), 600);
    }
  };

  const isRecord = (prStatus.isBest1RM || prStatus.isBestWeight) && Number(localWeight) > 0 && Number(localReps) > 0;

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {/* Fila de utilidades: discreta, sin bordes */}
      <div className="flex items-center justify-between">
        {showRepeat && onRepeatLastSet ? (
          <button
            type="button"
            onClick={onRepeatLastSet}
            className="fx-press flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--text-secondary)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repetir serie
          </button>
        ) : (
          <span />
        )}
        <VoiceLoggerButton onParsed={handleVoiceParsed} />
      </div>

      {/* Última marca + sugerencia: la app propone, no solo registra */}
      {(lastPerformance || suggestion) && (
        <div className="fx-inset flex items-start justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0 flex flex-col gap-0.5">
            {lastPerformance ? (
              <p className="text-[13px] leading-snug text-[color:var(--text-secondary)]">
                Última vez{" "}
                <span className="fx-num text-foreground">
                  {lastPerformance.topWeight} kg × {lastPerformance.repsAtTopWeight}
                </span>
                <span className="text-[color:var(--text-tertiary)]"> · {relativeDate(lastPerformance.date)}</span>
              </p>
            ) : (
              <p className="text-[13px] text-[color:var(--text-secondary)]">Primera vez con este ejercicio</p>
            )}

            {suggestion && (
              <p className="flex items-center gap-1.5 text-[13px] leading-snug">
                {suggestion.action === "increase" && <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                {suggestion.action === "down" && <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
                {suggestion.action === "start" && <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--accent-cyan)]" />}
                {suggestion.action === "hold" && <Minus className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--text-tertiary)]" />}
                <span className="min-w-0 truncate text-[color:var(--text-secondary)]">
                  Hoy{" "}
                  <span className="fx-num text-primary">
                    {suggestion.weight > 0 ? `${suggestion.weight} kg × ` : ""}
                    {suggestion.reps}
                  </span>
                  <span className="text-[color:var(--text-tertiary)]"> · {suggestion.reason}</span>
                </span>
              </p>
            )}
          </div>

          {suggestion && (suggestion.weight !== weight || suggestion.reps !== reps) && (
            <button
              type="button"
              onClick={applySuggestion}
              className="fx-press flex-shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-[13px] font-semibold text-primary"
            >
              Usar
            </button>
          )}
        </div>
      )}

      {/* Peso y reps: dos campos serenos, sin cajas con borde */}
      <div className="grid grid-cols-2 gap-6">
        {[
          {
            key: "weight",
            label: "Peso (kg)",
            value: localWeight,
            step: 2.5,
            decimal: true,
            onChange: setLocalWeight,
            onCommit: commitWeight,
            onAdjust: adjustWeight,
          },
          {
            key: "reps",
            label: "Reps",
            value: localReps,
            step: 1,
            decimal: false,
            onChange: setLocalReps,
            onCommit: commitReps,
            onAdjust: adjustReps,
          },
        ].map((field) => (
          <div key={field.key} className="flex flex-col items-center gap-2">
            <span className="fx-label-sm">{field.label}</span>
            <div className="flex w-full items-center justify-between gap-1">
              <button
                onClick={() => field.onAdjust(-field.step)}
                aria-label={`Bajar ${field.label}`}
                className="fx-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fx-inset)] text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                inputMode={field.decimal ? "decimal" : "numeric"}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onCommit}
                onKeyDown={(e) => e.key === "Enter" && field.onCommit()}
                aria-label={field.label}
                className="fx-num min-w-0 flex-1 bg-transparent text-center text-[30px] leading-none font-semibold text-foreground outline-none focus:outline-none"
              />
              <button
                onClick={() => field.onAdjust(field.step)}
                aria-label={`Subir ${field.label}`}
                className="fx-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fx-inset)] text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Contexto: 1RM y récord, como texto; sin cajas que compitan */}
      {(estimated1RM > 0 || isRecord) && (
        <div className="flex items-center justify-center gap-3 text-[13px]">
          {estimated1RM > 0 && (Number(localReps) || 0) >= 2 && (
            <span className="text-[color:var(--text-tertiary)]">
              1RM estimado <span className="fx-num text-[color:var(--text-secondary)]">{estimated1RM} kg</span>
            </span>
          )}
          {isRecord && <span className="font-semibold text-primary">Nuevo récord</span>}
        </div>
      )}

      {/* Esfuerzo: opcional, discreto */}
      <div className="flex items-center justify-between gap-3">
        <span className="fx-label-sm">Esfuerzo</span>
        <div className="fx-segmented !p-0.5">
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
              className="fx-segmented-item !min-h-[32px] !px-0 w-9"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <PrimaryButton leftIcon={<CheckCircle className="w-6 h-6" />} onClick={() => onComplete(rpe)}>
        {isLastSet && isLastExercise ? "Finalizar" : "Completar serie"}
      </PrimaryButton>
    </div>
  );
}
