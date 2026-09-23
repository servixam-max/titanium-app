"use client";

import { Trophy, Clock, Dumbbell, Hash, Calendar, Home, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WorkoutSession } from "@/lib/types";
import confetti from "canvas-confetti";
import { useEffect, useMemo } from "react";
import { routines } from "@/lib/data";
import { playVictoryFanfare } from "@/lib/audio";
import NumberTicker from "@/components/ui/NumberTicker";
import BorderBeam from "@/components/ui/BorderBeam";
import { generateWorkoutDebrief } from "@/lib/ai-debrief";

interface WorkoutCompleteCardProps {
  session?: WorkoutSession | null;
  activeRoutineTitle?: string;
  sessions?: WorkoutSession[];
}

function StatBox({
  icon: Icon,
  label,
  value,
  numericValue,
  suffix = "",
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  numericValue?: number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="fx-card rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <span className="text-slate-500 dark:text-zinc-400 text-[12px] font-bold">
        {label}
      </span>
      {numericValue !== undefined ? (
        <NumberTicker
          value={numericValue}
          suffix={suffix}
          className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5"
        />
      ) : (
        <span className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">{value}</span>
      )}
    </div>
  );
}

export default function WorkoutCompleteCard({
  session,
  activeRoutineTitle,
  sessions,
}: WorkoutCompleteCardProps) {
  const router = useRouter();

  // Robust fallback: if the session is missing or malformed, still show a celebration screen
  const safeSession = session && session.exercises ? session : null;
  const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);

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

    playVictoryFanfare();

    return () => clearTimeout(timer);
  }, []);

  const aiDebrief = useMemo(
    () => (safeSession ? generateWorkoutDebrief(safeSession, safeSessions) : null),
    [safeSession, safeSessions]
  );

  const routineTitle =
    activeRoutineTitle ||
    (safeSession && routines.find((r) => r.day === safeSession.routineId)?.title) ||
    "Entrenamiento";

  const durationSeconds =
    safeSession && safeSession.endTime
      ? Math.round(
          (new Date(safeSession.endTime).getTime() - new Date(safeSession.startTime).getTime()) /
            1000,
        )
      : 0;
  const totalSets = safeSession
    ? safeSession.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)
    : 0;
  const totalReps = safeSession
    ? safeSession.exercises.reduce(
        (sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.reps || 0), 0),
        0,
      )
    : 0;
  const totalVolume = safeSession
    ? safeSession.exercises.reduce(
        (sum, ex) =>
          sum +
          (ex.sets || []).reduce(
            (s, set) => s + (set.weight || 0) * (set.reps || 0),
            0,
          ),
        0,
      )
    : 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const previousSessions = safeSession
    ? safeSessions
        .filter(
          (s) =>
            s.routineId === safeSession.routineId && s.completed && s.id !== safeSession.id,
        )
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    : [];
  const lastSession = previousSessions[0];
  const lastDuration = lastSession?.endTime
    ? Math.round(
        (new Date(lastSession.endTime).getTime() - new Date(lastSession.startTime).getTime()) / 1000,
      )
    : 0;
  const lastVolume = lastSession?.exercises.reduce(
    (sum, ex) =>
      sum +
      (ex.sets || []).reduce(
        (s, set) => s + (set.weight || 0) * (set.reps || 0),
        0,
      ),
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
        className="w-20 h-20 rounded-2xl bg-black/60 border-primary-container/40 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(204,255,0,0.35)]"
      >
        <Trophy className="w-10 h-10 text-primary-container fill-primary-container/20" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fx-num text-2xl sm:text-3xl text-white font-semibold tracking-tight mb-0.5 drop-shadow-[0_0_15px_rgba(0,245,155,0.4)]"
      >
        ¡SESIÓN COMPLETADA!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-xs text-primary mb-4"
      >
        {routineTitle}
      </motion.p>

      {(pbDuration || pbVolume) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4 px-3.5 py-1.5 bg-primary/15 border-primary/40 rounded-full shadow-[0_0_12px_rgba(0,245,155,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary font-bold text-xs">
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
        <StatBox
          icon={Hash}
          label="Series"
          numericValue={totalSets}
          color="text-primary"
        />
        <StatBox
          icon={Dumbbell}
          label="Volumen"
          numericValue={Math.round(totalVolume)}
          suffix=" kg"
          color="text-cyan-400"
        />
        <StatBox
          icon={Calendar}
          label="Reps"
          numericValue={totalReps}
          color="text-primary"
        />
      </motion.div>

      {/* Análisis del entrenamiento (reglas deterministas, sin modelo) */}
      {aiDebrief && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden w-full fx-card rounded-3xl p-4 text-left shadow-sm mb-5"
        >
          <BorderBeam
            size={180}
            duration={6}
            colorFrom="#10B981"
            colorTo="#059669"
            borderWidth={1.5}
            borderRadius={24}
          />

          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
              Análisis del entrenamiento
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {aiDebrief.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-cyan-400/10 text-cyan-700 dark:text-cyan-300 border-cyan-400/30"
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
            {aiDebrief.headline}
          </h4>
          <p className="text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed mb-2.5">
            {aiDebrief.summary}
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-start gap-2">
            <span className="text-sm flex-shrink-0">💡</span>
            <p className="text-[12px] text-slate-600 dark:text-zinc-400 leading-tight">
              <strong className="text-primary font-bold">Consejo para mañana: </strong>
              {aiDebrief.recommendationTomorrow}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full space-y-2.5"
      >
        <button
          onClick={() => router.push("/history")}
          className="w-full h-12 bg-primary hover:brightness-105 text-black font-bold text-sm rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md border-primary/40 cursor-pointer"
        >
          <Calendar className="w-4 h-4" /> Ver Historial Completo
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full h-11 bg-white dark:bg-[#131626] hover:bg-slate-50 dark:hover:bg-[#181d2e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all text-xs cursor-pointer shadow-sm"
        >
          <Home className="w-4 h-4" /> Volver al Inicio
        </button>
      </motion.div>
    </div>
  );
}
