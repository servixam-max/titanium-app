"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playBeep } from "@/lib/audio";
import { preloadVoices, speak } from "@/lib/speech";
import TopAppBar from "@/components/ui/TopAppBar";

export default function AudioTestPage() {
  const router = useRouter();
  const {
    audioEnabled,
    audioMode,
    voiceRate,
    toggleAudio,
    setAudioMode,
    setVoiceRate,
  } = useAppStore();
  const [testResult, setTestResult] = useState<
    "idle" | "testing" | "ok" | "partial" | "error"
  >("idle");

  useEffect(() => {
    preloadVoices();
    setAudioMode(audioMode);
    setVoiceRate(voiceRate);
  }, [audioMode, voiceRate, setAudioMode, setVoiceRate]);

  const testAudio = () => {
    setTestResult("testing");

    // 1. Test beep
    setTimeout(() => playBeep(800, 0.15, "sine", 0.3), 100);

    // 2. Test speech with current voice rate
    setTimeout(() => {
      try {
        speak(
          `Probando audio. Sistema FORTIXAM operativo. Velocidad ${voiceRate.toFixed(2)}`,
        );
        setTestResult("ok");
      } catch {
        setTestResult("partial");
      }
    }, 400);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-on-background">
      <TopAppBar title="AUDIO & SONIDO" showBack backHref="/" />

      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-sm mx-auto w-full py-8">
        {/* Glowing Audio Icon */}
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-400/20 to-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,245,155,0.3)]">
          <Volume2 className="w-10 h-10 text-primary animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="font-mono text-xl font-black text-white uppercase tracking-tight">
            Motor de Audio y Voz IA
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Verifica que los pitidos de cuenta atrás y la voz de guiado funcionen perfectamente.
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

        {/* Test Button */}
        <button
          onClick={testAudio}
          disabled={!audioEnabled || testResult === "testing"}
          className="w-full h-13 bg-primary text-black font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-neon disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {testResult === "testing" ? "PROBANDO AUDIO..." : "PROBAR SONIDO Y VOZ"}
        </button>

        {/* Test Result */}
        {testResult === "ok" && (
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold bg-primary/10 border border-primary/30 px-4 py-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>PITIDOS Y VOZ IA OPERATIVOS</span>
          </div>
        )}
        {testResult === "partial" && (
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 rounded-xl">
            <VolumeX className="w-4 h-4" />
            <span>SOLO PITIDOS (Voz no sintetizada)</span>
          </div>
        )}

        {/* Info Box */}
        <div className="w-full bg-[#121620] rounded-2xl p-4 border border-white/10 text-left font-mono">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
            CONSEJOS DE AUDIO:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-400">
            <li>• En móvil, sube el volumen multimedia.</li>
            <li>• Si el móvil está en silencio o vibración, se respetará el sintetizador de voz.</li>
            <li>• Puedes cambiar la velocidad de la voz en Ajustes.</li>
          </ul>
        </div>

        {/* Continue */}
        <button
          onClick={() => router.push("/")}
          className="w-full h-12 bg-[#141a24] hover:bg-[#18212e] text-zinc-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer mt-2"
        >
          <span>VOLVER A INICIO</span>
          <ArrowRight className="w-4 h-4 text-cyan-400" />
        </button>
      </main>
    </div>
  );
}
