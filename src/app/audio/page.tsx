"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playBeep } from "@/lib/audio";
import { preloadVoices, speak } from "@/lib/speech";

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

    // 1. Test beep (always works)
    setTimeout(() => playBeep(800, 0.15, "sine", 0.3), 100);

    {
      /* Test speech with current voice rate */
    }
    setTimeout(() => {
      try {
        speak(
          `Probando audio. Voz activada. Velocidad ${voiceRate.toFixed(2)}`,
        );
        setTestResult("ok");
      } catch {
        setTestResult("partial");
      }
    }, 400);
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="w-20 h-20 rounded-2xl bg-primary-container/20 flex items-center justify-center">
          <Volume2 className="w-10 h-10 text-primary-container" />
        </div>

        <div className="text-center">
          <h1 className="font-headline-lg text-headline-lg mb-2">
            Audio y Voz
          </h1>
          <p className="font-body-md text-secondary">
            Comprueba que los sonidos y la voz guía funcionan en tu dispositivo.
          </p>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center gap-3 bg-surface-container-high rounded-xl px-4 py-3 border border-surface-container-highest">
          <button
            onClick={toggleAudio}
            className={`w-12 h-7 rounded-full transition-all ${audioEnabled ? "bg-primary-container" : "bg-surface-container-highest"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${audioEnabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span className="font-body-md text-on-surface">
            {audioEnabled ? "Audio Activado" : "Audio Desactivado"}
          </span>
        </div>

        {/* Test Button */}
        <button
          onClick={testAudio}
          disabled={!audioEnabled || testResult === "testing"}
          className="w-full h-[56px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          {testResult === "testing" ? "Probando..." : "Probar Sonido"}
        </button>

        {/* Test Result */}
        {testResult === "ok" && (
          <div className="flex items-center gap-2 text-primary-container">
            <Volume2 className="w-5 h-5" />
            <span className="font-body-md">Pitidos y voz OK</span>
          </div>
        )}
        {testResult === "partial" && (
          <div className="flex items-center gap-2 text-on-surface-variant">
            <VolumeX className="w-5 h-5" />
            <span className="font-body-md text-sm">
              Solo pitidos (voz no disponible en este dispositivo)
            </span>
          </div>
        )}

        {/* Info */}
        <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container-highest">
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">
            NOTAS:
          </p>
          <ul className="space-y-1 text-sm text-secondary">
            <li>• iPhone: activa volumen y desactiva silencio 🔇</li>
            <li>• Android Chrome: voz funciona siempre</li>
            <li>• Si no oyes voz, seguirás con pitidos</li>
          </ul>
        </div>

        {/* Continue */}
        <button
          onClick={() => router.push("/")}
          className="w-full h-[52px] bg-surface-container-high text-on-surface font-bold rounded-xl border border-surface-container-highest active:scale-95 transition-transform"
        >
          Continuar a FORTIXAM
        </button>
      </main>
    </div>
  );
}
