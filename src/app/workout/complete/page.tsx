"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, Dumbbell, Hash, Calendar, ArrowLeft, Home, Share2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playWorkoutComplete } from "@/lib/audio";

export default function WorkoutComplete() {
  const router = useRouter();
  const { activeWorkout, clearJustFinished } = useAppStore();
  const completedSession = activeWorkout.session;

  useEffect(() => {
    if (activeWorkout.justFinished) {
      playWorkoutComplete();
      clearJustFinished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!completedSession || !completedSession.completed) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-on-surface-variant mb-4">No hay entrenamiento completado.</p>
        <button
          onClick={() => router.push("/")}
          className="h-[48px] px-6 bg-primary-container text-on-primary font-bold rounded-xl flex items-center gap-2"
        >
          <Home className="w-5 h-5" /> Volver al inicio
        </button>
      </div>
    );
  }

  const routineTitle = activeWorkout.routine?.title || "Entrenamiento";
  const durationSeconds = completedSession.endTime
    ? Math.round((completedSession.endTime.getTime() - completedSession.startTime.getTime()) / 1000)
    : 0;
  const totalSets = completedSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalReps = completedSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
    0
  );
  const totalVolume = completedSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0),
    0
  );
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background relative">
      {/* Confetti */}
      <Confetti />

      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-20">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider absolute left-1/2 -translate-x-1/2">
          RESUMEN
        </h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10">
        <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(204,255,0,0.4)]">
          <Trophy className="w-10 h-10 text-primary-container" />
        </div>

        <h2 className="font-headline-lg text-headline-lg text-primary-container mb-1">
          ¡Entrenamiento completado!
        </h2>
        <p className="text-on-surface-variant mb-6">{routineTitle}</p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
          <StatBox icon={Clock} label="Duración" value={`${minutes}:${seconds.toString().padStart(2, "0")}`} />
          <StatBox icon={Hash} label="Series" value={String(totalSets)} />
          <StatBox icon={Dumbbell} label="Volumen" value={`${Math.round(totalVolume)}kg`} />
          <StatBox icon={Calendar} label="Reps" value={String(totalReps)} />
        </div>

        <div className="w-full max-w-sm space-y-2">
          <button
            onClick={() => router.push("/history")}
            className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Calendar className="w-5 h-5" /> Ver historial
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-[48px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest flex items-center justify-center gap-2 active:scale-95"
          >
            <Home className="w-5 h-5" /> Volver al inicio
          </button>
        </div>
      </main>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-surface-container-high border border-surface-container-highest rounded-xl p-4 flex flex-col items-center">
      <Icon className="w-5 h-5 text-primary-container mb-1" />
      <span className="text-on-surface-variant text-xs font-label-caps uppercase">{label}</span>
      <span className="text-primary-container font-bold text-xl">{value}</span>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.5 + Math.random() * 2}s`,
    size: 6 + Math.random() * 8,
    color: ["#ccff00", "#ffffff", "#88cc00", "#aaff00"][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px] animate-confetti"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: "2px",
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
