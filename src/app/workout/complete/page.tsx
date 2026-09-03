"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Clock,
  Dumbbell,
  Hash,
  Calendar,
  Home,
  Sparkles,
} from "lucide-react";
import TopAppBar from "@/components/ui/TopAppBar";
import { useAppStore } from "@/lib/store";
import { playWorkoutComplete } from "@/lib/audio";
import { getSessions } from "@/lib/db";
import { WorkoutSession } from "@/lib/types";

import { motion } from "framer-motion";
import { routines } from "@/lib/data";

export default function WorkoutComplete() {
  const router = useRouter();
  const { activeWorkout, clearJustFinished, sessions } = useAppStore();
  const [dbFallbackSession, setDbFallbackSession] = useState<WorkoutSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const initialSession =
    (activeWorkout.session?.completed ? activeWorkout.session : null) ||
    sessions.find((s) => s.completed);

  const completedSession = initialSession || dbFallbackSession;

  useEffect(() => {
    if (activeWorkout.justFinished) {
      playWorkoutComplete();
      clearJustFinished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadFallback() {
      if (!initialSession) {
        try {
          const all = await getSessions();
          const found = all.find((s) => s.completed);
          if (found) {
            setDbFallbackSession(found);
          }
        } catch (err) {
          console.error("Error loading session fallback:", err);
        }
      }
      setIsChecking(false);
    }
    loadFallback();
  }, [initialSession]);

  if (isChecking && !completedSession) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-zinc-400 text-xs font-mono">Guardando y cargando resumen...</p>
      </div>
    );
  }

  if (!completedSession || !completedSession.completed) {
    return (
      <div className="h-[100dvh] animate-page-in flex flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
        <p className="text-zinc-400 mb-4">
          No hay entrenamiento completado.
        </p>
        <button
          onClick={() => router.push("/")}
          className="h-[48px] px-6 bg-primary-container text-black font-bold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
        >
          <Home className="w-5 h-5" /> Volver al inicio
        </button>
      </div>
    );
  }

  const routineTitle =
    activeWorkout.routine?.title ||
    routines.find((r) => r.day === completedSession.routineId)?.title ||
    "Entrenamiento";
  const durationSeconds = completedSession.endTime
    ? Math.round(
        (new Date(completedSession.endTime).getTime() -
          new Date(completedSession.startTime).getTime()) /
          1000,
      )
    : 0;
  const totalSets = completedSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0,
  );
  const totalReps = completedSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
    0,
  );
  const totalVolume = completedSession.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  );
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const previousSessions = sessions
    .filter(
      (s) =>
        s.routineId === completedSession.routineId &&
        s.completed &&
        s.id !== completedSession.id,
    )
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  const lastSession = previousSessions[0];
  const lastDuration = lastSession?.endTime
    ? Math.round(
        (lastSession.endTime.getTime() - lastSession.startTime.getTime()) /
          1000,
      )
    : 0;
  const lastVolume = lastSession?.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  );
  const pbDuration = durationSeconds > lastDuration;
  const pbVolume = totalVolume > (lastVolume || 0);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#080808] text-white relative select-none">
      <Confetti />

      {/* Ambient background glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none" />

      <TopAppBar title="RESUMEN" variant="workout" showBack backHref="/" />

      <main className="flex-1 flex flex-col items-center justify-center px-5 text-center z-10 pt-2 pb-6 max-w-md mx-auto w-full">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
          className="w-20 h-20 rounded-2xl bg-black/60 border border-primary-container/40 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(204,255,0,0.35)]"
        >
          <Trophy className="w-10 h-10 text-primary-container fill-primary-container/20" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-mono text-2xl sm:text-3xl text-white font-black tracking-tight mb-0.5 drop-shadow-[0_0_15px_rgba(0,245,155,0.4)] uppercase"
        >
          ¡SESIÓN COMPLETADA!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs font-mono text-primary mb-4 uppercase tracking-wider"
        >
          {routineTitle}
        </motion.p>

        {(pbDuration || pbVolume) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-4 px-3.5 py-1.5 bg-primary/15 border border-primary/40 rounded-full shadow-[0_0_12px_rgba(0,245,155,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-mono font-bold text-xs uppercase">
              {pbVolume && pbDuration
                ? "¡Nuevos récords personales!"
                : pbVolume
                  ? "¡Nuevo récord de volumen!"
                  : "¡Más rápido que la última vez!"}
            </span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-2.5 w-full mb-5"
        >
          <StatBox
            icon={Clock}
            label="Duración"
            value={`${minutes}:${seconds.toString().padStart(2, "0")}`}
            color="text-cyan-400"
          />
          <StatBox icon={Hash} label="Series" value={String(totalSets)} color="text-primary" />
          <StatBox
            icon={Dumbbell}
            label="Volumen"
            value={`${Math.round(totalVolume)} kg`}
            color="text-cyan-400"
          />
          <StatBox icon={Calendar} label="Reps" value={String(totalReps)} color="text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full space-y-2.5"
        >
          <button
            onClick={() => router.push("/history")}
            className="w-full h-12 bg-primary text-black font-mono font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-neon cursor-pointer"
          >
            <Calendar className="w-4 h-4" /> Ver Historial Completo
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-11 bg-[#121622] hover:bg-[#161c28] text-zinc-300 hover:text-white font-mono font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-98 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <Home className="w-4 h-4" /> Volver al Inicio
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gradient-to-br from-[#121620] to-[#151b28] border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center shadow-lg">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className="text-zinc-400 text-[10px] font-mono uppercase font-bold tracking-wider">
        {label}
      </span>
      <span className="text-lg font-black font-mono text-white mt-0.5">
        {value}
      </span>
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
    color: ["#ccff00", "#ffffff", "#88cc00", "#aaff00"][
      Math.floor(Math.random() * 4)
    ],
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
