"use client";

import { ReactNode, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionTitle from "@/components/ui/SectionTitle";
import { useWakeLock } from "@/hooks/useWakeLock";
import { haptics } from "@/lib/haptics";

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
  const [focusMode, setFocusMode] = useState(false);

  // Keep screen awake during workouts
  useWakeLock(true);

  const toggleFocus = () => {
    haptics.light();
    setFocusMode((prev) => !prev);
  };

  return (
    <div
      className={cn(
        "h-[100dvh] flex flex-col overflow-hidden bg-background select-none",
        className,
      )}
    >
      {/* Header — can be collapsed in focus mode */}
      <header
        className={cn(
          "flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 bg-background/90 backdrop-blur-md z-50 transition-all duration-300",
          focusMode ? "h-[42px] py-1 bg-black/60" : "h-[56px]"
        )}
      >
        {showBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 h-9 px-1.5 text-white hover:opacity-80 active:scale-95 cursor-pointer"
            aria-label="Volver atrás"
          >
            <ArrowLeft className={focusMode ? "w-4 h-4 text-zinc-400" : "w-6 h-6"} />
            {focusMode && (
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Salir</span>
            )}
          </button>
        ) : (
          <div className="w-8" />
        )}

        {focusMode ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-primary tracking-wider uppercase">
              MODO ENFOQUE
            </span>
          </div>
        ) : (
          <SectionTitle
            align="center"
            className="absolute left-1/2 -translate-x-1/2 m-0"
          >
            {title}
          </SectionTitle>
        )}

        <div className="flex items-center gap-1">
          {/* Focus Mode Toggle */}
          <button
            onClick={toggleFocus}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 cursor-pointer",
              focusMode
                ? "bg-primary/20 text-primary border border-primary/40 shadow-neon"
                : "text-zinc-400 hover:text-white"
            )}
            title={focusMode ? "Salir de modo enfoque" : "Activar modo enfoque sin distracciones"}
            aria-label={focusMode ? "Desactivar modo enfoque" : "Activar modo enfoque"}
          >
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {onToggleAudio && !focusMode && (
            <button
              onClick={onToggleAudio}
              className="flex items-center justify-center w-9 h-9 text-zinc-400 hover:text-white active:scale-95 cursor-pointer"
              title={audioEnabled ? "Desactivar audio" : "Activar audio"}
            >
              {audioEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
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
        <footer className="flex-shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 bg-background border-t border-white/10 z-50">
          {footer}
        </footer>
      )}
    </div>
  );
}
