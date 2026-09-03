"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, Sparkles, CheckCircle2, ArrowRight, Bell, Mic } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playRestEndAlarm, playExerciseStart, playWorkoutComplete, playCountdown, speak, setAudioMode, setVoiceRate, preloadVoices } from "@/lib/audio";
import TopAppBar from "@/components/ui/TopAppBar";

export default function AudioTestPage() {
  const router = useRouter();
  const {
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
    setAudioMode: storeSetAudioMode,
    setVoiceRate: storeSetVoiceRate,
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
        {/* Glowing Audio Icon */}
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-400/20 to-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,245,155,0.3)]">
          <Volume2 className="w-10 h-10 text-primary animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="font-mono text-xl font-black text-white uppercase tracking-tight">
            Motor de Audio y Voz IA
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Sonidos estilo Apple Watch + locución inteligente de nombres de ejercicios.
          </p>
        </div>

        {/* Audio Toggle */}
        <div className="w-full flex items-center justify-between bg-[#121620] border border-white/10 rounded-2xl px-4 py-3.5 shadow-lg">
          <span className="font-mono text-xs font-bold text-white uppercase">
            {audioEnabled ? "Audio y Voz Activados" : "Audio Desactivado"}
          </span>
          <button
            onClick={toggleAudio}
            className={`w-12 h-7 rounded-full p-1 transition-all ${audioEnabled ? "bg-primary shadow-neon" : "bg-white/10"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${audioEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* Test Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={testSpeechWithExercise}
            disabled={!audioEnabled || testResult === "testing"}
            className="w-full h-13 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-neon disabled:opacity-50 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>PROBAR LECTURA DE EJERCICIOS</span>
          </button>

          <button
            onClick={testChimes}
            disabled={!audioEnabled || testResult === "testing"}
            className="w-full h-12 bg-[#141a24] hover:bg-[#18212e] text-zinc-200 font-mono font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>PROBAR CAMPANADAS Y TICKS TÁCTILES</span>
          </button>
        </div>

        {/* Test Result */}
        {testResult === "ok" && (
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold bg-primary/10 border border-primary/30 px-4 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>CAMPANADAS Y VOZ IA OPERATIVOS</span>
          </div>
        )}
        {testResult === "partial" && (
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 rounded-xl">
            <VolumeX className="w-4 h-4" />
            <span>CAMPANADAS OK (Voz no sintetizada)</span>
          </div>
        )}

        {/* Info Box */}
        <div className="w-full bg-[#121620] rounded-2xl p-4 border border-white/10 text-left font-mono">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
            MEJORAS DE AUDIO v5.9:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-400">
            <li>• Campana armónica y ticks de madera (sin pitidos molestos).</li>
            <li>• Locución fluida con nombre de cada ejercicio.</li>
            <li>• Desfase secuencial (voz y sonido no se pisan jamás).</li>
          </ul>
        </div>

        {/* Continue */}
        <button
          onClick={() => router.push("/")}
          className="w-full h-12 bg-[#141a24] hover:bg-[#18212e] text-zinc-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer mt-1"
        >
          <span>VOLVER A INICIO</span>
          <ArrowRight className="w-4 h-4 text-cyan-400" />
        </button>
      </main>
    </div>
  );
}
