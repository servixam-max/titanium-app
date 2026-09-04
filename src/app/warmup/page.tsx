"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SkipForward,
  ArrowRight,
  Play,
  Pause,
  Sparkles,
  Zap,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronRight,
  Flame,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import { useAppStore } from "@/lib/store";
import { warmUpExercises } from "@/lib/data";
import {
  announceWarmupPrep,
  announceWarmupTransition,
  announceWarmupComplete,
  announceExerciseStart,
  speak,
  playExerciseStart,
  playRestStart,
  playCountdown,
  setAudioMode,
  setVoiceRate,
} from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import ExerciseImage from "@/components/ui/ExerciseImage";
import { motion, AnimatePresence } from "framer-motion";

type WarmupPhase = "prep" | "exercise" | "transition" | "post_rest";

const PREP_SECONDS = 10;
const EXERCISE_SECONDS = 60;
const TRANSITION_SECONDS = 10;
const POST_REST_SECONDS = 60;

function WarmupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfter = searchParams.get("redirect") || "/";
  const { audioEnabled, audioMode, voiceRate } = useAppStore();

  const [phase, setPhase] = useState<WarmupPhase>("prep");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PREP_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const currentExercise = warmUpExercises[currentExerciseIndex];
  const nextExercise =
    currentExerciseIndex < warmUpExercises.length - 1
      ? warmUpExercises[currentExerciseIndex + 1]
      : null;

  // Sync audio engine with store
  useEffect(() => {
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  // Announce initial preparation on mount
  useEffect(() => {
    if (audioEnabled && warmUpExercises.length > 0) {
      announceWarmupPrep(warmUpExercises[0]?.name);
    }
  }, [audioEnabled]);

  const handleSkipToWorkout = useCallback(() => {
    router.push(redirectAfter);
  }, [router, redirectAfter]);

  const startExercise = useCallback((index: number) => {
    setCurrentExerciseIndex(index);
    setPhase("exercise");
    setTimeLeft(EXERCISE_SECONDS);
    if (audioEnabled) {
      playExerciseStart();
      haptics.light();
    }
  }, [audioEnabled]);

  const startTransition = useCallback((nextIdx: number) => {
    setPhase("transition");
    setTimeLeft(TRANSITION_SECONDS);
    if (audioEnabled && warmUpExercises[nextIdx]) {
      announceWarmupTransition(warmUpExercises[nextIdx].name);
      haptics.restStart();
    }
  }, [audioEnabled]);

  const startPostRest = useCallback(() => {
    setPhase("post_rest");
    setTimeLeft(POST_REST_SECONDS);
    if (audioEnabled) {
      announceWarmupComplete();
      haptics.complete();
    }
  }, [audioEnabled]);

  // Main 1-second interval loop
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;

        // Audio countdown for 3, 2, 1
        if (audioEnabled && nextTime <= 3 && nextTime >= 1) {
          playCountdown(nextTime);
          haptics.tick();
        }

        if (nextTime <= 0) {
          const currentP = phaseRef.current;

          if (currentP === "prep") {
            // Prep finished -> Start exercise 0
            startExercise(0);
            return EXERCISE_SECONDS;
          }

          if (currentP === "exercise") {
            // Exercise finished
            if (currentExerciseIndex >= warmUpExercises.length - 1) {
              // Last exercise finished -> Post-warmup rest
              startPostRest();
              return POST_REST_SECONDS;
            } else {
              // More exercises left -> 10s transition
              startTransition(currentExerciseIndex + 1);
              return TRANSITION_SECONDS;
            }
          }

          if (currentP === "transition") {
            // Transition finished -> Start next exercise
            const nextIdx = currentExerciseIndex + 1;
            startExercise(nextIdx);
            return EXERCISE_SECONDS;
          }

          if (currentP === "post_rest") {
            // Post-rest finished -> Go to workout
            router.push(redirectAfter);
            return 0;
          }
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isPaused,
    currentExerciseIndex,
    audioEnabled,
    startExercise,
    startTransition,
    startPostRest,
    router,
    redirectAfter,
  ]);

  // Total progression indicator
  const progress = ((currentExerciseIndex + 1) / warmUpExercises.length) * 100;
  const totalPhaseTime =
    phase === "prep"
      ? PREP_SECONDS
      : phase === "exercise"
      ? EXERCISE_SECONDS
      : phase === "transition"
      ? TRANSITION_SECONDS
      : POST_REST_SECONDS;

  return (
    <div className="h-[100dvh] animate-page-in flex flex-col overflow-hidden bg-[#080B10] text-white select-none">
      <TopAppBar
        title="CALENTAMIENTO"
        variant="workout"
        showBack
        backHref="/"
        showVolume
      />

      {/* Post-Warmup Rest Fullscreen Screen */}
      {phase === "post_rest" ? (
        <div className="flex-1 flex flex-col items-center justify-between p-6 z-20 text-center animate-fade-in-up">
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-400/20 to-primary/20 border-2 border-primary/50 flex items-center justify-center shadow-neon">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>

            <div>
              <span className="font-mono text-xs font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                ¡Activación Completada!
              </span>
              <h2 className="font-mono text-2xl font-black text-white mt-3 uppercase tracking-tight">
                Descanso previo al entreno
              </h2>
              <p className="font-mono text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                Articulaciones listas y flujo sanguíneo activo. Bebe un sorbo de agua y prepárate.
              </p>
            </div>

            {/* Circular Rest Countdown */}
            <div className="relative w-40 h-40 my-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="#161c28"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="#00F59B"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 72}`}
                  strokeDashoffset={`${2 * Math.PI * 72 * (1 - timeLeft / POST_REST_SECONDS)}`}
                  className="transition-all duration-1000 shadow-neon"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-4xl font-black tabular-nums text-white drop-shadow-[0_0_15px_rgba(0,245,155,0.4)]">
                  {timeLeft}
                </span>
                <span className="text-cyan-400 font-mono text-[10px] font-bold tracking-widest uppercase">
                  SEG DESCANSO
                </span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3 pb-[env(safe-area-inset-bottom,0px)]">
            <button
              onClick={handleSkipToWorkout}
              className="w-full h-14 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Empezar Entrenamiento Ya</span>
            </button>
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-full h-10 bg-[#121622] text-zinc-400 hover:text-white font-mono font-bold text-xs uppercase rounded-xl border border-white/10"
            >
              {isPaused ? "Reanudar cuenta" : "Pausar cuenta"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header Progress & Phase Banner */}
          <div className="flex-shrink-0 px-4 pt-2 pb-1">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                {phase === "prep" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-wider animate-pulse">
                    Preparación · {timeLeft}s
                  </span>
                )}
                {phase === "exercise" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-[10px] font-black uppercase tracking-wider shadow-neon">
                    En curso · Ejercicio {currentExerciseIndex + 1}/{warmUpExercises.length}
                  </span>
                )}
                {phase === "transition" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider animate-pulse">
                    Descanso / Cambio · {timeLeft}s
                  </span>
                )}
              </div>
              <span className="text-zinc-400 font-mono font-bold text-[10px] tracking-widest uppercase">
                {currentExerciseIndex + 1} de {warmUpExercises.length}
              </span>
            </div>

            <div className="w-full h-2 bg-[#121622] border border-white/5 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-primary shadow-neon rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Exercise Details / Next Preview Title */}
          <div className="flex-shrink-0 px-4 py-2 text-center">
            {phase === "transition" && nextExercise ? (
              <div>
                <span className="text-amber-400 font-mono text-[11px] font-black uppercase tracking-wider">
                  Prepárate para el siguiente:
                </span>
                <h2 className="font-mono text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-0.5">
                  {nextExercise.name}
                </h2>
                <p className="text-zinc-400 font-mono text-xs mt-0.5">
                  {nextExercise.description}
                </p>
              </div>
            ) : (
              <div>
                {phase === "prep" && (
                  <span className="text-cyan-400 font-mono text-[11px] font-black uppercase tracking-wider block">
                    Colócate en posición:
                  </span>
                )}
                <h2 className="font-mono text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-0.5">
                  {currentExercise?.name}
                </h2>
                <p className="text-zinc-400 font-mono text-xs mt-0.5">
                  {currentExercise?.description}
                </p>
              </div>
            )}
          </div>

          {/* Center Visual Media Card */}
          <div className="flex-shrink-0 flex-1 min-h-0 px-4">
            <div className="w-full h-full rounded-3xl overflow-hidden border border-white/10 relative bg-[#111622] shadow-xl">
              {phase === "transition" && nextExercise ? (
                <div className="relative w-full h-full">
                  <ExerciseImage
                    src={nextExercise.image}
                    alt={nextExercise.name}
                    containerClassName="w-full h-full"
                    className="object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-black/80 border border-amber-400/40 px-4 py-2 rounded-2xl flex items-center gap-2 text-amber-300 font-mono font-bold text-xs shadow-lg">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Cambio en {timeLeft}s</span>
                    </div>
                  </div>
                </div>
              ) : currentExercise?.image ? (
                <ExerciseImage
                  src={currentExercise.image}
                  alt={currentExercise.name}
                  containerClassName="w-full h-full"
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#111622]">
                  <Dumbbell className="w-16 h-16 text-primary/30" />
                </div>
              )}
            </div>
          </div>

          {/* Countdown Ring & Focus Info */}
          <div className="flex-shrink-0 flex items-center justify-between py-2.5 px-6">
            <div className="relative w-[110px] h-[110px]">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="55"
                  cy="55"
                  r="48"
                  fill="none"
                  stroke="#161c28"
                  strokeWidth="6"
                />
                <circle
                  cx="55"
                  cy="55"
                  r="48"
                  fill="none"
                  stroke={
                    phase === "transition"
                      ? "#fbbf24"
                      : timeLeft <= 10
                      ? "#ff5252"
                      : "#00F59B"
                  }
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 48 * (1 - timeLeft / totalPhaseTime)
                  }`}
                  className="transition-all duration-1000 shadow-neon"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-mono text-3xl font-black tabular-nums ${
                    phase === "transition"
                      ? "text-amber-400"
                      : timeLeft <= 10
                      ? "text-red-400 animate-pulse"
                      : "text-white drop-shadow-[0_0_12px_rgba(0,245,155,0.4)]"
                  }`}
                >
                  {timeLeft}
                </span>
                <span className="text-zinc-400 font-mono text-[9px] font-bold tracking-widest uppercase">
                  {phase === "transition" ? "CAMBIO" : phase === "prep" ? "PREP" : "SEG"}
                </span>
              </div>
            </div>

            {/* Right Information: Replaced tiny reps with clear focus */}
            <div className="text-right flex flex-col items-end gap-1">
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
                ENFOQUE ARTICULAR
              </span>
              <span className="font-mono text-xs font-black text-primary uppercase bg-primary/10 border border-primary/30 px-3 py-1 rounded-xl shadow-neon">
                Movilidad Continua
              </span>
              {phase === "exercise" && nextExercise && (
                <div className="mt-1 text-[11px] font-mono text-zinc-400 text-right">
                  <span className="text-zinc-500">Siguiente:</span>{" "}
                  <strong className="text-white truncate block max-w-[150px]">
                    {nextExercise.name}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <footer className="flex-shrink-0 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 bg-[#090c12] border-t border-white/10">
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowExitConfirm(true)}
                className="h-12 px-4 bg-[#141a24] hover:bg-[#18212e] text-zinc-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span>Saltar</span>
              </button>

              <button
                onClick={() => setIsPaused((p) => !p)}
                className="h-12 px-4 bg-[#141a24] text-zinc-300 font-mono font-bold text-xs uppercase rounded-2xl border border-white/10 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {isPaused ? <Play className="w-4 h-4 text-primary" /> : <Pause className="w-4 h-4" />}
                <span>{isPaused ? "Reanudar" : "Pausar"}</span>
              </button>

              {phase === "prep" && (
                <button
                  onClick={() => startExercise(0)}
                  className="flex-1 h-12 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon active:scale-95 transition-all cursor-pointer"
                >
                  <span>Empezar ya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {phase === "transition" && (
                <button
                  onClick={() => startExercise(currentExerciseIndex + 1)}
                  className="flex-1 h-12 bg-amber-400 text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95 transition-all cursor-pointer"
                >
                  <span>Empezar ya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {phase === "exercise" && (
                <button
                  onClick={() => {
                    if (currentExerciseIndex >= warmUpExercises.length - 1) {
                      startPostRest();
                    } else {
                      startTransition(currentExerciseIndex + 1);
                    }
                  }}
                  className="flex-1 h-12 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon active:scale-95 transition-all cursor-pointer"
                >
                  <span>
                    {currentExerciseIndex >= warmUpExercises.length - 1
                      ? "Finalizar"
                      : "Siguiente"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </footer>
        </>
      )}

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm bg-gradient-to-br from-[#121622] to-[#151b2a] border border-primary/30 rounded-3xl p-6 shadow-2xl">
            <h2 className="font-mono text-lg font-black text-white text-center mb-2 uppercase tracking-wider">
              ¿Saltar calentamiento?
            </h2>
            <p className="text-zinc-400 text-center mb-6 text-xs font-mono">
              Se recomienda completarlo para lubricar articulaciones y evitar lesiones.
            </p>
            <div className="space-y-2.5">
              <button
                className="w-full h-12 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all shadow-neon cursor-pointer"
                onClick={handleSkipToWorkout}
              >
                Ir directo al entreno
              </button>
              <button
                className="w-full h-11 bg-[#141a24] text-zinc-300 font-mono font-bold text-xs uppercase rounded-2xl border border-white/10 active:scale-95 cursor-pointer"
                onClick={() => setShowExitConfirm(false)}
              >
                Continuar calentando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WarmupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B10] flex items-center justify-center">
          <p className="text-white font-mono">Cargando calentamiento...</p>
        </div>
      }
    >
      <WarmupContent />
    </Suspense>
  );
}
