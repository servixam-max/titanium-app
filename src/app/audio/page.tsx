"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, CheckCircle2, ArrowRight, Bell, Mic } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playRestEndAlarm, playExerciseStart, playCountdown, speak, setAudioMode, setVoiceRate, preloadVoices } from "@/lib/audio";
import TopAppBar from "@/components/ui/TopAppBar";

export default function AudioTestPage() {
  const router = useRouter();
  const {
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
  } = useAppStore();
  const [testResult, setTestResult] = useState<
    "idle" | "testing" | "ok" | "partial" | "error"
  >("idle");

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate]);

  const testChimes = () => {
    setTestResult("testing");
    playExerciseStart();
    setTimeout(() => playCountdown(3), 350);
    setTimeout(() => playCountdown(2), 700);
    setTimeout(() => playCountdown(1), 1050);
    setTimeout(() => {
      playRestEndAlarm();
      setTestResult("ok");
    }, 1450);
  };

  const testSpeechWithExercise = () => {
    setTestResult("testing");
    playExerciseStart();
    setTimeout(() => {
      try {
        speak("Siguiente ejercicio: Press Militar con Mancuernas. Prepárate.");
        setTestResult("ok");
      } catch {
        setTestResult("partial");
      }
    }, 300);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-on-background">
      <TopAppBar title="AUDIO & SONIDO" showBack backHref="/" />

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-5 max-w-sm mx-auto w-full py-8">
        {/* Audio Icon */}
        <div className="relative w-20 h-20 rounded-3xl bg-emerald-500/10 border-primary/30 flex items-center justify-center shadow-sm">
          <Volume2 className="w-10 h-10 text-primary animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Motor de Audio y Voz IA
          </h1>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            Sonidos estilo Apple Watch + locución inteligente de nombres de ejercicios.
          </p>
        </div>

        {/* Audio Toggle */}
        <div className="w-full flex items-center justify-between fx-card rounded-2xl px-4 py-3.5 shadow-sm dark:shadow-lg">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {audioEnabled ? "Audio y Voz Activados" : "Audio Desactivado"}
          </span>
          <button
            onClick={toggleAudio}
            className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${audioEnabled ? "bg-primary shadow-sm" : "bg-slate-200 dark:bg-white/10"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${audioEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* Test Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={testSpeechWithExercise}
            disabled={!audioEnabled || testResult === "testing"}
            className="w-full h-12 bg-primary hover:bg-emerald-600 text-black font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm border-primary disabled:opacity-50 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>PROBAR LECTURA DE EJERCICIOS</span>
          </button>

          <button
            onClick={testChimes}
            disabled={!audioEnabled || testResult === "testing"}
            className="w-full h-12 bg-slate-100 dark:bg-[#131626] hover:bg-slate-200 dark:hover:bg-[#181d2e] text-slate-800 dark:text-zinc-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>PROBAR CAMPANADAS Y TICKS TÁCTILES</span>
          </button>
        </div>

        {/* Test Result */}
        {testResult === "ok" && (
          <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 border-primary/30 px-4 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>CAMPANADAS Y VOZ IA OPERATIVOS</span>
          </div>
        )}
        {testResult === "partial" && (
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 text-xs font-bold bg-amber-500/10 border-amber-500/30 px-4 py-2.5 rounded-xl">
            <VolumeX className="w-4 h-4" />
            <span>CAMPANADAS OK (Voz no sintetizada)</span>
          </div>
        )}

        {/* Info Box */}
        <div className="w-full bg-white dark:bg-gradient-to-br dark:from-[#141828] dark:via-[#111422] dark:to-[#0D101A] rounded-2xl p-4 text-left shadow-sm dark:shadow-lg">
          <p className="text-[12px] font-bold text-cyan-600 dark:text-cyan-400 mb-2">
            MEJORAS DE AUDIO v5.9:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
            <li>• Campana armónica y ticks de madera (sin pitidos molestos).</li>
            <li>• Locución fluida con nombre de cada ejercicio.</li>
            <li>• Desfase secuencial (voz y sonido no se pisan jamás).</li>
          </ul>
        </div>

        {/* Continue */}
        <button
          onClick={() => router.push("/")}
          className="w-full h-12 bg-slate-100 dark:bg-[#131626] hover:bg-slate-200 dark:hover:bg-[#181d2e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs rounded-2xl hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer mt-1"
        >
          <span>VOLVER A INICIO</span>
          <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        </button>
      </main>
    </div>
  );
}
