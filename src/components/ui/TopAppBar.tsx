"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Settings, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });

export type TopAppBarVariant = "default" | "transparent" | "solid" | "workout";

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  showSettings?: boolean;
  showVolume?: boolean;
  onClose?: () => void;
  variant?: TopAppBarVariant;
  /** Renders a full-bleed placeholder matching the header height + safe area. */
  withSpacer?: boolean;
  /** Additional className applied to the header element. */
  className?: string;
}

const variantClasses: Record<TopAppBarVariant, string> = {
  default: "bg-[#090c12]/90 backdrop-blur-xl border-white/10",
  solid: "bg-[#090c12] border-white/10",
  transparent: "bg-transparent border-transparent",
  workout: "bg-[#090c12]/80 backdrop-blur-xl border-white/10",
};

export const topAppBarHeightClass = "h-touch-target-min";

export default function TopAppBar({
  title,
  showBack = false,
  backHref = "/",
  showSettings = false,
  showVolume = false,
  onClose,
  variant = "default",
  withSpacer = true,
  className = "",
}: TopAppBarProps) {
  const { audioEnabled, toggleAudio, currentUser } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 border-b flex items-center justify-between px-container-padding ${topAppBarHeightClass} max-w-app left-1/2 -translate-x-1/2 safe-top ${variantClasses[variant]} ${className}`}
      >
        <div className="w-12">
          {showBack && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-12 h-12 text-zinc-300 hover:text-white transition-colors active:scale-95"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-12 h-12 text-zinc-300 hover:text-white transition-colors active:scale-95"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <h1 className="font-mono text-base sm:text-lg font-black tracking-widest text-white uppercase text-center flex-1">
          {title}
        </h1>

        <div className="w-20 flex items-center justify-end gap-1">
          {currentUser && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs font-mono shadow-sm active:scale-90 transition-all"
              style={{ backgroundColor: currentUser.avatarColor || "#10B981" }}
              title={`Perfil de ${currentUser.username}`}
            >
              {currentUser.username.slice(0, 1).toUpperCase()}
            </button>
          )}
          {showVolume && (
            <button
              onClick={toggleAudio}
              className="flex items-center justify-center w-8 h-12 text-on-surface hover:opacity-80 transition-opacity active:scale-95"
              aria-label={audioEnabled ? "Desactivar audio" : "Activar audio"}
            >
              {audioEnabled ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </button>
          )}
          {showSettings && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center w-8 h-12 text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95"
              aria-label="Ajustes"
            >
              <Settings className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      {withSpacer && (
        <div
          className={`w-full ${topAppBarHeightClass} safe-top`}
          aria-hidden="true"
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
