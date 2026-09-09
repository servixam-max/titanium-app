"use client";

import { ReactNode } from "react";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionTitle from "@/components/ui/SectionTitle";

interface WorkoutShellProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  progress?: number; // 0-100
  className?: string;
}

export default function WorkoutShell({
  title = "ENTRENAMIENTO",
  children,
  footer,
  showBack = true,
  onBack,
  audioEnabled,
  onToggleAudio,
  progress,
  className,
}: WorkoutShellProps) {
  return (
    <div
      className={cn(
        "h-[100dvh] flex flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-50">
        {showBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 h-10 px-2 text-on-surface hover:opacity-80 active:scale-95"
            aria-label="Volver atrás"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <SectionTitle
          align="center"
          className="absolute left-1/2 -translate-x-1/2 m-0"
        >
          {title}
        </SectionTitle>
        {onToggleAudio ? (
          <button
            onClick={onToggleAudio}
            className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
            title={audioEnabled ? "Desactivar audio" : "Activar audio"}
          >
            {audioEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {typeof progress === "number" && (
        <div className="w-full bg-[#10141a] h-1.5 relative overflow-hidden flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 transition-all duration-500 shadow-[0_0_12px_rgba(0,245,155,0.7)]"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden px-4 py-2 gap-2">
        {children}
      </main>

      {footer && (
        <footer className="flex-shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 bg-background border-t border-surface-container-highest z-50">
          {footer}
        </footer>
      )}
    </div>
  );
}
