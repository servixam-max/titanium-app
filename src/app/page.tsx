"use client";

import RoutineCard from "@/components/ui/RoutineCard";
import { routines } from "@/lib/data";
import { Flame, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import SettingsModal from "@/components/ui/SettingsModal";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import { preloadVoices } from "@/lib/speech";
import { playBeep } from "@/lib/audio";

export default function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioWarmedUp, setAudioWarmedUp] = useState(false);

  useEffect(() => {
    // Preload speech voices on mount
    preloadVoices();
  }, []);

  const handleFirstInteraction = () => {
    if (!audioWarmedUp) {
      // Wake up audio context (critical for iOS Safari)
      playBeep(300, 0.01, "sine", 0.01);
      setAudioWarmedUp(true);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background" onClick={handleFirstInteraction}>
      {/* Header */}
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider">
          FORTIXAM
        </h1>
        <button 
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:opacity-80 active:scale-95"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-3 gap-3">
        {/* Welcome Text */}
        <div className="flex-shrink-0">
          <h2 className="font-headline-md text-headline-md text-primary-container">
            ¡Vamos xam!
          </h2>
          <p className="font-body-sm text-body-sm text-secondary mt-1">
            Tu cuerpo escucha todo lo que tu mente dice.
          </p>
        </div>

        {/* Quick Warmup */}
        <Link
          href="/warmup"
          className="flex-shrink-0 h-[56px] bg-surface-container-high border border-primary-container/30 rounded-xl flex items-center gap-3 px-3 hover:bg-surface-container-high active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-primary-container" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-body-md text-body-md font-bold text-primary-container block truncate">
              Calentamiento Rápido
            </span>
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              4 ejercicios · 60 segundos
            </span>
          </div>
          <svg className="w-5 h-5 text-primary-container flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

        {/* Routines List - scrollable */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="flex-shrink-0 font-headline-sm text-headline-sm border-l-4 border-primary-container pl-3 mb-2">
            Elegir Rutina
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 pb-[140px]">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.day}
                routine={routine}
                showEquipmentToggle={routine.day === 3}
              />
            ))}
          </div>
        </div>
      </main>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom Nav */}
      <BottomNav />

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
