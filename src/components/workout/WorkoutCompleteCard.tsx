"use client";

import { Trophy, Clock, Dumbbell, Hash, Calendar, Home, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WorkoutSession } from "@/lib/types";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { routines } from "@/lib/data";

interface WorkoutCompleteCardProps {
  session: WorkoutSession;
  activeRoutineTitle?: string;
  sessions: WorkoutSession[];
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
      <span className="text-lg font-black font-mono text-white mt-0.5">{value}</span>
    </div>
  );
}

export default function WorkoutCompleteCard({
  session,
  activeRoutineTitle,
  sessions,
}: WorkoutCompleteCardProps) {
  const router = useRouter();

  useEffect(() => {
    const colors = ["#10B981", "#059669", "#34D399", "#F59E0B", "#FFFFFF", "#00F59B"];
    confetti({
      particleCount: 85,
      spread: 75,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });

    const timer = setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
        zIndex: 9999,
      });
    }, 280);

    return () => clearTimeout(timer);
  }, []);

  const routineTitle =
    activeRoutineTitle ||
    routines.find((r) => r.day === session.routineId)?.title ||
    "Entrenamiento";

  const durationSeconds = session.endTime
    ? Math.round(
        (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000,
      )
    : 0;
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalReps = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0),
    0,
  );
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  );
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const previousSessions = sessions
    .filter(
      (s) =>
        s.routineId === session.routineId && s.completed && s.id !== session.id,
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const lastSession = previousSessions[0];
  const lastDuration = lastSession?.endTime
    ? Math.round(
        (lastSession.endTime.getTime() - lastSession.startTime.getTime()) / 1000,
      )
    : 0;
  const lastVolume = lastSession?.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  );
  const pbDuration = durationSeconds > lastDuration;
  const pbVolume = totalVolume > (lastVolume || 0);

  return (
    <div className="h-full flex flex-col items-center justify-center px-5 text-center z-10 py-6 max-w-md mx-auto w-full">
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
    </div>
  );
}
