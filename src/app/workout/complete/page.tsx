"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopAppBar from "@/components/ui/TopAppBar";
import { useAppStore } from "@/lib/store";
import { playWorkoutComplete } from "@/lib/audio";
import { getSessions } from "@/lib/db";
import { WorkoutSession } from "@/lib/types";
import { WorkoutCompleteCard } from "@/components/workout";

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
        <p className="text-zinc-400 mb-4">No hay entrenamiento completado.</p>
        <button
          onClick={() => router.push("/")}
          className="h-[48px] px-6 bg-gradient-to-r from-primary to-emerald-400 text-black font-bold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#080808] text-white relative select-none">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <TopAppBar title="RESUMEN" variant="workout" showBack backHref="/" />

      <main className="flex-1 flex flex-col overflow-y-auto z-10">
        <WorkoutCompleteCard
          session={completedSession}
          activeRoutineTitle={activeWorkout.routine?.title}
          sessions={sessions}
        />
      </main>
    </div>
  );
}
